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
const captureDirectory = assertUnderQaRoot(process.env.CORO_QA_MFA_DIR);
const output = assertUnderQaRoot(process.env.CORO_QA_CLIENTS_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-clients\\api-acceptance.json');
const adapter = await startMfaCaptureAdapter({ captureDirectory, channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({
  apiUrl: process.env.CORO_QA_BACKEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL,
  frontendUrl: process.env.CORO_QA_FRONTEND_URL, password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken,
});
const repositoryRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(resolve(repositoryRoot, 'coro-backend/package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const report = { sha: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), checks: [] };
const check = (id, pass, detail) => report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const body = { name: 'Client intégrité QA A', contactFirstName: 'Alice', contactLastName: 'Synthétique', contactEmail: 'clients-qa-a@global-e2e.test', city: 'Montréal', province: 'QC' };
const key = 'clients-qa-create-00000001';
const loginInternal = async (email) => {
  const startedAt = Date.now();
  const first = await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } });
  if (first.status >= 300 || !first.data?.mfaRequired) throw new Error(`Password/MFA preflight failed for ${email}: ${first.status}`);
  const code = await lab.completeMfa({ email, key: email }, startedAt);
  const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } });
  if (verified.status >= 300 || verified.data?.user?.role !== 'ADMIN') throw new Error(`ADMIN MFA verification failed for ${email}: ${verified.status}`);
  return { token: verified.data.access_token, refresh: verified.data.refresh_token, user: verified.data.user };
};
const resetSyntheticFixture = async () => {
  const priorUsers = await prisma.clientUser.findMany({ where: { email: body.contactEmail }, select: { id: true, clientId: true } });
  const clientIds = [...new Set(priorUsers.map((row) => row.clientId))];
  if (clientIds.length === 0) return;
  await prisma.$transaction(async (tx) => {
    await tx.clientInvitationEvent.deleteMany({ where: { clientId: { in: clientIds } } });
    await tx.clientProvisioningRequest.deleteMany({ where: { clientId: { in: clientIds } } });
    await tx.clientUser.deleteMany({ where: { id: { in: priorUsers.map((row) => row.id) } } });
    await tx.client.deleteMany({ where: { id: { in: clientIds }, name: { startsWith: 'Client int' } } });
  });
};

try {
  await resetSyntheticFixture();
  const [adminA, adminB, operator] = await Promise.all([loginInternal('customer-admin-a@global-e2e.test'), loginInternal('customer-admin-b@global-e2e.test'), lab.loginAs('advisor')]);
  const denied = await lab.call('/clients', { method: 'POST', token: operator.token, body, headers: { 'Idempotency-Key': 'clients-qa-denied-000001' } });
  check('operator-create-denied', denied.status === 403, `HTTP ${denied.status}`);

  await fetch(`${process.env.CORO_QA_PROVIDER_URL}/__qa/fail-next`, { method: 'POST', body: '{}' });
  const simultaneous = await Promise.all([
    lab.call('/clients', { method: 'POST', token: adminA.token, body, headers: { 'Idempotency-Key': key } }),
    lab.call('/clients', { method: 'POST', token: adminA.token, body, headers: { 'Idempotency-Key': key } }),
  ]);
  const ids = simultaneous.map((item) => item.data?.id).filter(Boolean);
  check('concurrent-idempotent-create', simultaneous.every((item) => [200, 201].includes(item.status)) && new Set(ids).size === 1, `HTTP ${simultaneous.map((item) => item.status).join('/')}; one result`);
  const clientId = ids[0];
  const [clientCount, userCount, requestCount, eventCount] = await Promise.all([
    prisma.client.count({ where: { id: clientId } }), prisma.clientUser.count({ where: { clientId } }),
    prisma.clientProvisioningRequest.count({ where: { clientId } }), prisma.clientInvitationEvent.count({ where: { clientId } }),
  ]);
  check('atomic-persisted-state', [clientCount, userCount, requestCount, eventCount].every((value) => value === 1), `client/user/request/event=${clientCount}/${userCount}/${requestCount}/${eventCount}`);

  const replay = await lab.call('/clients', { method: 'POST', token: adminA.token, body, headers: { 'Idempotency-Key': key } });
  check('lost-response-replay', [200, 201].includes(replay.status) && replay.data?.id === clientId, `HTTP ${replay.status}; same result`);
  const conflict = await lab.call('/clients', { method: 'POST', token: adminA.token, body: { ...body, name: 'Payload incompatible' }, headers: { 'Idempotency-Key': key } });
  check('payload-conflict', conflict.status === 409, `HTTP ${conflict.status}`);
  const collision = await lab.call('/clients', { method: 'POST', token: adminA.token, body: { ...body, name: 'Collision' }, headers: { 'Idempotency-Key': 'clients-qa-collision-0001' } });
  check('client-user-collision', collision.status === 400, `HTTP ${collision.status}`);
  const crossTenant = await lab.call(`/clients/${clientId}`, { method: 'PUT', token: adminB.token, body: { name: 'Forbidden' } });
  check('cross-tenant-update-denied', crossTenant.status === 403, `HTTP ${crossTenant.status}`);
  const updated = await lab.call(`/clients/${clientId}`, { method: 'PUT', token: adminA.token, body: { name: 'Client intégrité QA A modifié' } });
  const readback = await lab.call(`/clients/${clientId}`, { token: adminA.token });
  check('authorized-update-readback', updated.status === 200 && readback.data?.name === 'Client intégrité QA A modifié', `PUT ${updated.status}; GET ${readback.status}`);

  let event;
  for (let attempt = 0; attempt < 32; attempt += 1) {
    event = await prisma.clientInvitationEvent.findFirst({ where: { clientId } });
    if (event?.status === 'DELIVERED') break;
    await new Promise((done) => setTimeout(done, 5_000));
  }
  check('provider-failure-retry', event?.status === 'DELIVERED' && event.attempts === 2, `status ${event?.status}; attempts ${event?.attempts}`);
  check('no-duplicate-invitation', await prisma.clientInvitationEvent.count({ where: { clientId } }) === 1, 'one durable invitation intent');
  const revoked = await lab.loginAs('revokedUser');
  check('revoked-identity-denied', revoked.denied === true, `HTTP ${revoked.status}`);
} finally {
  await Promise.allSettled([adapter.close(), prisma.$disconnect()]);
}
report.pass = report.checks.every((item) => item.status === 'PASS');
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, evidence: output, checks: report.checks }, null, 2));
if (!report.pass) process.exitCode = 1;
