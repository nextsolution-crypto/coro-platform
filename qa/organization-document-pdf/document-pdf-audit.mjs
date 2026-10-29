#!/usr/bin/env node
import { createHash } from 'node:crypto';
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
if (!apiUrl || !frontendUrl || !testedCommit) throw new Error('PDF audit runtime configuration incomplete');

const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({
  captureDirectory: process.env.CORO_QA_MFA_DIR,
  channelToken: secrets.mfaChannelToken,
  port: Number(process.env.CORO_QA_MFA_ADAPTER_PORT || 34683),
});
const lab = new QaIdentityLab({
  apiUrl,
  frontendUrl,
  portalUrl: frontendUrl,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});
const ids = {
  orgA: '10000000-0000-4000-8000-000000000002',
  orgB: '10000000-0000-4000-8000-000000000003',
  clientA: '30000000-0000-4000-8000-000000000001',
  buildingA: '40000000-0000-4000-8000-000000000001',
  advisor: '20000000-0000-4000-8000-000000000007',
  pmu: 'pr124-browser-pmu',
  psi: 'pr124-browser-psi',
  pca: 'pr124-browser-pca',
  draft: 'pdf-audit-draft',
  archived: 'pdf-audit-archived',
  inactive: 'pdf-audit-inactive',
  network: 'pdf-audit-network-resource',
  unassigned: 'pdf-audit-unassigned',
  deactivated: 'pdf-audit-deactivated',
};
const report = { testedCommit, executedAt: new Date().toISOString(), exports: [], security: [], concurrency: [], resourceBoundary: null };
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const modulesFor = (type) => type === 'PCA' ? [1,2,3,4,5,6,7,8] : type === 'PSI' ? [1,2,4,7,8] : [1,2,3,4,7,8];

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
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { status: response.status, headers: Object.fromEntries(response.headers), bytes };
}
async function exportPdf(projectId, type, token, language = 'fr', isPreview = false) {
  return request(`/projects/${projectId}/export`, {
    token,
    method: 'POST',
    body: { selectedModules: modulesFor(type), moduleOrder: modulesFor(type), language, isPreview },
  });
}
async function seedVariant(id, status, isActive, content) {
  await prisma.document.deleteMany({ where: { projectId: id } });
  await prisma.project.deleteMany({ where: { id } });
  await prisma.project.create({ data: {
    id, name: `PDF audit ${status}`, documentType: 'PMU', year: 2026,
    organizationId: ids.orgA, clientId: ids.clientA, buildingId: ids.buildingA,
    userId: ids.advisor, status, isActive, progress: status === 'VALIDATED' ? 85 : 50,
    configData: { province: 'QC', syntheticQa: true },
  }});
  await prisma.document.create({ data: { projectId: id, title: `Synthetic ${id}`, content } });
}

