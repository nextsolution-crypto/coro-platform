'use strict';

const crypto = require('node:crypto');
const https = require('node:https');

const APPROVAL = 'REMEDIATE_HISTORICAL_OFFICIAL_PDFS';

function safeLegacyKey(reference, configuredCdnUrl) {
  const referenceUrl = new URL(reference);
  const cdnUrl = new URL(configuredCdnUrl);
  if (referenceUrl.protocol !== 'https:' || referenceUrl.origin !== cdnUrl.origin || referenceUrl.username || referenceUrl.password || referenceUrl.search || referenceUrl.hash || !referenceUrl.pathname.startsWith('/documents/')) throw new Error('UNSUPPORTED_HISTORICAL_REFERENCE');
  const key = referenceUrl.pathname.slice(1).split('/').map((part) => decodeURIComponent(part)).join('/');
  if (!key || key.includes('..') || key.includes('\\')) throw new Error('UNSAFE_HISTORICAL_REFERENCE');
  return { key, url: referenceUrl.toString() };
}

async function anonymousProbe(url, fetchImpl = fetch) {
  let response;
  try { response = await fetchImpl(url, { method: 'GET', redirect: 'manual', headers: { Range: 'bytes=0-15' }, signal: AbortSignal.timeout(10_000) }); } catch { return 'UNVERIFIABLE'; }
  if ([401, 403].includes(response.status)) return 'PRIVATE';
  if ([404, 410].includes(response.status)) return 'MISSING';
  if (![200, 206].includes(response.status)) return 'UNVERIFIABLE';
  try {
    const reader = response.body?.getReader();
    if (!reader) return 'UNVERIFIABLE';
    const first = await reader.read();
    await reader.cancel();
    return !first.done && Buffer.from(first.value).subarray(0, 5).toString('ascii') === '%PDF-' ? 'PUBLIC' : 'UNVERIFIABLE';
  } catch { return 'UNVERIFIABLE'; }
}

function signingKey(secret, date, region, service) {
  const h = (key, value) => crypto.createHmac('sha256', key).update(value).digest();
  return h(h(h(h(`AWS4${secret}`, date), region), service), 'aws4_request');
}

