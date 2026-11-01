#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';

const secrets = await loadSecretStore();
const output = assertUnderQaRoot(process.env.CORO_QA_LIBRARY_API_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-library\\api-acceptance.json');
const adapter = await startMfaCaptureAdapter({ captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR), channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const report = { sha: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), checks: [] };
const check = (id, pass, detail) => report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const ids = { projectA: '50000000-0000-4000-8000-000000000001', archivedA: '50000000-0000-4000-8000-000000000002', projectB: '50000000-0000-4000-8000-000000000003', procedure: '83000000-0000-4000-8000-000000000001' };
async function login(email) { const startedAt = Date.now(); const first = await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } }); const code = await lab.completeMfa({ email, key: email }, startedAt); const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } }); if (first.status >= 300 || verified.status >= 300) throw new Error(`Login failed ${email}: ${first.status}/${verified.status}`); return verified.data.access_token; }

try {
  const advisor = await login('advisor-a@global-e2e.test'); const adminB = await login('customer-admin-b@global-e2e.test'); const unassigned = await login('employee-none@global-e2e.test');
  const authorized = await lab.call(`/procedures/project/${ids.projectA}`, { token: advisor }); check('authorized-project-read', authorized.status === 200 && Array.isArray(authorized.data), `HTTP ${authorized.status}`);
  const crossTenant = await lab.call(`/procedures/project/${ids.projectA}`, { token: adminB }); check('cross-tenant-read-denied', [403, 404].includes(crossTenant.status), `HTTP ${crossTenant.status}`);
  const offAssignment = await lab.call(`/procedures/project/${ids.projectA}`, { token: unassigned }); check('off-assignment-read-denied', [403, 404].includes(offAssignment.status), `HTTP ${offAssignment.status}`);
  const marker = `QA-PERSIST-${Date.now()}`; const update = await lab.call(`/procedures/${ids.procedure}/project/${ids.projectA}`, { method: 'PUT', token: advisor, body: { content: { title: marker, documentTypes: ['PMU'] } } }); const persisted = await lab.call(`/procedures/${ids.procedure}?projectId=${ids.projectA}`, { token: advisor }); check('authorized-customization-persisted', update.status === 200 && persisted.status === 200 && persisted.data?.content?.title === marker && persisted.data?.overrideLevel === 'project', `HTTP ${update.status}/${persisted.status}`);
  const archived = await lab.call(`/procedures/${ids.procedure}/project/${ids.archivedA}`, { method: 'PUT', token: advisor, body: { content: { title: 'MUST-NOT-PERSIST' } } }); check('archived-project-mutation-denied', [403, 404].includes(archived.status), `HTTP ${archived.status}`);
  const otherTenantMutation = await lab.call(`/procedures/${ids.procedure}/project/${ids.projectB}`, { method: 'PUT', token: advisor, body: { content: { title: 'MUST-NOT-PERSIST' } } }); check('cross-tenant-mutation-denied', [403, 404].includes(otherTenantMutation.status), `HTTP ${otherTenantMutation.status}`);
  const globalCreate = await lab.call('/library/procedures', { method: 'POST', token: advisor, body: { name: 'MUST-NOT-PERSIST' } }); const globalUpdate = await lab.call('/library/procedures/not-real', { method: 'PUT', token: advisor, body: { name: 'MUST-NOT-PERSIST' } }); check('global-mutations-denied', globalCreate.status === 403 && globalUpdate.status === 403, `HTTP ${globalCreate.status}/${globalUpdate.status}`);
} finally { await adapter.close().catch(() => undefined); }
report.pass = report.checks.every((item) => item.status === 'PASS'); await mkdir(resolve(output, '..'), { recursive: true }); await writeFile(output, `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify(report, null, 2)); if (!report.pass) process.exitCode = 1;
