'use strict';

const crypto = require('node:crypto');
const https = require('node:https');
const { listBucketObjects, safeKey } = require('./storage-object-authority-inventory.cjs');

const PREFIX_PART = /^tenant-([A-Za-z0-9._-]+)\/incident-report-(?:exports|attachments)\//;
const fingerprint = (value) => crypto.createHash('sha256').update(value).digest('hex');

function planReconciliation({ objects, authorityKeys, organizationId, inFlightKeys = new Set(), now = new Date(), graceHours = 24 }) {
  if (!/^[A-Za-z0-9._-]+$/.test(organizationId)) throw new Error('INVALID_ORGANIZATION_SCOPE');
  const cutoff = now.getTime() - graceHours * 3_600_000;
  const plan = [];
  for (const object of objects) {
    const match = PREFIX_PART.exec(object.key || '');
    if (!match || match[1] !== organizationId || !safeKey(object.key)) continue;
    const modified = new Date(object.lastModified || 'invalid').getTime();
    let disposition = 'ORPHAN_CANDIDATE';
    if (authorityKeys.has(object.key)) disposition = 'REFERENCED';
    else if (inFlightKeys.has(object.key)) disposition = 'IN_FLIGHT';
    else if (!Number.isFinite(modified) || modified > cutoff) disposition = 'GRACE_PERIOD';
    plan.push({ objectFingerprint: fingerprint(object.key), size: Number(object.size) || 0, disposition });
  }
  return { schemaVersion: 1, organizationId, dryRun: true, graceHours, inspected: plan.length, candidates: plan.filter((item) => item.disposition === 'ORPHAN_CANDIDATE').length, bytesRecoverable: plan.filter((item) => item.disposition === 'ORPHAN_CANDIDATE').reduce((sum, item) => sum + item.size, 0), plan };
}

async function readIncidentReportAuthority(prisma, organizationId) {
  const [attachments, exports, processing] = await Promise.all([
    prisma.incidentReportAttachment.findMany({ where: { organizationId }, select: { storageKey: true } }),
    prisma.incidentReportExport.findMany({ where: { organizationId, storageKey: { not: null } }, select: { storageKey: true } }),
    prisma.incidentReportExport.findMany({ where: { organizationId, status: { in: ['PENDING', 'PROCESSING'] } }, select: { id: true, reportId: true, reportVersionId: true, storageKey: true } }),
  ]);
  return {
    authorityKeys: new Set([...attachments, ...exports].map((item) => item.storageKey).filter(Boolean)),
    inFlightKeys: new Set(processing.map((item) => item.storageKey || `tenant-${organizationId}/incident-report-exports/${item.reportId}/${item.reportVersionId}/${item.id}.pdf`)),
  };
}

function hmac(key, value) { return crypto.createHmac('sha256', key).update(value).digest(); }
function signingKey(secret, date, region) { return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), 's3'), 'aws4_request'); }
function deletePrivateObject(key, env = process.env) {
  if (!safeKey(key)) return Promise.reject(new Error('INVALID_STORAGE_KEY'));
  const bucket = env.DO_SPACES_BUCKET || 'coro-storage'; const accessKey = env.DO_SPACES_KEY || ''; const secret = env.DO_SPACES_SECRET || '';
  if (!accessKey || !secret) return Promise.reject(new Error('STORAGE_CREDENTIALS_MISSING'));
  const region = 'tor1'; const host = `${bucket}.${region}.digitaloceanspaces.com`;
  const path = `/${key.split('/').map(encodeURIComponent).join('/')}`; const now = new Date();
  const amzDate = `${now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15)}Z`; const date = amzDate.slice(0, 8);
  const payloadHash = crypto.createHash('sha256').update('').digest('hex'); const headers = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`; const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonical = ['DELETE', path, '', headers, signedHeaders, payloadHash].join('\n'); const scope = `${date}/${region}/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, crypto.createHash('sha256').update(canonical).digest('hex')].join('\n'); const signature = crypto.createHmac('sha256', signingKey(secret, date, region)).update(toSign).digest('hex');
  return new Promise((resolve, reject) => { const request = https.request({ hostname: host, path, method: 'DELETE', timeout: 30_000, headers: { 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}` } }, (response) => { response.resume(); response.on('end', () => response.statusCode === 204 || response.statusCode === 200 ? resolve() : reject(new Error(`STORAGE_DELETE_FAILED:${response.statusCode}`))); }); request.on('timeout', () => request.destroy(new Error('STORAGE_DELETE_TIMEOUT'))); request.on('error', reject); request.end(); });
}

async function main() {
  if (process.env.CORO_INCIDENT_REPORT_ORPHAN_RECONCILIATION_RUN !== 'true') throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const mode = process.env.CORO_INCIDENT_REPORT_ORPHAN_RECONCILIATION_MODE;
  if (!['DRY_RUN', 'APPLY'].includes(mode)) throw new Error('INVALID_RECONCILIATION_MODE');
  if (mode === 'APPLY' && process.env.CORO_INCIDENT_REPORT_ORPHAN_DELETE_CONFIRM !== 'DELETE_ORPHANS') throw new Error('EXPLICIT_DELETE_CONFIRMATION_REQUIRED');
  const organizationId = process.env.CORO_INCIDENT_REPORT_ORGANIZATION_ID?.trim();
  if (!organizationId) throw new Error('ORGANIZATION_SCOPE_REQUIRED');
  const { PrismaClient } = require('/app/node_modules/@prisma/client'); const prisma = new PrismaClient();
  try {
    const reportAndObjects = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const authority = await readIncidentReportAuthority(tx, organizationId); const objects = [];
      for await (const item of listBucketObjects()) objects.push(item);
      return { result: planReconciliation({ ...authority, objects, organizationId, graceHours: Number(process.env.CORO_INCIDENT_REPORT_ORPHAN_GRACE_HOURS || 24) }), objects };
    }, { timeout: 300_000 });
    const report = reportAndObjects.result;
    if (mode === 'APPLY') {
      const candidates = new Set(report.plan.filter((item) => item.disposition === 'ORPHAN_CANDIDATE').map((item) => item.objectFingerprint)); let deleted = 0; let deletedBytes = 0;
      for (const object of reportAndObjects.objects) if (candidates.has(fingerprint(object.key))) { await deletePrivateObject(object.key); deleted += 1; deletedBytes += Number(object.size) || 0; }
      report.dryRun = false; report.deleted = deleted; report.deletedBytes = deletedBytes;
    }
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally { await prisma.$disconnect(); }
}

module.exports = { deletePrivateObject, planReconciliation, readIncidentReportAuthority };
if (require.main === module) main().catch((error) => { process.stderr.write(`${String(error?.message || 'RECONCILIATION_FAILED')}\n`); process.exitCode = 1; });
