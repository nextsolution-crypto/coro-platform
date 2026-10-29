#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { QaIdentityLab } from '../global-e2e/src/browser-orchestration.mjs';
import { loadSecretStore } from '../global-e2e/src/secret-store.mjs';
import { startMfaCaptureAdapter } from '../global-e2e/src/mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from '../global-e2e/src/policy.mjs';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const apiUrl = process.env.CORO_QA_BACKEND_URL?.replace(/\/$/, '');
const frontendUrl = process.env.CORO_QA_FRONTEND_URL?.replace(/\/$/, '');
const evidenceRoot = assertUnderQaRoot(process.env.CORO_QA_PDF_EVIDENCE);
const testedCommit = process.env.CORO_QA_COMMIT;
if (!apiUrl || !frontendUrl || !testedCommit) throw new Error('PDF acceptance runtime configuration incomplete');
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: process.env.CORO_QA_MFA_DIR, channelToken: secrets.mfaChannelToken, port: Number(process.env.CORO_QA_MFA_ADAPTER_PORT || 34683) });
const lab = new QaIdentityLab({ apiUrl, frontendUrl, portalUrl: frontendUrl, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const ids = {
  orgA: '10000000-0000-4000-8000-000000000002', orgB: '10000000-0000-4000-8000-000000000003',
  clientA: '30000000-0000-4000-8000-000000000001', buildingA: '40000000-0000-4000-8000-000000000001', advisor: '20000000-0000-4000-8000-000000000007',
  pmu: 'pr124-browser-pmu', psi: 'pr124-browser-psi', pca: 'pr124-browser-pca', draft: 'pdf-audit-draft', archived: 'pdf-audit-archived', inactive: 'pdf-audit-inactive', network: 'pdf-audit-network-resource',
  unassigned: 'pdf-audit-unassigned', deactivated: 'pdf-audit-deactivated',
};
const report = { testedCommit, executedAt: new Date().toISOString(), exports: [], security: [], durability: [], provenance: [], resourceBoundary: null };
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const modulesFor = (type) => type === 'PCA' ? [1,2,3,4,5,6,7,8] : type === 'PSI' ? [1,2,4,7,8] : [1,2,3,4,7,8];
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function login(email, role, organizationId) {
  const startedAt = Date.now();
  const first = await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } });
  if (first.status >= 300 || !first.data?.mfaRequired) throw new Error(`Login failed ${email}: ${first.status}`);
  const code = await lab.completeMfa({ email, key: email }, startedAt);
  const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } });
  if (verified.status >= 300 || verified.data.user?.role !== role || verified.data.user?.organizationId !== organizationId) throw new Error(`MFA scope failed ${email}`);
  return verified.data.access_token;
}
async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${apiUrl}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const bytes = Buffer.from(await response.arrayBuffer());
  const headers = Object.fromEntries(response.headers);
  let json = null;
  if (headers['content-type']?.includes('application/json')) try { json = JSON.parse(bytes.toString('utf8')); } catch { json = null; }
  return { status: response.status, headers, bytes, json };
}
async function previewPdf(projectId, type, token, language = 'fr') {
  return request(`/projects/${projectId}/export`, { token, method: 'POST', body: { selectedModules: modulesFor(type), moduleOrder: modulesFor(type), language, isPreview: true } });
}
async function finalExport(projectId, type, token, language = 'fr', idempotencyKey = randomUUID()) {
  let response = await request(`/projects/${projectId}/export`, { token, method: 'POST', body: { selectedModules: modulesFor(type), moduleOrder: modulesFor(type), language, isPreview: false, idempotencyKey } });
  if (response.status >= 300 || !response.json?.id) return { ...response, idempotencyKey, state: response.json };
  for (let attempt = 0; response.json.status === 'PROCESSING' && attempt < 40; attempt += 1) {
    await sleep(250);
    response = await request(`/projects/${projectId}/export/requests/${response.json.id}`, { token });
  }
  return { ...response, idempotencyKey, state: response.json };
}
async function downloadArtifact(state, language, token) {
  const artifact = state?.artifacts?.find((item) => item.language === language);
  return artifact ? request(artifact.downloadUrl, { token }) : { status: 0, headers: {}, bytes: Buffer.alloc(0) };
}
async function seedVariant(id, status, isActive, content) {
  await prisma.documentPdfExport.deleteMany({ where: { projectId: id } });
  await prisma.documentReviewRequest.deleteMany({ where: { projectId: id } });
  await prisma.document.deleteMany({ where: { projectId: id } });
  await prisma.projectVersion.deleteMany({ where: { projectId: id } });
  await prisma.project.deleteMany({ where: { id } });
  await prisma.project.create({ data: { id, name: `PDF audit ${status}`, documentType: 'PMU', year: 2026, organizationId: ids.orgA, clientId: ids.clientA, buildingId: ids.buildingA, userId: ids.advisor, status, isActive, progress: 50, configData: { province: 'QC', syntheticQa: true } } });
  await prisma.document.create({ data: { projectId: id, title: `Synthetic ${id}`, content } });
}

