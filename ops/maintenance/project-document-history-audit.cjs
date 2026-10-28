'use strict';

const crypto = require('node:crypto');
const https = require('node:https');

const MAX_RANGE_BYTES = 16;
const PAGE_SIZE = 100;
const PRIVATE_PREFIX = 'coro-private:v1:';

function fingerprint(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeStorageKey(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 1024 ||
    value.startsWith('/') || value.includes('..') || value.includes('\\') ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  try {
    return value.split('/').every((part) => part && decodeURIComponent(part) === part);
  } catch {
    return false;
  }
}

function configuredOrigins(env = process.env) {
  const bucket = env.DO_SPACES_BUCKET || 'coro-storage';
  const origins = new Set([`https://${bucket}.tor1.digitaloceanspaces.com`]);
  if (env.DO_SPACES_CDN_URL) {
    const url = new URL(env.DO_SPACES_CDN_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
      throw new Error('INVALID_CONFIGURED_CDN_URL');
    origins.add(url.origin);
  }
  return origins;
}

function classifyReference(reference, storageKey, allowedOrigins) {
  if (reference?.startsWith(PRIVATE_PREFIX)) {
    return { format: 'canonicalPrivate', probeUrl: null };
  }
  if (reference && /^https:/i.test(reference)) {
    let url;
    try { url = new URL(reference); } catch { return { format: 'invalid', reason: 'MALFORMED_URL' }; }
    if (url.username || url.password || url.hash) return { format: 'invalid', reason: 'UNSAFE_URL' };
    if (!allowedOrigins.has(url.origin)) return { format: 'external', reason: 'UNAPPROVED_ORIGIN' };
    if (url.search) return { format: 'signedUrl', reason: 'QUERY_NOT_PROBED' };
    let key;
    try { key = url.pathname.slice(1).split('/').map((part) => decodeURIComponent(part)).join('/'); }
    catch { return { format: 'invalid', reason: 'MALFORMED_ENCODING' }; }
    if (!safeStorageKey(key)) return { format: 'invalid', reason: 'UNSAFE_KEY' };
    return { format: 'historicalHttps', key, probeUrl: url.toString() };
  }
  if (reference && !storageKey) return { format: 'invalid', reason: 'UNSUPPORTED_REFERENCE' };
  if (!safeStorageKey(storageKey)) return { format: 'invalid', reason: 'UNSAFE_KEY' };
  return { format: 'historicalKey', key: storageKey, probeUrl: null };
}

async function anonymousProbe(url, requestImpl = boundedRequest) {
  const head = await requestImpl(url, { method: 'HEAD', timeoutMs: 10_000, maxBytes: 0 });
  if ([401, 403].includes(head.status)) return 'DENIED';
  if ([404, 410].includes(head.status)) return 'MISSING';
  if (head.status >= 300 && head.status < 400) return 'NOT_VERIFIED';
  if (![200, 206, 405, 501].includes(head.status)) return 'NOT_VERIFIED';
  const ranged = await requestImpl(url, {
    method: 'GET', timeoutMs: 10_000, maxBytes: MAX_RANGE_BYTES,
    headers: { Range: `bytes=0-${MAX_RANGE_BYTES - 1}` },
  });
  if ([401, 403].includes(ranged.status)) return 'DENIED';
  if ([404, 410].includes(ranged.status)) return 'MISSING';
  if (ranged.status !== 206 || !/^bytes 0-\d+\//i.test(ranged.headers['content-range'] || ''))
    return 'NOT_VERIFIED';
  return ranged.bytesRead > 0 && ranged.bytesRead <= MAX_RANGE_BYTES ? 'PUBLIC' : 'NOT_VERIFIED';
}

function boundedRequest(rawUrl, options) {
  return new Promise((resolve) => {
    let parsed;
    try { parsed = new URL(rawUrl); } catch { return resolve({ status: 0, headers: {}, bytesRead: 0 }); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
      return resolve({ status: 0, headers: {}, bytesRead: 0 });
    const request = https.request(parsed, {
      method: options.method,
      headers: options.headers || {},
      timeout: options.timeoutMs,
    }, (response) => {
      const headers = Object.fromEntries(Object.entries(response.headers).map(([k, v]) => [k, String(v || '')]));
      let bytesRead = 0;
      if (options.method === 'GET' && options.maxBytes > 0) {
        const match = /^bytes 0-(\d+)\/(?:\d+|\*)$/i.exec(headers['content-range'] || '');
        const contentLength = Number(headers['content-length'] || 0);
        if (response.statusCode !== 206 || !match || Number(match[1]) >= options.maxBytes || contentLength > options.maxBytes) {
          response.destroy();
          return resolve({ status: response.statusCode || 0, headers, bytesRead: 0 });
        }
      }
      response.on('data', (chunk) => {
        bytesRead += chunk.length;
        if (bytesRead >= (options.maxBytes || 0)) response.destroy();
      });
      const finish = () => resolve({ status: response.statusCode || 0, headers, bytesRead: Math.min(bytesRead, options.maxBytes || 0) });
      response.on('close', finish);
      response.on('end', finish);
      if (options.maxBytes === 0) response.destroy();
    });
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve({ status: 0, headers: {}, bytesRead: 0 }));
    request.end();
  });
}

function hmac(key, data) { return crypto.createHmac('sha256', key).update(data).digest(); }
function signatureKey(secret, date, region) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), 's3'), 'aws4_request');
}

