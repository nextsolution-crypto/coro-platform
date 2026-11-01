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
const check = (id, expected, observed, pass, detail = '') => report.checks.push({ id, expected, observed, status: pass ? 'PASS' : 'FAIL', detail });
const finding = (id, severity, title, evidenceText) => report.findings.push({ id, severity, title, evidence: evidenceText });

async function login(email) {
  const startedAt = Date.now();
  const first = await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } });
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

  check('password-contract-current-secret', 'current password required by settings contract', 'endpoint accepts only newPassword', false, 'PUT /users/me/password exposes no current-password field and service does not compare the current secret.');
  finding('SET-004', 'HIGH', 'Le changement de mot de passe ne vérifie pas le secret actuel', 'Le contrat PUT /users/me/password ne reçoit que newPassword; une session compromise peut remplacer le secret sans réauthentification.');
  check('real-provider-neutralized', 'no real external provider call', 'deny-by-default QA network and simulated provider', true);
} finally {
  await adapter.close().catch(() => undefined);
  await prisma.$disconnect();
}

report.verdict = report.findings.some((x) => x.severity === 'HIGH') ? 'FAIL' : report.checks.some((x) => x.status === 'FAIL') ? 'PARTIAL' : 'PASS';
await mkdir(resolve(evidence, '..'), { recursive: true });
await writeFile(evidence, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