function makePrivateAcl({ bucket, accessKey, secretKey, key }) {
  const host = `${bucket}.tor1.digitaloceanspaces.com`;
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').substring(0, 15) + 'Z';
  const date = amzDate.slice(0, 8);
  const payloadHash = crypto.createHash('sha256').update('').digest('hex');
  const headers = { host, 'x-amz-acl': 'private', 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  const names = Object.keys(headers).sort();
  const canonical = ['PUT', `/${encodedKey}`, 'acl=', names.map((name) => `${name}:${headers[name]}\n`).join(''), names.join(';'), payloadHash].join('\n');
  const scope = `${date}/tor1/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, crypto.createHash('sha256').update(canonical).digest('hex')].join('\n');
  const signature = crypto.createHmac('sha256', signingKey(secretKey, date, 'tor1', 's3')).update(toSign).digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`;
  return new Promise((resolve, reject) => {
    const request = https.request({ hostname: host, path: `/${encodedKey}?acl`, method: 'PUT', headers: { ...headers, Authorization: authorization, 'Content-Length': 0 } }, (response) => {
      response.resume();
      response.on('end', () => response.statusCode && response.statusCode >= 200 && response.statusCode < 300 ? resolve() : reject(new Error(`ACL_UPDATE_FAILED_${response.statusCode}`)));
    });
    request.on('error', reject);
    request.end();
  });
}

async function runRemediation({ prisma, storage, cdnUrl, approval, setPrivateAcl = makePrivateAcl, fetchImpl = fetch, storageCredentials }) {
  if (approval !== APPROVAL) throw new Error('APPROVAL_REQUIRED');
  const cdn = new URL(cdnUrl);
  const expectedOrigin = `https://${storageCredentials.bucket}.tor1.digitaloceanspaces.com`;
  if (cdn.origin !== expectedOrigin) throw new Error('CDN_PURGE_AUTHORITY_REQUIRED');
  const projects = await prisma.project.findMany({
    where: { OR: [{ officialPdfFr: { not: null } }, { officialPdfEn: { not: null } }] },
    select: { id: true, organizationId: true, officialPdfFr: true, officialPdfEn: true, projectVersions: { orderBy: { versionNumber: 'desc' }, take: 1, select: { id: true } } },
  });
  const plans = [];
  for (const project of projects) {
    const version = project.projectVersions[0];
    if (!version) throw new Error('PROJECT_VERSION_REQUIRED');
    const next = {};
    const projectPlans = [];
    for (const [field, language] of [['officialPdfFr', 'fr'], ['officialPdfEn', 'en']]) {
      const reference = project[field];
      if (!reference) continue;
      if (reference.startsWith('coro-private:v1:')) { next[field] = reference; continue; }
      const legacy = safeLegacyKey(reference, cdnUrl);
      const before = await anonymousProbe(legacy.url, fetchImpl);
      if (before !== 'PUBLIC') throw new Error('LEGACY_OBJECT_NOT_PUBLIC_AT_PREFLIGHT');
      const bytes = await storage.downloadPrivate(legacy.key);
      if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('INVALID_LEGACY_PDF');
      const privateReference = await storage.storeOfficialPdfImmutable({ organizationId: project.organizationId, projectId: project.id, projectVersionId: version.id, language, bytes });
      const verified = await storage.downloadOfficialPdfReference(privateReference);
      if (!crypto.timingSafeEqual(crypto.createHash('sha256').update(bytes).digest(), crypto.createHash('sha256').update(verified).digest())) throw new Error('PRIVATE_COPY_INTEGRITY_FAILED');
      next[field] = privateReference;
      projectPlans.push({ projectId: project.id, field, legacy, privateReference });
    }
    for (const plan of projectPlans) {
      await setPrivateAcl({ ...storageCredentials, key: plan.legacy.key });
      if ((await anonymousProbe(plan.legacy.url, fetchImpl)) !== 'PRIVATE') throw new Error('ANONYMOUS_ACCESS_STILL_AVAILABLE');
    }
    if (Object.keys(next).length) {
      const result = await prisma.project.updateMany({ where: { id: project.id, officialPdfFr: project.officialPdfFr, officialPdfEn: project.officialPdfEn }, data: next });
      if (result.count !== 1) throw new Error('REFERENCE_CONCURRENCY_CONFLICT');
    }
    plans.push(...projectPlans);
  }
  return { schemaVersion: 1, execution: 'PASS', mutation: true, migratedReferences: plans.length, copiedAndHashVerified: plans.length, referencesUpdated: plans.length, originAccessRevoked: plans.length, anonymousFinalDenial: plans.length, cacheTreatment: 'NOT_APPLICABLE_ORIGIN_ENDPOINT', rollback: 'PRIVATE_REFERENCES_RETAINED' };
}

async function main() {
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const { StorageService } = require('/app/dist/src/storage/storage.service.js');
  const prisma = new PrismaClient();
  const storage = new StorageService();
  storage.logger = { log() {}, warn() {}, error() {} };
  try {
    const report = await runRemediation({
      prisma, storage,
      cdnUrl: process.env.DO_SPACES_CDN_URL || 'https://coro-storage.tor1.digitaloceanspaces.com',
      approval: process.env.HISTORICAL_PDF_REMEDIATION_APPROVAL,
      storageCredentials: { bucket: process.env.DO_SPACES_BUCKET || 'coro-storage', accessKey: process.env.DO_SPACES_KEY, secretKey: process.env.DO_SPACES_SECRET },
    });
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally { await prisma.$disconnect(); }
}

module.exports = { APPROVAL, makePrivateAcl, runRemediation };
if (process.env.CORO_HISTORICAL_PDF_REMEDIATION_RUN === 'true') main().catch(() => { process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: 'FAILED', mutation: 'UNKNOWN' })}\n`); process.exitCode = 1; });
