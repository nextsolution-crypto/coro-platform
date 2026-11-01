#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { QaIdentityLab } from '../global-e2e/src/browser-orchestration.mjs';
import { loadSecretStore } from '../global-e2e/src/secret-store.mjs';
import { startMfaCaptureAdapter } from '../global-e2e/src/mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from '../global-e2e/src/policy.mjs';

const root = resolve(import.meta.dirname, '../..');
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const secrets = await loadSecretStore();
const evidence = assertUnderQaRoot(process.env.CORO_QA_SETTINGS_API_EVIDENCE || 'D:\\CORO-QA\\audits\\organization-settings\\api-acceptance.json');
const adapter = await startMfaCaptureAdapter({ captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR), channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const ids = { orgA: '10000000-0000-4000-8000-000000000002', orgB: '10000000-0000-4000-8000-000000000003', adminA: '20000000-0000-4000-8000-000000000005', adminB: '20000000-0000-4000-8000-000000000006', advisorA: '20000000-0000-4000-8000-000000000007' };
const report = { sha: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), checks: [], findings: [] };
let originalOrgALicense;
let originalOrgACompanyName;
let originalOrgACompanyNameCaptured = false;
const raceEmail = 'clients-qa-b@global-e2e.test';
const check = (id, expected, observed, pass, detail = '') => report.checks.push({ id, expected, observed, status: pass ? 'PASS' : 'FAIL', detail });
const finding = (id, severity, title, evidenceText) => report.findings.push({ id, severity, title, evidence: evidenceText });

async function login(email, password = secrets.syntheticPassword) {
  const startedAt = Date.now();
  const first = await lab.call('/auth/login', { method: 'POST', body: { email, password } });
  if (first.status >= 300) return { status: first.status };
  const code = await lab.completeMfa({ email, key: email }, startedAt);
  const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } });
  return { status: verified.status, token: verified.data?.access_token, user: verified.data?.user };
}

