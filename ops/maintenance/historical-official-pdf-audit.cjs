'use strict';

const crypto = require('node:crypto');

const PRIVATE_PREFIX = 'coro-private:v1:';
const MAX_PROBE_BYTES = 16;

function safeLegacyKey(reference, configuredCdnUrl) {
  const referenceUrl = new URL(reference);
  const cdnUrl = new URL(configuredCdnUrl);
  if (
    referenceUrl.protocol !== 'https:' ||
    referenceUrl.origin !== cdnUrl.origin ||
    referenceUrl.username ||
    referenceUrl.password ||
    referenceUrl.search ||
    referenceUrl.hash ||
    !referenceUrl.pathname.startsWith('/documents/')
  ) {
    throw new Error('UNSUPPORTED_HISTORICAL_REFERENCE');
  }
  const key = referenceUrl.pathname
    .slice(1)
    .split('/')
    .map((part) => decodeURIComponent(part))
    .join('/');
  if (!key || key.includes('..') || key.includes('\\')) {
    throw new Error('UNSAFE_HISTORICAL_REFERENCE');
  }
  return { key, url: referenceUrl.toString() };
}

async function anonymousProbe(url, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { Range: 'bytes=0-15' },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return 'UNVERIFIABLE';
  }
  if ([401, 403].includes(response.status)) return 'PRIVATE';
  if ([404, 410].includes(response.status)) return 'MISSING';
  if (![200, 206].includes(response.status)) return 'UNVERIFIABLE';
  try {
    const reader = response.body?.getReader();
    if (!reader) return 'UNVERIFIABLE';
    let bytes = Buffer.alloc(0);
    while (bytes.length < MAX_PROBE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes = Buffer.concat([bytes, Buffer.from(value)]);
      if (bytes.length >= MAX_PROBE_BYTES) await reader.cancel();
    }
    return bytes.subarray(0, 5).toString('ascii') === '%PDF-' ? 'PUBLIC' : 'UNVERIFIABLE';
  } catch {
    return 'UNVERIFIABLE';
  }
}

function emptyReport() {
  return {
    schemaVersion: 1,
    execution: 'PASS',
    readOnly: true,
    coverage: { projectsWithReferences: 0, references: 0, french: 0, english: 0 },
    formats: { canonicalPrivate: 0, historicalHttps: 0, unsupported: 0 },
    objects: { private: 0, public: 0, missingOrBroken: 0, unverifiable: 0 },
    duplicateReferences: 0,
  };
}

async function runAudit({ prisma, storage, cdnUrl, fetchImpl = fetch }) {
  const report = emptyReport();
  const projects = await prisma.project.findMany({
    where: { OR: [{ officialPdfFr: { not: null } }, { officialPdfEn: { not: null } }] },
    select: { officialPdfFr: true, officialPdfEn: true },
  });
  report.coverage.projectsWithReferences = projects.length;
  const seen = new Set();
  for (const project of projects) {
    for (const [language, reference] of [['french', project.officialPdfFr], ['english', project.officialPdfEn]]) {
      if (!reference) continue;
      report.coverage.references += 1;
      report.coverage[language] += 1;
      const fingerprint = crypto.createHash('sha256').update(reference).digest('hex');
      if (seen.has(fingerprint)) report.duplicateReferences += 1;
      seen.add(fingerprint);
      if (reference.startsWith(PRIVATE_PREFIX)) {
        report.formats.canonicalPrivate += 1;
        try {
          await storage.downloadOfficialPdfReference(reference);
          report.objects.private += 1;
        } catch (error) {
          if (error instanceof Error && /NOT_FOUND/.test(error.message)) report.objects.missingOrBroken += 1;
          else report.objects.unverifiable += 1;
        }
        continue;
      }
      if (!reference.startsWith('https://')) {
        report.formats.unsupported += 1;
        report.objects.unverifiable += 1;
        continue;
      }
      report.formats.historicalHttps += 1;
      let legacy;
      try {
        legacy = safeLegacyKey(reference, cdnUrl);
        await storage.downloadPrivate(legacy.key);
      } catch (error) {
        if (error instanceof Error && /NOT_FOUND/.test(error.message)) report.objects.missingOrBroken += 1;
        else report.objects.unverifiable += 1;
        continue;
      }
      const visibility = await anonymousProbe(legacy.url, fetchImpl);
      if (visibility === 'PUBLIC') report.objects.public += 1;
      else if (visibility === 'PRIVATE') report.objects.private += 1;
      else if (visibility === 'MISSING') report.objects.missingOrBroken += 1;
      else report.objects.unverifiable += 1;
    }
  }
  return report;
}

async function main() {
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const { StorageService } = require('/app/dist/src/storage/storage.service.js');
  const prisma = new PrismaClient();
  try {
    const report = await runAudit({
      prisma,
      storage: new StorageService(),
      cdnUrl: process.env.DO_SPACES_CDN_URL || 'https://coro-storage.tor1.digitaloceanspaces.com',
    });
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { anonymousProbe, emptyReport, runAudit, safeLegacyKey };

if (require.main === module) {
  main().catch(() => {
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: 'FAILED', readOnly: true })}\n`);
    process.exitCode = 1;
  });
}
