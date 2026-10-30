#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';

const secrets = await loadSecretStore();
const output = assertUnderQaRoot(process.env.CORO_QA_BUILDINGS_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-buildings\\api-acceptance.json');
const adapter = await startMfaCaptureAdapter({ captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR), channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(resolve(root, 'coro-backend/package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const report = { sha: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), checks: [], limitations: [] };
const check = (id, pass, detail) => report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const ids = { orgA: '10000000-0000-4000-8000-000000000002', orgB: '10000000-0000-4000-8000-000000000003', clientA: '30000000-0000-4000-8000-000000000001', buildingA: '40000000-0000-4000-8000-000000000001', buildingB: '40000000-0000-4000-8000-000000000002' };
const adminLogin = async (email) => {
  const startedAt = Date.now();
  const first = await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } });
  const code = await lab.completeMfa({ email, key: email }, startedAt);
  const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } });
  if (first.status >= 300 || verified.status >= 300) throw new Error(`Internal login failed for ${email}`);
  return verified.data.access_token;
};

try {
  const [adminA, adminB, advisor, corporateA, localA, zeroA, corporateB] = await Promise.all([
    adminLogin('customer-admin-a@global-e2e.test'), adminLogin('customer-admin-b@global-e2e.test'), lab.loginAs('advisor'), lab.loginAs('clientCorporateA'), lab.loginAs('clientLocalA'), lab.loginAs('clientWithoutBuildings'), lab.loginAs('clientOrganizationB'),
  ]);
  const anonymous = await fetch(`${process.env.CORO_QA_BACKEND_URL}/buildings/${ids.buildingA}/projects`);
  check('anonymous-denied', anonymous.status === 401, `HTTP ${anonymous.status}`);
  const operatorCreate = await lab.call('/buildings', { method: 'POST', token: advisor.token, headers: { 'Idempotency-Key': 'building-operator-denied' }, body: { name: 'Denied', address: '1 QA', city: 'Montréal', province: 'QC', clientId: ids.clientA } });
  check('operator-create-denied', operatorCreate.status === 403, `HTTP ${operatorCreate.status}`);
  const crossTenantRead = await lab.call(`/buildings/${ids.buildingA}`, { token: adminB });
  check('cross-tenant-direct-read-denied', [403, 404].includes(crossTenantRead.status), `HTTP ${crossTenantRead.status}`);
  const crossTenantProjects = await lab.call(`/buildings/${ids.buildingA}/projects`, { token: adminB });
  check('cross-tenant-projects-denied', [403, 404].includes(crossTenantProjects.status), `HTTP ${crossTenantProjects.status}`);
  const assignedProjects = await lab.call(`/buildings/${ids.buildingA}/projects`, { token: advisor.token });
  check('assigned-operator-projects', assignedProjects.status === 200 && Array.isArray(assignedProjects.data) && assignedProjects.data.some((p) => p.id === '50000000-0000-4000-8000-000000000001') && !assignedProjects.data.some((p) => p.id === '50000000-0000-4000-8000-000000000003'), `HTTP ${assignedProjects.status}; count ${assignedProjects.data?.length ?? 0}`);
  const malicious = await lab.call('/buildings', { method: 'POST', token: adminA, headers: { 'Idempotency-Key': 'building-malicious-payload' }, body: { name: 'Malicious', address: '2 QA', city: 'Montréal', province: 'QC', clientId: ids.clientA, organizationId: ids.orgB, isActive: false, role: 'SUPER_ADMIN' } });
  check('dto-forbidden-properties', malicious.status === 400, `HTTP ${malicious.status}`);
  const key = 'building-qa-create-0001';
  const body = { name: 'Bâtiment intégrité QA', address: '3 Rue Synthétique', city: 'Montréal', province: 'QC', clientId: ids.clientA, timeZone: 'America/Toronto' };
  const [createdA, createdB] = await Promise.all([lab.call('/buildings', { method: 'POST', token: adminA, headers: { 'Idempotency-Key': key }, body }), lab.call('/buildings', { method: 'POST', token: adminA, headers: { 'Idempotency-Key': key }, body })]);
  const createdId = createdA.data?.id ?? createdB.data?.id;
  check('concurrent-idempotent-create', [createdA.status, createdB.status].every((s) => [200, 201].includes(s)) && createdA.data?.id === createdB.data?.id, `HTTP ${createdA.status}/${createdB.status}; id ${createdId}`);
  const replay = await lab.call('/buildings', { method: 'POST', token: adminA, headers: { 'Idempotency-Key': key }, body });
  check('lost-response-replay', replay.data?.id === createdId, `HTTP ${replay.status}; same=${replay.data?.id === createdId}`);
  const conflict = await lab.call('/buildings', { method: 'POST', token: adminA, headers: { 'Idempotency-Key': key }, body: { ...body, name: 'Different payload' } });
  check('idempotency-conflict', conflict.status === 409, `HTTP ${conflict.status}`);
  const persisted = await prisma.building.count({ where: { id: createdId } });
  const audits = await prisma.adminAuditEvent.count({ where: { targetType: 'Building', targetId: createdId, action: 'BUILDING_CREATED' } });
  check('atomic-building-and-audit', persisted === 1 && audits === 1, `building/audit=${persisted}/${audits}`);
  const portalCorporateList = await lab.call('/client-portal/buildings', { token: corporateA.token });
  const portalLocalList = await lab.call('/client-portal/buildings', { token: localA.token });
  const portalZeroList = await lab.call('/client-portal/buildings', { token: zeroA.token });
  const portalOtherTenant = await lab.call(`/client-portal/buildings/${ids.buildingA}`, { token: corporateB.token });
  check('corporate-organization-scope', portalCorporateList.status === 200 && portalCorporateList.data.some((b) => b.id === ids.buildingA) && !portalCorporateList.data.some((b) => b.id === ids.buildingB), `HTTP ${portalCorporateList.status}`);
  check('manager-assignment-scope', portalLocalList.status === 200 && portalLocalList.data.every((b) => b.id === ids.buildingA), `count ${portalLocalList.data?.length ?? 0}`);
  check('manager-without-building-empty', portalZeroList.status === 200 && portalZeroList.data.length === 0, `count ${portalZeroList.data?.length ?? 0}`);
  check('portal-cross-tenant-denied', [403, 404].includes(portalOtherTenant.status), `HTTP ${portalOtherTenant.status}`);
  const form = new FormData(); form.set('file', new Blob([Buffer.from('canonical building QA document')], { type: 'text/plain' }), 'building-qa.txt'); form.set('category', 'technical');
  const upload = await fetch(`${process.env.CORO_QA_BACKEND_URL}/buildings/${ids.buildingA}/documents`, { method: 'POST', headers: { Authorization: `Bearer ${advisor.token}` }, body: form });
  const uploadData = await upload.json();
  const content = await fetch(`${process.env.CORO_QA_BACKEND_URL}/client-portal/buildings/${ids.buildingA}/documents/${uploadData.id}/content`, { headers: { Authorization: `Bearer ${corporateA.token}` } });
  const deniedContent = await fetch(`${process.env.CORO_QA_BACKEND_URL}/client-portal/buildings/${ids.buildingA}/documents/${uploadData.id}/content`, { headers: { Authorization: `Bearer ${corporateB.token}` } });
  const bytes = Buffer.from(await content.arrayBuffer());
  check('private-document-roundtrip', upload.status === 201 && content.status === 200 && bytes.equals(Buffer.from('canonical building QA document')), `upload/download ${upload.status}/${content.status}; bytes ${bytes.length}`);
  check('private-document-cross-tenant-zero-bytes', [403, 404].includes(deniedContent.status), `HTTP ${deniedContent.status}; protected body only`);
  const revoked = await lab.loginAs('revokedUser');
  check('revoked-identity-denied', revoked.denied === true, `HTTP ${revoked.status}`);
} finally {
  await Promise.allSettled([adapter.close(), prisma.$disconnect()]);
}
report.pass = report.checks.every((item) => item.status === 'PASS');
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