try {
  await mkdir(evidenceRoot, { recursive: true });
  const advisorToken = await login('advisor-a@global-e2e.test', 'OPERATOR', ids.orgA);
  const adminBToken = await login('customer-admin-b@global-e2e.test', 'ADMIN', ids.orgB);
  for (const [type, projectId] of [['PMU', ids.pmu], ['PSI', ids.psi], ['PCA', ids.pca]]) {
    const result = await exportPdf(projectId, type, advisorToken);
    const file = join(evidenceRoot, `${type.toLowerCase()}-fr.pdf`);
    if (result.status >= 200 && result.status < 300) await writeFile(file, result.bytes);
    report.exports.push({ type, language: 'fr', status: result.status, mime: result.headers['content-type'], bytes: result.bytes.length, sha256: sha256(result.bytes), file });
  }
  const english = await exportPdf(ids.pmu, 'PMU', advisorToken, 'en');
  const englishFile = join(evidenceRoot, 'pmu-en.pdf');
  if (english.status >= 200 && english.status < 300) await writeFile(englishFile, english.bytes);
  report.exports.push({ type: 'PMU', language: 'en', status: english.status, mime: english.headers['content-type'], bytes: english.bytes.length, sha256: sha256(english.bytes), file: englishFile });
  const preview = await exportPdf(ids.pmu, 'PMU', advisorToken, 'fr', true);
  const previewFile = join(evidenceRoot, 'pmu-fr-preview.pdf');
  if (preview.status >= 200 && preview.status < 300) await writeFile(previewFile, preview.bytes);
  report.exports.push({ type: 'PMU_PREVIEW', language: 'fr', status: preview.status, mime: preview.headers['content-type'], bytes: preview.bytes.length, sha256: sha256(preview.bytes), file: previewFile });

  const source = await prisma.document.findFirstOrThrow({ where: { projectId: ids.pmu } });
  await seedVariant(ids.draft, 'DRAFT', true, source.content);
  await seedVariant(ids.archived, 'ARCHIVED', true, source.content);
  await seedVariant(ids.inactive, 'IN_PROGRESS', false, source.content);
  const cases = [
    ['anonymous', await exportPdf(ids.pmu, 'PMU', null)],
    ['cross-tenant', await exportPdf(ids.pmu, 'PMU', adminBToken)],
    ['draft-non-preview', await exportPdf(ids.draft, 'PMU', advisorToken, 'fr', false)],
    ['archived-regeneration', await exportPdf(ids.archived, 'PMU', advisorToken, 'fr', false)],
    ['inactive-regeneration', await exportPdf(ids.inactive, 'PMU', advisorToken, 'fr', false)],
  ];
  report.security.push(...cases.map(([name, value]) => ({ name, status: value.status, bytes: value.bytes.length, mime: value.headers['content-type'] })));

  const passwordHash = await bcrypt.hash(secrets.syntheticPassword, 10);
  for (const [id, email] of [[ids.unassigned, 'pdf-unassigned@global-e2e.test'], [ids.deactivated, 'pdf-deactivated@global-e2e.test']]) {
    await prisma.user.upsert({ where: { id }, update: { isActive: true, password: passwordHash }, create: { id, email, password: passwordHash, firstName: 'PDF', lastName: 'Audit', role: 'OPERATOR', organizationId: ids.orgA, isActive: true } });
  }
  const unassignedToken = await login('pdf-unassigned@global-e2e.test', 'OPERATOR', ids.orgA);
  const deactivatedToken = await login('pdf-deactivated@global-e2e.test', 'OPERATOR', ids.orgA);
  await prisma.user.update({ where: { id: ids.deactivated }, data: { isActive: false } });
  for (const [name, token] of [['same-org-unassigned', unassignedToken], ['deactivated-session', deactivatedToken]]) {
    const value = await exportPdf(ids.pmu, 'PMU', token);
    report.security.push({ name, status: value.status, bytes: value.bytes.length, mime: value.headers['content-type'] });
  }

  const beforeAudit = await prisma.auditLog.count({ where: { projectId: ids.pmu, action: 'EXPORT' } });
  const started = Date.now();
  const simultaneous = await Promise.all([exportPdf(ids.pmu, 'PMU', advisorToken), exportPdf(ids.pmu, 'PMU', advisorToken)]);
  const afterAudit = await prisma.auditLog.count({ where: { projectId: ids.pmu, action: 'EXPORT' } });
  report.concurrency.push({ name: 'two-intentional-exports', statuses: simultaneous.map((item) => item.status), hashes: simultaneous.map((item) => sha256(item.bytes)), durationMs: Date.now() - started, auditDelta: afterAudit - beforeAudit });

  const networkContent = structuredClone(source.content);
  const section = networkContent.modules_fr?.[0]?.sections?.[0];
  if (section) section.content = `${section.content || ''}\n\n![controlled synthetic resource](http://pdf-resource-probe:34682/synthetic.png)`;
  await seedVariant(ids.network, 'VALIDATED', true, networkContent);
  const probeBefore = await fetch('http://127.0.0.1:34682/state').then((r) => r.json());
  const networkExport = await exportPdf(ids.network, 'PMU', advisorToken);
  const probeAfter = await fetch('http://127.0.0.1:34682/state').then((r) => r.json());
  report.resourceBoundary = { status: networkExport.status, before: probeBefore, after: probeAfter, internalResourceFetched: probeAfter.imageRequests > probeBefore.imageRequests };

  report.pass = report.exports.every((item) => item.status >= 200 && item.status < 300 && item.mime?.includes('application/pdf'));
  await writeFile(join(evidenceRoot, 'api-audit.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await prisma.user.updateMany({ where: { id: ids.deactivated }, data: { isActive: false } }).catch(() => undefined);
  await adapter.close();
  await prisma.$disconnect();
}
