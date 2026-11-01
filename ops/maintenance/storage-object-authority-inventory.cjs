'use strict';

const crypto = require('node:crypto');
const https = require('node:https');

const PRIVATE_PREFIX = 'coro-private:v1:';
const AUTHORITY_QUERIES = Object.freeze([
  ['contractDocuments', 'organizationContractDocument', ['storageKey']],
  ['proposalDocuments', 'proposalDocument', ['storageKey']],
  ['projectFiles', 'projectFile', ['storageKey', 'url']],
  ['projects', 'project', ['exportedPdfFr', 'exportedPdfEn', 'officialPdfFr', 'officialPdfEn']],
  ['populationEvidenceReports', 'populationEvidenceReport', ['storageKey']],
  ['exerciseReportVersions', 'exerciseReportVersion', ['pdfStorageKey']],
  ['exerciseReportImports', 'exerciseReportImport', ['storageKey']],
  ['correctiveActionEvidence', 'correctiveActionEvidence', ['storageKey']],
  ['correctiveActionTrackingReports', 'correctiveActionTrackingReport', ['storageKey']],
  ['operationalReviewReports', 'operationalReviewReport', ['storageKey']],
  ['documentPdfExports', 'documentPdfExport', ['artifacts']],
]);

function fingerprint(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function hmac(key, value) { return crypto.createHmac('sha256', key).update(value).digest(); }
function signatureKey(secret, date, region) { return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), 's3'), 'aws4_request'); }
function safeKey(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 1024 &&
    !value.startsWith('/') && !value.includes('..') && !value.includes('\\') &&
    !/^[a-z][a-z0-9+.-]*:/i.test(value);
}
function referenceKey(value, allowedOrigins = new Set()) {
  if (typeof value !== 'string' || !value) return null;
  if (value.startsWith(PRIVATE_PREFIX)) {
    try { const key = Buffer.from(value.slice(PRIVATE_PREFIX.length), 'base64url').toString('utf8'); return safeKey(key) ? key : null; } catch { return null; }
  }
  if (/^https:/i.test(value)) {
    try {
      const url = new URL(value);
      if (!allowedOrigins.has(url.origin) || url.username || url.password || url.search || url.hash) return null;
      const key = url.pathname.slice(1).split('/').map(decodeURIComponent).join('/');
      return safeKey(key) ? key : null;
    } catch { return null; }
  }
  return safeKey(value) ? value : null;
}
function artifactKeys(value, output = []) {
  if (!value || typeof value !== 'object') return output;
  if (Array.isArray(value)) { for (const item of value) artifactKeys(item, output); return output; }
  for (const [name, nested] of Object.entries(value)) {
    if (typeof nested === 'string' && /(?:storageKey|objectKey|privateReference)$/i.test(name)) output.push(nested);
    else artifactKeys(nested, output);
  }
  return output;
}
function candidateCategory(key) {
  const value = key.toLowerCase();
  if (/(?:^|\/)(?:tmp|temp|staging|cache)(?:\/|$)/.test(value)) return 'TEMPORARY_OR_STAGING';
  if (/(?:project-files|documents|technical|compliance)/.test(value)) return 'PROJECT_OR_BUILDING_DOCUMENT';
  if (/(?:official-project-pdfs|pdf-exports|official-pdf)/.test(value)) return 'OFFICIAL_PDF_OR_EXPORT';
  if (/(?:exercise|corrective|operational-review|evidence|report)/.test(value)) return 'GOVERNED_EVIDENCE_OR_REPORT';
  if (/(?:proposal|contract|commercial)/.test(value)) return 'COMMERCIAL_RECORD';
  if (/(?:population|sentinelle|evacuation)/.test(value)) return 'POPULATION_OR_SENTINELLE';
  return 'UNCLASSIFIED_HISTORICAL';
}
function ageBucket(lastModified, now) {
  const value = lastModified instanceof Date ? lastModified : new Date(lastModified || 'invalid');
  if (!Number.isFinite(value.getTime())) return 'UNKNOWN';
  const days = Math.max(0, (now.getTime() - value.getTime()) / 86_400_000);
  if (days < 30) return 'LT_30_DAYS';
  if (days < 90) return 'DAYS_30_TO_89';
  if (days < 365) return 'DAYS_90_TO_364';
  return 'GE_365_DAYS';
}
async function readAuthorityKeys(prisma, allowedOrigins) {
  const keys = new Map();
  const coverage = {};
  for (const [label, model, fields] of AUTHORITY_QUERIES) {
    const delegate = prisma[model];
    if (!delegate?.findMany) throw new Error(`AUTHORITY_MODEL_UNAVAILABLE:${model}`);
    const select = { id: true, ...Object.fromEntries(fields.map((field) => [field, true])) };
    coverage[label] = { rows: 0, references: 0 };
    let cursor;
    do {
      const rows = await delegate.findMany({ take: 500, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), orderBy: { id: 'asc' }, select });
      for (const row of rows) for (const field of fields) {
        const values = field === 'artifacts' ? artifactKeys(row[field]) : [row[field]];
        for (const value of values) {
          if (!value) continue;
          coverage[label].references += 1;
          const key = referenceKey(value, allowedOrigins);
          if (!key) continue;
          const hash = fingerprint(key);
          if (!keys.has(hash)) keys.set(hash, new Set());
          keys.get(hash).add(label);
        }
      }
      coverage[label].rows += rows.length;
      cursor = rows.at(-1)?.id;
      if (rows.length < 500) break;
    } while (cursor);
  }
  return { keys, coverage };
}
async function inventory({ prisma, bucketObjects, allowedOrigins = new Set(), now = new Date() }) {
  const { keys, coverage } = await readAuthorityKeys(prisma, allowedOrigins);
  const bucket = new Map();
  for await (const object of bucketObjects) {
    if (!safeKey(object.key)) continue;
    bucket.set(fingerprint(object.key), {
      size: Number(object.size) || 0,
      category: candidateCategory(object.key),
      age: ageBucket(object.lastModified, now),
    });
  }
  let referencedPresent = 0, referencedMissing = 0, unreferenced = 0, referencedBytes = 0, unreferencedBytes = 0;
  const candidateCategories = {}, candidateAges = {};
  for (const [hash, object] of bucket) {
    if (keys.has(hash)) { referencedPresent += 1; referencedBytes += object.size; }
    else {
      unreferenced += 1; unreferencedBytes += object.size;
      const category = object.category, age = object.age;
      candidateCategories[category] ??= { objects: 0, bytes: 0 };
      candidateCategories[category].objects += 1; candidateCategories[category].bytes += object.size;
      candidateAges[age] ??= { objects: 0, bytes: 0 };
      candidateAges[age].objects += 1; candidateAges[age].bytes += object.size;
    }
  }
  for (const hash of keys.keys()) if (!bucket.has(hash)) referencedMissing += 1;
  return {
    schemaVersion: 1, execution: 'PASS', readOnly: true, deletionCapability: false,
    coverage,
    totals: { authorityObjects: keys.size, bucketObjects: bucket.size, referencedPresent, referencedMissing, unreferenced, referencedBytes, unreferencedBytes },
    candidateCategories,
    candidateAges,
    versionCoverage: 'CURRENT_OBJECTS_CLASSIFIED_SEE_SEPARATE_VERSION_INVENTORY',
    classification: unreferenced ? 'CANDIDATES_REQUIRE_INDIVIDUAL_REVIEW' : 'NO_UNREFERENCED_OBJECTS_FOUND',
  };
}
async function runReadOnlyInventory(options) {
  return options.prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    return inventory({ ...options, prisma: transaction });
  }, { timeout: 300_000 });
}

