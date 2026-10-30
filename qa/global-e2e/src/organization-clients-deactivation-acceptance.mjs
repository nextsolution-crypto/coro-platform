#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';

const ids = {
  orgA: '10000000-0000-4000-8000-000000000002', orgB: '10000000-0000-4000-8000-000000000003',
  adminA: '20000000-0000-4000-8000-000000000005', clientA: '30000000-0000-4000-8000-000000000001', clientB: '30000000-0000-4000-8000-000000000002',
  portalCorporateA: '70000000-0000-4000-8000-000000000007', portalZero: '70000000-0000-4000-8000-000000000005', homonym: 'clients-deactivation-homonym-user',
};
const rawMagic = 'a'.repeat(64);
const rawReset = 'r'.repeat(43);
const trustedToken = 'clients-deactivation-trusted-device';
const eventKey = 'clients-deactivation-pending-invitation';
const secrets = await loadSecretStore();
const output = assertUnderQaRoot(process.env.CORO_QA_CLIENTS_DEACTIVATION_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-clients\\deactivation-acceptance.json');
const adapter = await startMfaCaptureAdapter({ captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR), channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const repositoryRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(resolve(repositoryRoot, 'coro-backend/package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const report = { sha: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), checks: [] };
const check = (id, pass, detail) => report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const loginInternal = async (email) => {
  const startedAt = Date.now();
  const first = await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } });
  const code = await lab.completeMfa({ email, key: email }, startedAt);
  const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } });
  if (first.status >= 300 || verified.status >= 300) throw new Error(`Internal login failed for ${email}`);
  return { token: verified.data.access_token, user: verified.data.user };
};