try {
  await mkdir(evidenceRoot, { recursive: true });
  const advisorToken = await login('advisor-a@global-e2e.test', 'OPERATOR', ids.orgA);
  const adminBToken = await login('customer-admin-b@global-e2e.test', 'ADMIN', ids.orgB);
  for (const [type, projectId, languages] of [['PMU', ids.pmu, ['fr','en']], ['PSI', ids.psi, ['fr']], ['PCA', ids.pca, ['fr']]]) {
    for (const language of languages) {
      const result = await finalExport(projectId, type, advisorToken, language, `pdf-${type.toLowerCase()}-${language}-${randomUUID()}`);
      const download = await downloadArtifact(result.state, language, advisorToken);
      const file = join(evidenceRoot, `${type.toLowerCase()}-${language}.pdf`);
      if (download.status === 200) await writeFile(file, download.bytes);
      report.exports.push({ type, language, requestStatus: result.status, exportId: result.state?.id, state: result.state?.status, downloadStatus: download.status, mime: download.headers['content-type'], bytes: download.bytes.length, sha256: sha256(download.bytes), declaredSha256: download.headers['x-document-sha256'], sourceHash: result.state?.sourceHash, reviewRequestId: result.state?.reviewRequestId, projectVersionId: result.state?.projectVersionId, templateVersion: result.state?.templateVersion, generatorVersion: result.state?.generatorVersion, file });
    }
  }
  const preview = await previewPdf(ids.pmu, 'PMU', advisorToken);
  const previewFile = join(evidenceRoot, 'pmu-fr-preview.pdf');
  if (preview.status === 200) await writeFile(previewFile, preview.bytes);
  report.exports.push({ type: 'PMU_PREVIEW', language: 'fr', downloadStatus: preview.status, mime: preview.headers['content-type'], bytes: preview.bytes.length, sha256: sha256(preview.bytes), file: previewFile });

  const source = await prisma.document.findFirstOrThrow({ where: { projectId: ids.pmu } });
  await seedVariant(ids.draft, 'DRAFT', true, source.content);
  await seedVariant(ids.archived, 'ARCHIVED', true, source.content);
  await seedVariant(ids.inactive, 'IN_PROGRESS', false, source.content);
  for (const [name, projectId, token] of [['anonymous', ids.pmu, null], ['cross-tenant', ids.pmu, adminBToken], ['draft-final', ids.draft, advisorToken], ['archived-final', ids.archived, advisorToken], ['inactive-final', ids.inactive, advisorToken]]) {
    const before = await prisma.documentPdfExport.count({ where: { projectId } });
    const value = await finalExport(projectId, 'PMU', token);
    const after = await prisma.documentPdfExport.count({ where: { projectId } });
    report.security.push({ name, status: value.status, response: value.json, protectedBytesReturned: value.headers['content-type']?.includes('application/pdf') ? value.bytes.length : 0, exportRowsDelta: after - before });
  }
  const passwordHash = await bcrypt.hash(secrets.syntheticPassword, 10);
  for (const [id, email] of [[ids.unassigned, 'pdf-unassigned@global-e2e.test'], [ids.deactivated, 'pdf-deactivated@global-e2e.test']]) await prisma.user.upsert({ where: { id }, update: { isActive: true, password: passwordHash }, create: { id, email, password: passwordHash, firstName: 'PDF', lastName: 'Audit', role: 'OPERATOR', organizationId: ids.orgA, isActive: true } });
  const unassignedToken = await login('pdf-unassigned@global-e2e.test', 'OPERATOR', ids.orgA);
  const deactivatedToken = await login('pdf-deactivated@global-e2e.test', 'OPERATOR', ids.orgA);
  await prisma.user.update({ where: { id: ids.deactivated }, data: { isActive: false } });
  for (const [name, token] of [['same-org-unassigned', unassignedToken], ['deactivated-session', deactivatedToken]]) {
    const before = await prisma.documentPdfExport.count({ where: { projectId: ids.pmu } });
    const value = await finalExport(ids.pmu, 'PMU', token);
    const after = await prisma.documentPdfExport.count({ where: { projectId: ids.pmu } });
    report.security.push({ name, status: value.status, response: value.json, protectedBytesReturned: value.headers['content-type']?.includes('application/pdf') ? value.bytes.length : 0, exportRowsDelta: after - before });
  }

  const key = `lost-response-${randomUUID()}`;
  const simultaneous = await Promise.all([finalExport(ids.pmu, 'PMU', advisorToken, 'fr', key), finalExport(ids.pmu, 'PMU', advisorToken, 'fr', key)]);
  report.durability.push({ name: 'same-idempotency-key', statuses: simultaneous.map((item) => item.status), exportIds: simultaneous.map((item) => item.state?.id), rows: await prisma.documentPdfExport.count({ where: { projectId: ids.pmu, idempotencyKey: key } }) });
  const incompatible = await request(`/projects/${ids.pmu}/export`, { token: advisorToken, method: 'POST', body: { selectedModules: [1], moduleOrder: [1], language: 'en', isPreview: false, idempotencyKey: key } });
  report.durability.push({ name: 'incompatible-idempotency-key', status: incompatible.status, response: incompatible.json });

  const approved = await prisma.documentReviewRequest.findFirstOrThrow({ where: { projectId: ids.pmu, status: 'APPROVED' }, orderBy: { decidedAt: 'desc' } });
  const originalDocument = await prisma.document.findUniqueOrThrow({ where: { id: approved.documentId } });
  const originalBuilding = await prisma.building.findUniqueOrThrow({ where: { id: ids.buildingA } });
  const changedContent = structuredClone(originalDocument.content);
  changedContent.__qaCurrentContentMustNotExport = 'MUTABLE-CONTENT-NOT-APPROVED';
  await prisma.document.update({ where: { id: originalDocument.id }, data: { content: changedContent } });
  await prisma.building.update({ where: { id: ids.buildingA }, data: { name: 'MUTABLE-BUILDING-NOT-APPROVED' } });
  const immutableResult = await finalExport(ids.pmu, 'PMU', advisorToken, 'fr', `immutable-${randomUUID()}`);
  const immutableDownload = await downloadArtifact(immutableResult.state, 'fr', advisorToken);
  const immutableFile = join(evidenceRoot, 'pmu-fr-approved-snapshot-after-current-mutation.pdf');
  if (immutableDownload.status === 200) await writeFile(immutableFile, immutableDownload.bytes);
  report.provenance.push({ name: 'approved-snapshot-after-current-mutation', status: immutableDownload.status, file: immutableFile, sha256: sha256(immutableDownload.bytes), sourceHash: immutableResult.state?.sourceHash, expectedSourceHash: approved.contentHash, mutableMarker: 'MUTABLE-CONTENT-NOT-APPROVED', mutableBuilding: 'MUTABLE-BUILDING-NOT-APPROVED' });
  await prisma.document.update({ where: { id: originalDocument.id }, data: { content: originalDocument.content } });
  await prisma.building.update({ where: { id: ids.buildingA }, data: { name: originalBuilding.name } });

  const networkContent = structuredClone(source.content);
  const section = networkContent.modules_fr?.[0]?.sections?.[0];
  if (section) section.content = `${section.content || ''}\n\n![controlled synthetic resource](http://pdf-resource-probe:34682/synthetic.png)`;
  await seedVariant(ids.network, 'DRAFT', true, networkContent);
  const probeBefore = await fetch('http://127.0.0.1:34682/state').then((response) => response.json());
  const networkPreview = await previewPdf(ids.network, 'PMU', advisorToken);
  const probeAfter = await fetch('http://127.0.0.1:34682/state').then((response) => response.json());
  report.resourceBoundary = { status: networkPreview.status, before: probeBefore, after: probeAfter, internalResourceFetched: probeAfter.imageRequests > probeBefore.imageRequests };

  report.pass = report.exports.every((item) => item.downloadStatus === 200 && item.mime?.includes('application/pdf') && item.sha256 === (item.declaredSha256 || item.sha256)) && report.security.every((item) => item.status >= 400 && item.protectedBytesReturned === 0 && item.exportRowsDelta === 0) && report.durability[0].rows === 1 && new Set(report.durability[0].exportIds).size === 1 && report.durability[1].status === 409 && report.provenance[0].sourceHash === report.provenance[0].expectedSourceHash && !report.resourceBoundary.internalResourceFetched;
  await writeFile(join(evidenceRoot, 'api-acceptance.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pass: report.pass, exports: report.exports.length, security: report.security.length, durability: report.durability, provenance: report.provenance, resourceBoundary: report.resourceBoundary }, null, 2));
} finally {
  await prisma.user.updateMany({ where: { id: ids.deactivated }, data: { isActive: false } }).catch(() => undefined);
  await adapter.close();
  await prisma.$disconnect();
}