function signedServiceHead(key, env = process.env) {
  if (!safeStorageKey(key)) return Promise.resolve('ERROR');
  const bucket = env.DO_SPACES_BUCKET || 'coro-storage';
  const accessKey = env.DO_SPACES_KEY || '';
  const secretKey = env.DO_SPACES_SECRET || '';
  if (!accessKey || !secretKey) return Promise.resolve('ERROR');
  const host = `${bucket}.tor1.digitaloceanspaces.com`;
  const path = `/${key.split('/').map(encodeURIComponent).join('/')}`;
  const now = new Date();
  const amzDate = `${now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15)}Z`;
  const date = amzDate.slice(0, 8);
  const payloadHash = crypto.createHash('sha256').update('').digest('hex');
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['HEAD', path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${date}/tor1/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  const signature = crypto.createHmac('sha256', signatureKey(secretKey, date, 'tor1')).update(stringToSign).digest('hex');
  return new Promise((resolve) => {
    const request = https.request({ hostname: host, path, method: 'HEAD', timeout: 10_000, headers: {
      'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    } }, (response) => {
      response.resume();
      if (response.statusCode === 200) resolve('EXISTS');
      else if (response.statusCode === 404) resolve('MISSING');
      else resolve('ERROR');
    });
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve('ERROR'));
    request.end();
  });
}

function emptyReport() {
  return {
    schemaVersion: 1, execution: 'PASS', readOnly: true,
    coverage: { references: 0, uniqueObjects: 0, projectFiles: 0, projectFileVersions: 0, officialPdfs: 0, archivedOrInactive: 0, orphanObjects: 'OUT_OF_SCOPE' },
    formats: { canonicalPrivate: 0, historicalHttps: 0, historicalKey: 0, signedUrl: 0, invalid: 0, external: 0 },
    classifications: { PRIVATE_ACCESS_VERIFIED: 0, PUBLIC_EXPOSURE_CONFIRMED: 0, MISSING_OR_BROKEN: 0, INVALID_REFERENCE: 0, NOT_VERIFIED: 0, OUT_OF_SCOPE: 0 },
    duplicateReferences: 0,
  };
}

async function runInventory({ prisma, serviceHead, publicUrlForKey, allowedOrigins, probe = anonymousProbe }) {
  const report = emptyReport();
  const seenReferences = new Set();
  const uniqueObjects = new Set();
  const entries = [];
  let cursor;
  do {
    const rows = await prisma.projectFile.findMany({
      take: PAGE_SIZE, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), orderBy: { id: 'asc' },
      select: { id: true, parentId: true, storageKey: true, url: true, project: { select: { isActive: true, status: true } } },
    });
    for (const row of rows) {
      entries.push({ kind: 'projectFile', reference: row.url, storageKey: row.storageKey, archived: row.project && (!row.project.isActive || row.project.status === 'ARCHIVED') });
      report.coverage.projectFiles += 1;
      if (row.parentId) report.coverage.projectFileVersions += 1;
      if (row.project && (!row.project.isActive || row.project.status === 'ARCHIVED')) report.coverage.archivedOrInactive += 1;
    }
    cursor = rows.at(-1)?.id;
    if (rows.length < PAGE_SIZE) break;
  } while (cursor);

  let projectCursor;
  do {
    const rows = await prisma.project.findMany({
      take: PAGE_SIZE, ...(projectCursor ? { skip: 1, cursor: { id: projectCursor } } : {}), orderBy: { id: 'asc' },
      where: { OR: [{ officialPdfFr: { not: null } }, { officialPdfEn: { not: null } }] },
      select: { id: true, officialPdfFr: true, officialPdfEn: true, isActive: true, status: true },
    });
    for (const row of rows) for (const reference of [row.officialPdfFr, row.officialPdfEn]) if (reference) {
      entries.push({ kind: 'officialPdf', reference, storageKey: null, archived: !row.isActive || row.status === 'ARCHIVED' });
      report.coverage.officialPdfs += 1;
      if (!row.isActive || row.status === 'ARCHIVED') report.coverage.archivedOrInactive += 1;
    }
    projectCursor = rows.at(-1)?.id;
    if (rows.length < PAGE_SIZE) break;
  } while (projectCursor);

  for (const entry of entries) {
    report.coverage.references += 1;
    const referenceHash = fingerprint(`${entry.reference || ''}\0${entry.storageKey || ''}`);
    if (seenReferences.has(referenceHash)) report.duplicateReferences += 1;
    seenReferences.add(referenceHash);
    const parsed = classifyReference(entry.reference, entry.storageKey, allowedOrigins);
    report.formats[parsed.format] += 1;
    if (parsed.format === 'invalid') { report.classifications.INVALID_REFERENCE += 1; continue; }
    if (parsed.format === 'external') { report.classifications.OUT_OF_SCOPE += 1; continue; }
    if (parsed.format === 'signedUrl') { report.classifications.NOT_VERIFIED += 1; continue; }

    let key = parsed.key || entry.storageKey;
    if (parsed.format === 'canonicalPrivate') {
      const encoded = entry.reference.slice(PRIVATE_PREFIX.length);
      try { key = Buffer.from(encoded, 'base64url').toString('utf8'); } catch { key = ''; }
      if (!safeStorageKey(key)) { report.classifications.INVALID_REFERENCE += 1; continue; }
    }
    uniqueObjects.add(fingerprint(key));
    const exists = await serviceHead(key);
    if (exists === 'MISSING') { report.classifications.MISSING_OR_BROKEN += 1; continue; }
    if (exists !== 'EXISTS') { report.classifications.NOT_VERIFIED += 1; continue; }

    const probeUrl = parsed.probeUrl || publicUrlForKey(key);
    if (!probeUrl) { report.classifications.NOT_VERIFIED += 1; continue; }
    const visibility = await probe(probeUrl);
    if (visibility === 'PUBLIC') report.classifications.PUBLIC_EXPOSURE_CONFIRMED += 1;
    else if (visibility === 'DENIED') report.classifications.PRIVATE_ACCESS_VERIFIED += 1;
    else if (visibility === 'MISSING') report.classifications.NOT_VERIFIED += 1;
    else report.classifications.NOT_VERIFIED += 1;
  }
  report.coverage.uniqueObjects = uniqueObjects.size;
  return report;
}

async function runReadOnlyInventory({ prisma, serviceHead, publicUrlForKey, allowedOrigins, probe = anonymousProbe }) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    return runInventory({
      prisma: transaction,
      serviceHead,
      publicUrlForKey,
      allowedOrigins,
      probe,
    });
  }, { timeout: 300_000 });
}

async function main() {
  if (process.env.CORO_PROJECT_DOCUMENT_HISTORY_AUDIT_RUN !== 'true') throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  try {
    const bucket = process.env.DO_SPACES_BUCKET || 'coro-storage';
    const report = await runReadOnlyInventory({
      prisma,
      allowedOrigins: configuredOrigins(),
      serviceHead: (key) => signedServiceHead(key),
      publicUrlForKey: (key) => `https://${bucket}.tor1.digitaloceanspaces.com/${key.split('/').map(encodeURIComponent).join('/')}`,
    });
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { anonymousProbe, classifyReference, configuredOrigins, emptyReport, main, runInventory, runReadOnlyInventory, safeStorageKey, signedServiceHead };

if (require.main === module) main().catch(() => {
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: 'FAILED', readOnly: true })}\n`);
  process.exitCode = 1;
});