try {
  await prisma.$transaction([
    prisma.client.update({ where: { id: ids.clientA }, data: { isActive: true } }),
    prisma.clientUser.update({ where: { id: ids.portalCorporateA }, data: { isActive: true } }),
    prisma.clientUser.update({ where: { id: ids.portalZero }, data: { isActive: false } }),
    prisma.clientInvitationEvent.deleteMany({ where: { idempotencyKey: eventKey } }),
    prisma.magicLink.deleteMany({ where: { token: createHash('sha256').update(rawMagic).digest('hex') } }),
    prisma.clientPasswordResetToken.deleteMany({ where: { tokenHash: createHash('sha256').update(rawReset).digest('hex') } }),
    prisma.clientTrustedDevice.deleteMany({ where: { token: trustedToken } }),
    prisma.user.deleteMany({ where: { id: ids.homonym } }),
  ]);
  const portalSession = await lab.loginAs('clientCorporateA');
  const adminA = await loginInternal('customer-admin-a@global-e2e.test');
  const adminB = await loginInternal('customer-admin-b@global-e2e.test');
  const operator = await lab.loginAs('advisor');

  const pendingStartedAt = Date.now();
  const pendingLogin = await lab.call('/client-auth/login', { method: 'POST', body: { email: 'portal-corporate-a@global-e2e.test', password: secrets.syntheticPassword } });
  const pendingMfaCode = await lab.completeMfa({ email: 'portal-corporate-a@global-e2e.test', key: 'pending-mfa' }, pendingStartedAt);
  check('mfa-challenge-created-before-suspension', pendingLogin.status === 201 && pendingLogin.data?.mfaRequired, `HTTP ${pendingLogin.status}`);

  const portalBefore = await prisma.clientUser.findUnique({ where: { id: ids.portalCorporateA }, select: { sessionVersion: true, isActive: true } });
  const historyBefore = await prisma.client.findUnique({ where: { id: ids.clientA }, select: { _count: { select: { buildings: true, projects: true, clientUsers: true } } } });
  const auditBefore = await prisma.adminAuditEvent.count({ where: { action: 'CLIENT_DEACTIVATED', targetId: ids.clientA } });
  const providerBefore = await (await fetch(`${process.env.CORO_QA_PROVIDER_URL}/__qa/state`)).json();
  await prisma.$transaction([
    prisma.magicLink.create({ data: { token: createHash('sha256').update(rawMagic).digest('hex'), userId: ids.portalCorporateA, expiresAt: new Date(Date.now() + 900_000) } }),
    prisma.clientPasswordResetToken.create({ data: { tokenHash: createHash('sha256').update(rawReset).digest('hex'), clientUserId: ids.portalCorporateA, expiresAt: new Date(Date.now() + 1_800_000) } }),
    prisma.clientTrustedDevice.create({ data: { token: trustedToken, userId: ids.portalCorporateA, expiresAt: new Date(Date.now() + 86_400_000) } }),
    prisma.clientInvitationEvent.create({ data: { organizationId: ids.orgA, clientId: ids.clientA, clientUserId: ids.portalCorporateA, idempotencyKey: eventKey, recipientHash: '0'.repeat(64), encryptedEnvelope: 'never-decrypted-after-cancellation', encryptionKeyId: 'qa', nextAttemptAt: new Date(Date.now() + 300_000) } }),
    prisma.user.create({ data: { id: ids.homonym, email: 'portal-corporate-a@global-e2e.test', password: 'synthetic-homonym-not-used', firstName: 'Internal', lastName: 'Homonym', role: 'OPERATOR', organizationId: ids.orgA, isActive: true } }),
  ]);

  const deniedOperator = await lab.call(`/clients/${ids.clientA}`, { method: 'DELETE', token: operator.token });
  const deniedTenant = await lab.call(`/clients/${ids.clientA}`, { method: 'DELETE', token: adminB.token });
  const stillActive = await prisma.client.findUnique({ where: { id: ids.clientA }, select: { isActive: true } });
  check('unauthorized-deactivation-no-effect', deniedOperator.status === 403 && deniedTenant.status === 403 && stillActive?.isActive, `operator ${deniedOperator.status}; tenant ${deniedTenant.status}`);

  const concurrent = await Promise.all([
    lab.call(`/clients/${ids.clientA}`, { method: 'DELETE', token: adminA.token }),
    lab.call(`/clients/${ids.clientA}`, { method: 'DELETE', token: adminA.token }),
  ]);
  check('concurrent-idempotent-deactivation', concurrent.every((row) => row.status === 200), `HTTP ${concurrent.map((row) => row.status).join('/')}`);
  const [clientAfter, portalAfter, trustedCount, magic, reset, invitation, auditAfter, homonym, clientB] = await Promise.all([
    prisma.client.findUnique({ where: { id: ids.clientA }, select: { isActive: true, _count: { select: { buildings: true, projects: true, clientUsers: true } } } }),
    prisma.clientUser.findUnique({ where: { id: ids.portalCorporateA }, select: { sessionVersion: true, isActive: true } }),
    prisma.clientTrustedDevice.count({ where: { userId: ids.portalCorporateA } }),
    prisma.magicLink.findUnique({ where: { token: createHash('sha256').update(rawMagic).digest('hex') } }),
    prisma.clientPasswordResetToken.findUnique({ where: { tokenHash: createHash('sha256').update(rawReset).digest('hex') } }),
    prisma.clientInvitationEvent.findUnique({ where: { idempotencyKey: eventKey } }),
    prisma.adminAuditEvent.count({ where: { action: 'CLIENT_DEACTIVATED', targetId: ids.clientA } }),
    prisma.user.findUnique({ where: { id: ids.homonym }, select: { isActive: true, organizationId: true } }),
    prisma.client.findUnique({ where: { id: ids.clientB }, select: { isActive: true } }),
  ]);
  check('atomic-suspension-state', clientAfter?.isActive === false && portalAfter?.isActive === true && portalAfter.sessionVersion === portalBefore.sessionVersion + 1 && trustedCount === 0 && magic?.usedAt && reset?.usedAt && invitation?.status === 'CANCELLED' && auditAfter === auditBefore + 1, `session ${portalBefore.sessionVersion}->${portalAfter?.sessionVersion}; event ${invitation?.status}`);
  check('data-history-preserved', JSON.stringify(clientAfter?._count) === JSON.stringify(historyBefore?._count), JSON.stringify(clientAfter?._count));
  check('homonym-and-other-client-unchanged', homonym?.isActive === true && homonym.organizationId === ids.orgA && clientB?.isActive === true, 'internal User and client B remain active');

  const [oldSession, protectedDownload, pendingMfa, trustedLogin, magicUse, resetUse] = await Promise.all([
    lab.call('/client-auth/me', { token: portalSession.token }),
    lab.call('/project-files/client/file/synthetic-protected-file/content', { token: portalSession.token }),
    lab.call('/client-auth/verify-mfa', { method: 'POST', body: { email: 'portal-corporate-a@global-e2e.test', code: pendingMfaCode } }),
    lab.call('/client-auth/login', { method: 'POST', body: { email: 'portal-corporate-a@global-e2e.test', password: secrets.syntheticPassword, trustedToken } }),
    lab.call('/client-auth/magic-link/validate', { method: 'POST', body: { token: rawMagic } }),
    lab.call('/client-auth/reset-password', { method: 'POST', body: { token: rawReset, newPassword: 'SyntheticReset9!' } }),
  ]);
  check('session-and-download-refused', oldSession.status === 401 && protectedDownload.status === 401, `session ${oldSession.status}; download ${protectedDownload.status}`);
  check('mfa-trusted-links-refused', pendingMfa.status === 401 && trustedLogin.status === 401 && magicUse.status === 401 && resetUse.status === 400, `mfa ${pendingMfa.status}; trusted ${trustedLogin.status}; magic ${magicUse.status}; reset ${resetUse.status}`);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 35_000));
  const providerAfter = await (await fetch(`${process.env.CORO_QA_PROVIDER_URL}/__qa/state`)).json();
  check('pending-invitation-not-sent', providerAfter.requests === providerBefore.requests && (await prisma.clientInvitationEvent.findUnique({ where: { idempotencyKey: eventKey } }))?.status === 'CANCELLED', `provider requests ${providerBefore.requests}->${providerAfter.requests}`);

  // Start the reactivation checks in a normal, separate authentication window.
  // The client login endpoint permits five attempts per 60 seconds; this delay
  // prevents the synthetic matrix itself from evading or weakening that policy.
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 30_000));

  const reactivated = await lab.call(`/clients/${ids.clientA}/reactivate`, { method: 'PUT', token: adminA.token });
  const oldAfterReactivation = await lab.call('/client-auth/me', { token: portalSession.token });
  const newSession = await lab.loginAs('clientCorporateA');
  const individuallyDisabled = await lab.call('/client-auth/login', { method: 'POST', body: { email: 'portal-zero-a@global-e2e.test', password: secrets.syntheticPassword } });
  const magicAfter = await lab.call('/client-auth/magic-link/validate', { method: 'POST', body: { token: rawMagic } });
  check('reactivation-requires-new-authentication', reactivated.status === 200 && oldAfterReactivation.status === 401 && Boolean(newSession.token), `reactivate ${reactivated.status}; old ${oldAfterReactivation.status}`);
  check('old-links-and-individually-disabled-remain-refused', individuallyDisabled.status === 401 && magicAfter.status === 401, `disabled ${individuallyDisabled.status}; magic ${magicAfter.status}`);
  const otherClientSession = await lab.loginAs('clientOrganizationB');
  check('other-client-authentication-unchanged', Boolean(otherClientSession.token), 'customer B portal session issued');
} finally {
  await Promise.allSettled([
    prisma.client.update({ where: { id: ids.clientA }, data: { isActive: true } }),
    prisma.clientUser.update({ where: { id: ids.portalZero }, data: { isActive: true } }),
    prisma.user.deleteMany({ where: { id: ids.homonym } }),
    adapter.close(),
  ]);
  await prisma.$disconnect();
}
report.pass = report.checks.every((item) => item.status === 'PASS');
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, evidence: output, checks: report.checks }, null, 2));
if (!report.pass) process.exitCode = 1;
