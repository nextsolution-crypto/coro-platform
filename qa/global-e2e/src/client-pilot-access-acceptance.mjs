#!/usr/bin/env node
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { actor } from './identity-catalogue.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const output = assertUnderQaRoot(
  process.env.CORO_QA_PILOT_ACCESS_EVIDENCE ||
    'D:\\CORO-QA\\tracking\\client-portal\\pilot-access-acceptance.json',
);
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({
  captureDirectory: process.env.CORO_QA_MFA_DIR,
  channelToken: secrets.mfaChannelToken,
});
const lab = new QaIdentityLab({
  apiUrl: process.env.CORO_QA_BACKEND_URL,
  portalUrl: process.env.CORO_QA_PORTAL_URL,
  frontendUrl: process.env.CORO_QA_PORTAL_URL,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});
const require = createRequire(join(repositoryRoot, 'coro-backend', 'package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ids = Object.freeze({
  orgA: '10000000-0000-4000-8000-000000000002',
  orgB: '10000000-0000-4000-8000-000000000003',
  buildingA: '40000000-0000-4000-8000-000000000001',
  projectA: '50000000-0000-4000-8000-000000000001',
  archivedProjectA: '50000000-0000-4000-8000-000000000002',
  projectB: '50000000-0000-4000-8000-000000000003',
  manager: '70000000-0000-4000-8000-000000000004',
});
const report = { executedAt: new Date().toISOString(), checks: [] };
const check = (id, pass, detail) =>
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const delay = (milliseconds) =>
  new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function loginWithPassword(key, password) {
  const identity = actor(key);
  const startedAt = Date.now();
  const first = await lab.call('/client-auth/login', {
    method: 'POST',
    body: { email: identity.email, password },
  });
  if (first.status >= 300 || !first.data?.mfaRequired) return { ...first, token: null };
  const code = await lab.completeMfa(identity, startedAt);
  const verified = await lab.call('/client-auth/verify-mfa', {
    method: 'POST',
    body: { email: identity.email, code },
  });
  return { ...verified, token: verified.data?.token ?? null };
}

async function counts() {
  const [signatures, comments, bookings, invitations, audits] = await Promise.all([
    prisma.documentSignature.count({
      where: { projectId: { in: [ids.projectA, ids.archivedProjectA] } },
    }),
    prisma.projectComment.count({ where: { projectId: ids.archivedProjectA } }),
    prisma.booking.count({ where: { projectId: ids.archivedProjectA } }),
    prisma.visitorInvitation.count({ where: { organizationId: ids.orgA } }),
    prisma.clientSecurityAuditEvent.count({
      where: { clientUserId: ids.manager, eventType: 'PASSWORD_CHANGED' },
    }),
  ]);
  return { signatures, comments, bookings, invitations, audits };
}