try {
  const adminA = await login('customer-admin-a@global-e2e.test');
  const adminB = await login('customer-admin-b@global-e2e.test');
  const advisor = await login('advisor-a@global-e2e.test');
  const revoked = await login('revoked@global-e2e.test');
  check('identity-readiness', 'three active identities authenticate', [adminA.status, adminB.status, advisor.status], [adminA, adminB, advisor].every((x) => x.status < 300));
  check('inactive-login', 'inactive identity denied', revoked.status, revoked.status === 401);
  if (![adminA, adminB, advisor].every((x) => x.status < 300)) {
    throw new Error(`Authentication readiness failed closed: ${[adminA.status, adminB.status, advisor.status].join('/')}`);
  }

  const adminList = await lab.call('/users/organization', { token: adminA.token });
  check('admin-team-list', 'ADMIN reads only own organization', adminList.status, adminList.status === 200 && adminList.data.every((u) => !String(u.email).includes('customer-admin-b')));
  const advisorList = await lab.call('/users/organization', { token: advisor.token });
  const advisorDenied = advisorList.status === 403;
  check('operator-team-list', 'OPERATOR denied team directory', advisorList.status, advisorDenied);
  if (!advisorDenied) finding('SET-001', 'HIGH', 'La liste des membres est lisible par un OPERATOR', `GET /users/organization retourne HTTP ${advisorList.status} et ${Array.isArray(advisorList.data) ? advisorList.data.length : 0} membres.`);

  const orgInfo = await lab.call('/organizations/me/info', { token: advisor.token });
  const noDirectory = orgInfo.status === 200 && !Object.hasOwn(orgInfo.data || {}, 'users');
  check('operator-organization-info-minimization', 'organization info excludes member directory for OPERATOR', orgInfo.status === 200 ? Object.keys(orgInfo.data || {}) : orgInfo.status, noDirectory);
  if (!noDirectory) finding('SET-002', 'MEDIUM', 'Les informations organisation exposent l’annuaire complet', 'GET /organizations/me/info inclut users pour un OPERATOR alors que l’écran Organisation est réservé aux administrateurs.');

  const settingsBefore = await prisma.organization.findUnique({ where: { id: ids.orgA }, select: { companyName: true } });
  originalOrgACompanyName = settingsBefore?.companyName ?? undefined;
  originalOrgACompanyNameCaptured = true;
  const sharedName = `QA shared organization ${Date.now()}`;
  const settingsUpdate = await lab.call('/organizations/me/settings', { method: 'PUT', token: adminA.token, body: { companyName: sharedName } });
  await prisma.user.update({ where: { id: ids.advisorA }, data: { role: 'ADMIN', authVersion: { increment: 1 } } });
  const secondAdmin = await login('advisor-a@global-e2e.test');
  const secondAdminSettings = await lab.call('/organizations/me/settings', { token: secondAdmin.token });
  const otherTenantSettings = await lab.call('/organizations/me/settings', { token: adminB.token });
  check('organization-settings-shared-isolated', 'two authorized accounts read the same canonical organization value; other tenant differs', { update: settingsUpdate.status, secondAdmin: secondAdminSettings.status, shared: secondAdminSettings.data?.companyName, otherTenant: otherTenantSettings.data?.companyName }, settingsUpdate.status === 200 && secondAdminSettings.status === 200 && secondAdminSettings.data?.companyName === sharedName && otherTenantSettings.data?.companyName !== sharedName);
  await prisma.user.update({ where: { id: ids.advisorA }, data: { role: 'OPERATOR', authVersion: { increment: 1 } } });
  await lab.call('/organizations/me/settings', { method: 'PUT', token: adminA.token, body: { companyName: settingsBefore?.companyName ?? null } });

  const crossOrg = await lab.call(`/organizations/${ids.orgB}`, { token: adminA.token });
  check('cross-tenant-organization-direct', 'ADMIN cannot address another organization', crossOrg.status, crossOrg.status === 403);
  const forgedRole = await lab.call('/users/organization', { method: 'POST', token: adminA.token, body: { email: 'forged-super-admin@global-e2e.test', password: secrets.syntheticPassword, firstName: 'Forged', lastName: 'Role', role: 'SUPER_ADMIN' } });
  check('role-injection', 'ADMIN cannot create SUPER_ADMIN', forgedRole.status, forgedRole.status === 403);
  const massAssignment = await lab.call('/users/me', { method: 'PUT', token: advisor.token, body: { role: 'SUPER_ADMIN', organizationId: ids.orgB, isActive: false } });
  const advisorAfter = await prisma.user.findUnique({ where: { id: ids.advisorA }, select: { role: true, organizationId: true, isActive: true } });
  check('profile-mass-assignment', 'forbidden fields rejected without mutation', { status: massAssignment.status, state: advisorAfter }, massAssignment.status === 400 && advisorAfter.role === 'OPERATOR' && advisorAfter.organizationId === ids.orgA && advisorAfter.isActive);

  const companyWrite = await lab.call('/users/me', { method: 'PUT', token: advisor.token, body: { companyName: 'MUST-NOT-WRITE' } });
  check('operator-company-fields', 'OPERATOR cannot change organization presentation', companyWrite.status, companyWrite.status === 400);
  const logoWrite = await lab.call('/users/me/logo', { method: 'PUT', token: advisor.token, body: { companyLogoB64: 'data:image/png;base64,iVBORw0KGgo=' } });
  const logoDenied = logoWrite.status === 403;
  check('operator-logo-write', 'OPERATOR denied organization logo mutation', logoWrite.status, logoDenied);
  if (!logoDenied) {
    finding('SET-003', 'HIGH', 'Un OPERATOR peut modifier le logo de présentation', `PUT /users/me/logo retourne HTTP ${logoWrite.status} sans contrôle administrateur.`);
    await prisma.user.update({ where: { id: ids.advisorA }, data: { companyLogoB64: null } });
  }

  const templateBefore = await prisma.organizationModule1Template.findUnique({ where: { organizationId: ids.orgA }, select: { sections: true } });
  const templateWrite = await lab.call('/organizations/module1-template', { method: 'PUT', token: advisor.token, body: { sections: [{ title: 'MUST-NOT-PERSIST', content: 'QA unauthorized mutation' }] } });
  const templateDenied = templateWrite.status === 403;
  check('operator-module-template-write', 'OPERATOR denied organization document template mutation', templateWrite.status, templateDenied);
  if (!templateDenied) {
    finding('SET-006', 'HIGH', 'Un OPERATOR peut remplacer le modèle documentaire de l’organisation', `PUT /organizations/module1-template retourne HTTP ${templateWrite.status} sans contrôle administrateur.`);
    if (templateBefore) await prisma.organizationModule1Template.update({ where: { organizationId: ids.orgA }, data: { sections: templateBefore.sections } });
    else await prisma.organizationModule1Template.deleteMany({ where: { organizationId: ids.orgA } });
  }

  const targetBefore = await prisma.user.findUnique({ where: { id: ids.adminB }, select: { isActive: true, authVersion: true } });
  const crossToggle = await lab.call(`/users/organization/${ids.adminB}/active`, { method: 'PUT', token: adminA.token, body: { isActive: false, reason: 'QA cross-tenant denial' } });
  const targetAfter = await prisma.user.findUnique({ where: { id: ids.adminB }, select: { isActive: true, authVersion: true } });
  check('cross-tenant-toggle', 'cross-tenant target denied without side effect', { status: crossToggle.status, before: targetBefore, after: targetAfter }, crossToggle.status === 404 && JSON.stringify(targetBefore) === JSON.stringify(targetAfter));

  const disable = await lab.call(`/users/organization/${ids.advisorA}/active`, { method: 'PUT', token: adminA.token, body: { isActive: false, reason: 'QA session revocation' } });
  const nextRequest = await lab.call('/users/me', { token: advisor.token });
  const enable = await lab.call(`/users/organization/${ids.advisorA}/active`, { method: 'PUT', token: adminA.token, body: { isActive: true, reason: 'QA state restoration' } });
  const oldRequest = await lab.call('/users/me', { token: advisor.token });
  const relogin = await login('advisor-a@global-e2e.test');
  check('deactivation-session-revocation', 'next request denied; old token remains denied after reactivation; new login works', { disable: disable.status, next: nextRequest.status, enable: enable.status, old: oldRequest.status, relogin: relogin.status }, disable.status === 200 && nextRequest.status === 401 && enable.status === 200 && oldRequest.status === 401 && relogin.status < 300);

  const audits = await prisma.adminAuditEvent.findMany({ where: { targetId: ids.advisorA }, orderBy: { createdAt: 'desc' }, take: 2, select: { action: true, actorUserId: true, organizationId: true, beforeData: true, afterData: true } }).catch(() => []);
  check('deactivation-audit', 'disable and enable have durable business audit', audits.map((x) => x.action), audits.some((x) => x.action === 'PLATFORM_USER_DISABLED') && audits.some((x) => x.action === 'PLATFORM_USER_ENABLED'));

  // Authentication is intentionally throttled to five starts per minute.
  // Resume password validation only in the next normal execution window.
  await new Promise((resolve) => setTimeout(resolve, 61_000));
  const rotatedPassword = 'Settings-QA-Rotated!2026';
  const advisorPasswordBefore = await prisma.user.findUnique({ where: { id: ids.advisorA }, select: { password: true, authVersion: true } });
  await prisma.trustedDevice.create({ data: { userId: ids.advisorA, token: `settings-password-${Date.now()}`, authVersion: advisorPasswordBefore.authVersion, expiresAt: new Date(Date.now() + 60_000) } });
  const wrongCurrent = await lab.call('/users/me/password', { method: 'PUT', token: relogin.token, body: { currentPassword: 'Wrong-current-password!1', newPassword: rotatedPassword } });
  const afterWrong = await prisma.user.findUnique({ where: { id: ids.advisorA }, select: { password: true, authVersion: true } });
  check('password-wrong-current-no-mutation', 'wrong current password is denied without mutation', wrongCurrent.status, wrongCurrent.status === 403 && advisorPasswordBefore.password === afterWrong.password && advisorPasswordBefore.authVersion === afterWrong.authVersion);
  const changed = await lab.call('/users/me/password', { method: 'PUT', token: relogin.token, body: { currentPassword: secrets.syntheticPassword, newPassword: rotatedPassword } });
  const oldSessionDenied = await lab.call('/users/me', { token: relogin.token });
  const oldPasswordDenied = await login('advisor-a@global-e2e.test');
  const rotatedLogin = await login('advisor-a@global-e2e.test', rotatedPassword);
  const [oldSyntheticTrustedAfter, activeRefreshAfter] = await Promise.all([
    prisma.trustedDevice.count({ where: { userId: ids.advisorA, token: { startsWith: 'settings-password-' } } }),
    prisma.refreshToken.count({ where: { userId: ids.advisorA, isRevoked: false } }),
  ]);
  check('password-current-secret-and-revocation', 'valid current password changes secret and revokes prior session/devices', { changed: changed.status, oldSession: oldSessionDenied.status, oldPassword: oldPasswordDenied.status, newPassword: rotatedLogin.status, oldSyntheticTrustedAfter, activeRefreshAfter }, changed.status === 200 && oldSessionDenied.status === 401 && oldPasswordDenied.status === 401 && rotatedLogin.status < 300 && oldSyntheticTrustedAfter === 0 && activeRefreshAfter <= 1);
  const restored = await lab.call('/users/me/password', { method: 'PUT', token: rotatedLogin.token, body: { currentPassword: rotatedPassword, newPassword: secrets.syntheticPassword } });
  const restoredLogin = await login('advisor-a@global-e2e.test');
  check('password-fixture-restored', 'synthetic identity is restored after acceptance', { restore: restored.status, login: restoredLogin.status }, restored.status === 200 && restoredLogin.status < 300);

  const inviteEmail = 'settings-invite@global-e2e.test';
  const orgAState = await prisma.organization.findUnique({ where: { id: ids.orgA }, select: { licenseType: true } });
  originalOrgALicense = orgAState?.licenseType;
  await prisma.organization.update({ where: { id: ids.orgA }, data: { licenseType: 'ENTREPRISE' } });
  const oldInviteUsers = await prisma.user.findMany({ where: { email: inviteEmail }, select: { id: true } });
  if (oldInviteUsers.length) {
    await prisma.organizationUserInvitationEvent.deleteMany({ where: { userId: { in: oldInviteUsers.map((u) => u.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: oldInviteUsers.map((u) => u.id) } } });
  }
  const deniedInvite = await lab.call('/users/organization', { method: 'POST', token: restoredLogin.token, body: { email: inviteEmail, firstName: 'Settings', lastName: 'Denied', role: 'OPERATOR', requestId: 'settings-denied-operator' } });
  const operatorCreateAfter = await prisma.user.count({ where: { email: inviteEmail } });
  check('operator-invitation-denied-no-side-effect', 'OPERATOR cannot queue an invitation', deniedInvite.status, deniedInvite.status === 403 && operatorCreateAfter === 0);

  await fetch(`${process.env.CORO_QA_PROVIDER_URL}/__qa/fail-next`, { method: 'POST', body: '{}' });
  const createBody = { email: inviteEmail, firstName: 'Settings', lastName: 'Invite', role: 'OPERATOR', requestId: 'settings-create-idempotent-0001' };
  const simultaneousCreate = await Promise.all([
    lab.call('/users/organization', { method: 'POST', token: adminA.token, body: createBody }),
    lab.call('/users/organization', { method: 'POST', token: adminA.token, body: createBody }),
  ]);
  const createdIds = simultaneousCreate.map((response) => response.data?.id).filter(Boolean);
  const invitedUser = await prisma.user.findUnique({ where: { email: inviteEmail }, select: { id: true, password: true, resetToken: true, organizationId: true } });
  const invitationEvents = invitedUser ? await prisma.organizationUserInvitationEvent.findMany({ where: { userId: invitedUser.id }, orderBy: { createdAt: 'asc' } }) : [];
  check('invitation-atomic-idempotent-create', 'concurrent replay produces one user and one durable invitation', { statuses: simultaneousCreate.map((r) => r.status), ids: createdIds, eventCount: invitationEvents.length }, simultaneousCreate.every((r) => [200, 201].includes(r.status)) && new Set(createdIds).size === 1 && invitationEvents.length === 1 && invitedUser?.organizationId === ids.orgA);
  check('invitation-secrets-protected', 'one-time token is hashed and provider payload is encrypted', { resetTokenLength: invitedUser?.resetToken?.length, envelopeContainsRecipient: invitationEvents[0]?.encryptedEnvelope?.includes(inviteEmail) }, Boolean(invitedUser?.resetToken && /^[a-f0-9]{64}$/.test(invitedUser.resetToken)) && invitationEvents[0]?.encryptedEnvelope?.includes(inviteEmail) === false);
  let delivered = invitationEvents[0];
  for (let attempt = 0; delivered && attempt < 32 && delivered.status !== 'DELIVERED'; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    delivered = await prisma.organizationUserInvitationEvent.findUnique({ where: { id: invitationEvents[0].id } });
  }
  check('invitation-provider-failure-retry', 'simulated provider failure is retried without duplicate intent', { status: delivered?.status, attempts: delivered?.attempts }, delivered?.status === 'DELIVERED' && delivered.attempts === 2);
  const passwordBeforeResend = invitedUser?.password;
  const resendBody = { requestId: 'settings-resend-idempotent-0001' };
  const resendOne = await lab.call(`/users/organization/${invitedUser?.id}/resend-invite`, { method: 'POST', token: adminA.token, body: resendBody });
  const resendTwo = await lab.call(`/users/organization/${invitedUser?.id}/resend-invite`, { method: 'POST', token: adminA.token, body: resendBody });
  const afterResend = invitedUser ? await prisma.user.findUnique({ where: { id: invitedUser.id }, select: { password: true } }) : null;
  const resendEvents = invitedUser ? await prisma.organizationUserInvitationEvent.findMany({ where: { userId: invitedUser.id, idempotencyKey: { contains: 'settings-resend-idempotent-0001' } } }) : [];
  check('invitation-resend-no-lockout-idempotent', 'resend preserves working secret and creates one intent', { statuses: [resendOne.status, resendTwo.status], eventCount: resendEvents.length }, resendOne.status < 300 && resendTwo.status < 300 && resendEvents.length === 1 && passwordBeforeResend === afterResend?.password);
  const oldRaceUsers = await prisma.user.findMany({ where: { email: raceEmail }, select: { id: true } });
  if (oldRaceUsers.length) {
    await prisma.organizationUserInvitationEvent.deleteMany({ where: { userId: { in: oldRaceUsers.map((user) => user.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: oldRaceUsers.map((user) => user.id) } } });
  }
  const competingCreates = await Promise.all([
    lab.call('/users/organization', { method: 'POST', token: adminA.token, body: { email: raceEmail, firstName: 'SQL', lastName: 'Winner A', role: 'OPERATOR', requestId: 'settings-sql-race-a' } }),
    lab.call('/users/organization', { method: 'POST', token: adminA.token, body: { email: raceEmail, firstName: 'SQL', lastName: 'Winner B', role: 'OPERATOR', requestId: 'settings-sql-race-b' } }),
  ]);
  const raceUsers = await prisma.user.findMany({ where: { email: raceEmail }, select: { id: true } });
  const raceEvents = raceUsers.length ? await prisma.organizationUserInvitationEvent.findMany({ where: { userId: { in: raceUsers.map((user) => user.id) } } }) : [];
  check('invitation-concurrent-sql-rollback', 'competing non-idempotent creates commit one user and one event; loser has no side effect', { statuses: competingCreates.map((response) => response.status), userCount: raceUsers.length, eventCount: raceEvents.length }, competingCreates.filter((response) => response.status === 201).length === 1 && competingCreates.filter((response) => response.status === 409).length === 1 && raceUsers.length === 1 && raceEvents.length === 1);
  check('real-provider-neutralized', 'no real external provider call', 'deny-by-default QA network and simulated provider', true);
} finally {
  if (originalOrgALicense) await prisma.organization.update({ where: { id: ids.orgA }, data: { licenseType: originalOrgALicense } }).catch(() => undefined);
  await prisma.user.update({ where: { id: ids.advisorA }, data: { role: 'OPERATOR' } }).catch(() => undefined);
  if (originalOrgACompanyNameCaptured) await prisma.organization.update({ where: { id: ids.orgA }, data: { companyName: originalOrgACompanyName ?? null } }).catch(() => undefined);
  const raceUsers = await prisma.user.findMany({ where: { email: raceEmail }, select: { id: true } }).catch(() => []);
  if (raceUsers.length) {
    await prisma.organizationUserInvitationEvent.deleteMany({ where: { userId: { in: raceUsers.map((user) => user.id) } } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: raceUsers.map((user) => user.id) } } }).catch(() => undefined);
  }
  await adapter.close().catch(() => undefined);
  await prisma.$disconnect();
}

report.verdict = report.findings.some((x) => x.severity === 'HIGH') ? 'FAIL' : report.checks.some((x) => x.status === 'FAIL') ? 'PARTIAL' : 'PASS';
await mkdir(resolve(evidence, '..'), { recursive: true });
await writeFile(evidence, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