function xmlText(value) {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function parseListPage(xml) {
  const objects = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((match) => {
    const block = match[1];
    const key = /<Key>([\s\S]*?)<\/Key>/.exec(block)?.[1];
    const size = /<Size>(\d+)<\/Size>/.exec(block)?.[1];
    const lastModified = /<LastModified>([\s\S]*?)<\/LastModified>/.exec(block)?.[1];
    return { key: xmlText(key || ''), size: Number(size || 0), lastModified: lastModified ? xmlText(lastModified) : null };
  });
  const token = /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1];
  return { objects, nextToken: token ? xmlText(token) : null };
}
function signedListPage(token, env = process.env) {
  const bucket = env.DO_SPACES_BUCKET || 'coro-storage';
  const accessKey = env.DO_SPACES_KEY || '';
  const secretKey = env.DO_SPACES_SECRET || '';
  if (!accessKey || !secretKey) return Promise.reject(new Error('STORAGE_CREDENTIALS_MISSING'));
  const region = 'tor1', host = `${bucket}.${region}.digitaloceanspaces.com`;
  const query = [['list-type', '2'], ...(token ? [['continuation-token', token]] : [])]
    .map(([key, value]) => [encodeURIComponent(key), encodeURIComponent(value)]).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&');
  const now = new Date(), amzDate = `${now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15)}Z`, date = amzDate.slice(0, 8);
  const payloadHash = crypto.createHash('sha256').update('').digest('hex');
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`, signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['GET', '/', query, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  const signature = crypto.createHmac('sha256', signatureKey(secretKey, date, region)).update(stringToSign).digest('hex');
  return new Promise((resolve, reject) => {
    const request = https.request({ hostname: host, path: `/?${query}`, method: 'GET', timeout: 30_000, headers: {
      'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    } }, (response) => {
      const chunks = []; let bytes = 0;
      response.on('data', (chunk) => { bytes += chunk.length; if (bytes > 8 * 1024 * 1024) request.destroy(new Error('STORAGE_LIST_RESPONSE_TOO_LARGE')); else chunks.push(chunk); });
      response.on('end', () => response.statusCode === 200 ? resolve(parseListPage(Buffer.concat(chunks).toString('utf8'))) : reject(new Error(`STORAGE_LIST_FAILED:${response.statusCode}`)));
    });
    request.on('timeout', () => request.destroy(new Error('STORAGE_LIST_TIMEOUT')));
    request.on('error', reject); request.end();
  });
}
async function* listBucketObjects(env = process.env) {
  let token = null, pages = 0;
  do {
    if (++pages > 100000) throw new Error('STORAGE_LIST_PAGE_LIMIT');
    const page = await signedListPage(token, env);
    yield* page.objects;
    token = page.nextToken;
  } while (token);
}
function parseVersionPage(xml) {
  const versions = [...xml.matchAll(/<Version>([\s\S]*?)<\/Version>/g)].map((match) => {
    const block = match[1];
    const text = (name) => xmlText(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`).exec(block)?.[1] || '');
    return { key: text('Key'), versionId: text('VersionId'), isLatest: text('IsLatest') === 'true', lastModified: text('LastModified') || null, size: Number(text('Size') || 0) };
  });
  const markers = {
    nextKeyMarker: /<NextKeyMarker>([\s\S]*?)<\/NextKeyMarker>/.exec(xml)?.[1],
    nextVersionIdMarker: /<NextVersionIdMarker>([\s\S]*?)<\/NextVersionIdMarker>/.exec(xml)?.[1],
  };
  return { versions, nextKeyMarker: markers.nextKeyMarker ? xmlText(markers.nextKeyMarker) : null, nextVersionIdMarker: markers.nextVersionIdMarker ? xmlText(markers.nextVersionIdMarker) : null };
}
function signedListVersionsPage(keyMarker, versionIdMarker, env = process.env) {
  const bucket = env.DO_SPACES_BUCKET || 'coro-storage', accessKey = env.DO_SPACES_KEY || '', secretKey = env.DO_SPACES_SECRET || '';
  if (!accessKey || !secretKey) return Promise.reject(new Error('STORAGE_CREDENTIALS_MISSING'));
  const region = 'tor1', host = `${bucket}.${region}.digitaloceanspaces.com`;
  const pairs = [['versions', ''], ...(keyMarker ? [['key-marker', keyMarker]] : []), ...(versionIdMarker ? [['version-id-marker', versionIdMarker]] : [])];
  const query = pairs.map(([key, value]) => [encodeURIComponent(key), encodeURIComponent(value)]).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&');
  const now = new Date(), amzDate = `${now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15)}Z`, date = amzDate.slice(0, 8);
  const payloadHash = crypto.createHash('sha256').update('').digest('hex');
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`, signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['GET', '/', query, canonicalHeaders, signedHeaders, payloadHash].join('\n'), scope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  const signature = crypto.createHmac('sha256', signatureKey(secretKey, date, region)).update(stringToSign).digest('hex');
  return new Promise((resolve, reject) => {
    const request = https.request({ hostname: host, path: `/?${query}`, method: 'GET', timeout: 30_000, headers: {
      'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    } }, (response) => {
      const chunks = []; let bytes = 0;
      response.on('data', (chunk) => { bytes += chunk.length; if (bytes > 8 * 1024 * 1024) request.destroy(new Error('STORAGE_VERSION_RESPONSE_TOO_LARGE')); else chunks.push(chunk); });
      response.on('end', () => response.statusCode === 200 ? resolve(parseVersionPage(Buffer.concat(chunks).toString('utf8'))) : reject(new Error(`STORAGE_VERSION_LIST_FAILED:${response.statusCode}`)));
    });
    request.on('timeout', () => request.destroy(new Error('STORAGE_VERSION_LIST_TIMEOUT'))); request.on('error', reject); request.end();
  });
}
async function versionSummary(env = process.env) {
  let keyMarker = null, versionIdMarker = null, pages = 0, versions = 0, noncurrentVersions = 0, versionBytes = 0, noncurrentBytes = 0;
  const categories = {};
  do {
    if (++pages > 100000) throw new Error('STORAGE_VERSION_PAGE_LIMIT');
    const page = await signedListVersionsPage(keyMarker, versionIdMarker, env);
    for (const item of page.versions) {
      if (!safeKey(item.key)) continue;
      versions += 1; versionBytes += item.size;
      if (!item.isLatest) {
        noncurrentVersions += 1; noncurrentBytes += item.size;
        const category = candidateCategory(item.key); categories[category] ??= { versions: 0, bytes: 0 };
        categories[category].versions += 1; categories[category].bytes += item.size;
      }
    }
    keyMarker = page.nextKeyMarker; versionIdMarker = page.nextVersionIdMarker;
  } while (keyMarker);
  return { status: 'ENUMERATED', versions, versionBytes, noncurrentVersions, noncurrentBytes, noncurrentCategories: categories };
}
async function main() {
  if (process.env.CORO_STORAGE_AUTHORITY_INVENTORY_RUN !== 'true') throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  const bucket = process.env.DO_SPACES_BUCKET || 'coro-storage';
  try {
    const report = await runReadOnlyInventory({ prisma, bucketObjects: listBucketObjects(), allowedOrigins: new Set([`https://${bucket}.tor1.digitaloceanspaces.com`]) });
    try { report.versionInventory = await versionSummary(); }
    catch (error) { report.versionInventory = { status: 'NOT_VERIFIED', reason: String(error?.message || 'VERSION_LIST_FAILED').replace(/[^A-Z0-9_:-]/gi, '') }; }
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally { await prisma.$disconnect(); }
}

module.exports = { AUTHORITY_QUERIES, ageBucket, artifactKeys, candidateCategory, inventory, parseListPage, parseVersionPage, readAuthorityKeys, referenceKey, runReadOnlyInventory, safeKey, signedListPage, versionSummary };
if (require.main === module || process.env.CORO_STORAGE_AUTHORITY_INVENTORY_RUN === 'true') main().catch(() => { process.stdout.write('{"schemaVersion":1,"execution":"FAILED","readOnly":true,"deletionCapability":false}\n'); process.exitCode = 1; });