try {
  const manager = await lab.loginAs('clientLocalA');
  const corporate = await lab.loginAs('clientCorporateA');
  const otherTenant = await lab.loginAs('clientOrganizationB');

  for (const [key, session, expectedRestricted] of [
    ['manager', manager, true],
    ['corporate', corporate, true],
    ['outside-pilot', otherTenant, false],
  ]) {
    const policy = await lab.call('/client-portal/pilot-policy', {
      token: session.token,
    });
    check(
      `policy-${key}`,
      policy.status === 200 && policy.data?.restricted === expectedRestricted,
      `HTTP ${policy.status}; restricted=${policy.data?.restricted}`,
    );
  }

  const before = await counts();
  for (const [id, route, method, body] of [
    ['signature', `/client-portal/projects/${ids.projectA}/sign`, 'POST', { fullName: 'Synthetic Pilot' }],
    ['signature-status', `/client-portal/projects/${ids.projectA}/sign-status`, 'GET', undefined],
    ['official-retry', `/client-portal/projects/${ids.projectA}/sign/retry`, 'POST', {}],
    ['official-download', `/client-portal/projects/${ids.projectA}/official/fr`, 'GET', undefined],
    ['invitation', `/client-portal/buildings/${ids.buildingA}/sentinelle/invitations`, 'POST', {
      firstName: 'Synthetic', lastName: 'Visitor', email: 'visitor@global-e2e.test', visitDate: '2026-11-15',
    }],
    ['archived-comment', `/client-portal/projects/${ids.archivedProjectA}/comments`, 'POST', { contenu: 'denied' }],
    ['archived-refusal', `/client-portal/projects/${ids.archivedProjectA}/refuse`, 'POST', { comment: 'denied' }],
    ['archived-booking', `/client-portal/projects/${ids.archivedProjectA}/bookings`, 'POST', {
      activityType: 'visite', duration: 60,
    }],
  ]) {
    const denied = await lab.call(route, { method, token: manager.token, body });
    check(`denial-${id}`, denied.status === 403, `HTTP ${denied.status}`);
  }

  const archivedRead = await lab.call(
    `/client-portal/projects/${ids.archivedProjectA}`,
    { token: manager.token },
  );
  const archivedVersions = await lab.call(
    `/client-portal/projects/${ids.archivedProjectA}/versions`,
    { token: manager.token },
  );
  check(
    'archived-read-preserved',
    archivedRead.status === 200 && archivedRead.data?.id === ids.archivedProjectA,
    `HTTP ${archivedRead.status}`,
  );
  check(
    'archived-versions-preserved',
    archivedVersions.status === 200 && archivedVersions.data?.length === 1,
    `HTTP ${archivedVersions.status}; versions=${archivedVersions.data?.length ?? 0}`,
  );

  const corporateDenied = await lab.call(
    `/client-portal/projects/${ids.archivedProjectA}/comments`,
    { method: 'POST', token: corporate.token, body: { contenu: 'denied' } },
  );
  check('corporate-archived-denial', corporateDenied.status === 403, `HTTP ${corporateDenied.status}`);

  const crossTenant = await lab.call(`/client-portal/projects/${ids.projectB}`, {
    token: manager.token,
  });
  check(
    'cross-tenant-denial',
    [403, 404].includes(crossTenant.status) || crossTenant.data === null || crossTenant.data === '',
    `HTTP ${crossTenant.status}; empty=${crossTenant.data === null || crossTenant.data === ''}`,
  );
  const outsideRead = await lab.call(`/client-portal/projects/${ids.projectB}`, {
    token: otherTenant.token,
  });
  check(
    'outside-pilot-legitimate-read',
    outsideRead.status === 200 && outsideRead.data?.id === ids.projectB,
    `HTTP ${outsideRead.status}`,
  );

  const employee = await lab.call(
    `/client-portal/buildings/${ids.buildingA}/sentinelle/employees`,
    {
      method: 'POST',
      token: manager.token,
      body: {
        firstName: 'Synthetic',
        lastName: 'Local Employee',
        email: 'local-employee@global-e2e.test',
      },
    },
  );
  check(
    'local-employee-preserved-without-external-delivery',
    employee.status === 201 && Boolean(employee.data?.id),
    `HTTP ${employee.status}`,
  );

  const afterDenied = await counts();
  check(
    'denials-no-side-effects',
    JSON.stringify({ ...afterDenied, audits: before.audits }) === JSON.stringify(before),
    'signature/comment/booking/invitation counts unchanged',
  );

  const changedPassword = `${secrets.syntheticPassword}Z9!`;
  const changed = await lab.call('/client-auth/change-password', {
    method: 'PUT',
    token: manager.token,
    body: {
      currentPassword: secrets.syntheticPassword,
      newPassword: changedPassword,
    },
  });
  check(
    'password-change',
    changed.status === 200 && changed.data?.sessionsRevoked === true,
    `HTTP ${changed.status}; sessionsRevoked=${changed.data?.sessionsRevoked}`,
  );
  const oldSession = await lab.call('/client-auth/me', { token: manager.token });
  check('password-old-session-revoked', oldSession.status === 401, `HTTP ${oldSession.status}`);
  const oldPassword = await lab.call('/client-auth/login', {
    method: 'POST',
    body: { email: actor('clientLocalA').email, password: secrets.syntheticPassword },
  });
  check('password-old-secret-denied', oldPassword.status === 401, `HTTP ${oldPassword.status}`);
  const newLogin = await loginWithPassword('clientLocalA', changedPassword);
  check('password-new-secret-login', newLogin.status < 300 && Boolean(newLogin.token), `HTTP ${newLogin.status}`);

  process.stdout.write('QA_AUTH_THROTTLE_WINDOW_WAIT\n');
  await delay(61_000);
  const restored = await lab.call('/client-auth/change-password', {
    method: 'PUT',
    token: newLogin.token,
    body: {
      currentPassword: changedPassword,
      newPassword: secrets.syntheticPassword,
    },
  });
  check('password-fixture-restored', restored.status === 200, `HTTP ${restored.status}`);
  const supersededPassword = await lab.call('/client-auth/login', {
    method: 'POST',
    body: { email: actor('clientLocalA').email, password: changedPassword },
  });
  check('password-superseded-secret-denied', supersededPassword.status === 401, `HTTP ${supersededPassword.status}`);
  const restoredLogin = await loginWithPassword('clientLocalA', secrets.syntheticPassword);
  check('password-restored-login', restoredLogin.status < 300 && Boolean(restoredLogin.token), `HTTP ${restoredLogin.status}`);
  const afterPassword = await counts();
  check(
    'password-audit',
    afterPassword.audits === before.audits + 2,
    `audit events added=${afterPassword.audits - before.audits}`,
  );
} finally {
  await prisma.$disconnect();
  await adapter.close();
}

report.pass = report.checks.every((item) => item.status === 'PASS');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, evidence: output, checks: report.checks }, null, 2));
if (!report.pass) process.exitCode = 1;
