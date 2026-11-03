#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';

const root = resolve(import.meta.dirname, '../../..');
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const secrets = await loadSecretStore();
const evidenceRoot = assertUnderQaRoot(process.env.CORO_QA_INCIDENT_CAPABILITIES_EVIDENCE || 'D:\\CORO-QA\\tracking\\client-incident-capabilities');
await mkdir(evidenceRoot, { recursive: true });
const adapter = await startMfaCaptureAdapter({ captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR), channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const ids = {
  org: '10000000-0000-4000-8000-000000000002',
  building: '40000000-0000-4000-8000-000000000001',
  clientUser: '70000000-0000-4000-8000-000000000004',
  incident: 'incident-capabilities-qa-exercise',
};
const checks = [];
const check = (id, pass, detail) => checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
let originalPermissions;

async function setAuthority(permissions) {
  await prisma.$transaction(async (tx) => {
    await tx.clientUser.update({ where: { id: ids.clientUser }, data: { incidentPermissions: permissions } });
    await tx.incidentAuthorityAssignment.deleteMany({ where: { incidentEventId: ids.incident, subjectType: 'CLIENT_USER', subjectId: ids.clientUser } });
    if (permissions.length) await tx.incidentAuthorityAssignment.create({ data: { organizationId: ids.org, buildingId: ids.building, incidentEventId: ids.incident, subjectType: 'CLIENT_USER', subjectId: ids.clientUser, operationalRole: 'QA_CAPABILITY', permissions, grantedByType: 'SYSTEM', grantedById: 'qa-fixture', grantReason: 'Synthetic capability acceptance' } });
  });
}

async function snapshot(page) {
  return page.evaluate(() => ({
    commandButtons: [...document.querySelectorAll('button')].filter((button) => /contenir|résoudre/i.test(button.textContent || '')).length,
    saveRex: [...document.querySelectorAll('button')].some((button) => /sauvegarder le rex/i.test(button.textContent || '')),
    readOnlyRex: [...document.querySelectorAll('textarea')].filter((field) => field.id !== 'incident-closing-reason').every((field) => field.readOnly),
    readOnlyMessage: /consultation en lecture seule/i.test(document.body.innerText),
    rexReadOnlyMessage: /rex en lecture seule/i.test(document.body.innerText),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
}

try {
  const identity = await prisma.clientUser.findUniqueOrThrow({ where: { id: ids.clientUser }, select: { incidentPermissions: true } });
  originalPermissions = identity.incidentPermissions;
  await prisma.incidentAuthorityAssignment.deleteMany({ where: { incidentEventId: ids.incident } });
  await prisma.incidentEvent.deleteMany({ where: { id: ids.incident } });
  await prisma.incidentEvent.create({ data: { id: ids.incident, organizationId: ids.org, buildingId: ids.building, type: 'OTHER', status: 'ACTIVE', isActive: true, isExercise: true, triggeredBy: 'QA synthétique', description: 'Exercise capability acceptance', occupantsSnapshot: [], teamSnapshot: [] } });
  await setAuthority(['INCIDENT_READ']);

  const session = await lab.loginAs('clientLocalA');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.goto(lab.portalUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user }) => { localStorage.setItem('coro_client_token', token); localStorage.setItem('coro_client_user', JSON.stringify(user)); }, { token: session.token, user: session.user });
  const route = `${lab.portalUrl}/sentinelle/${ids.building}/incidents/${ids.incident}`;

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(route, { waitUntil: 'networkidle0' });
  const readOnlyDesktop = await snapshot(page);
  check('read-only-desktop', readOnlyDesktop.commandButtons === 0 && !readOnlyDesktop.saveRex && readOnlyDesktop.readOnlyRex && readOnlyDesktop.readOnlyMessage && readOnlyDesktop.rexReadOnlyMessage && !readOnlyDesktop.overflow, JSON.stringify(readOnlyDesktop));
  await page.screenshot({ path: join(evidenceRoot, 'read-only-desktop.png'), fullPage: true });

  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle0' });
  const readOnlyMobile = await snapshot(page);
  check('read-only-mobile', readOnlyMobile.commandButtons === 0 && readOnlyMobile.readOnlyRex && !readOnlyMobile.overflow, JSON.stringify(readOnlyMobile));
  await page.screenshot({ path: join(evidenceRoot, 'read-only-mobile.png'), fullPage: true });

  await setAuthority(['INCIDENT_READ', 'INCIDENT_SUPERVISE']);
  await page.reload({ waitUntil: 'networkidle0' });
  const supervise = await snapshot(page);
  check('supervise-only', supervise.commandButtons === 0 && supervise.saveRex && !supervise.readOnlyRex, JSON.stringify(supervise));

  await setAuthority(['INCIDENT_READ', 'INCIDENT_COMMAND']);
  await page.reload({ waitUntil: 'networkidle0' });
  const command = await snapshot(page);
  check('command-only', command.commandButtons === 2 && !command.saveRex && command.readOnlyRex, JSON.stringify(command));

  const baseline = await prisma.incidentEvent.findUniqueOrThrow({ where: { id: ids.incident }, select: { status: true, lockVersion: true } });
  await setAuthority(['INCIDENT_READ']);
  const directDenial = await lab.call(`/client-portal/incidents/${ids.incident}/contain`, { method: 'PUT', token: session.token, body: { lockVersion: baseline.lockVersion } });
  check('revocation-server-denial', [401, 403, 404].includes(directDenial.status), `HTTP ${directDenial.status}`);
  const denialResponse = page.waitForResponse((response) => response.url().includes(`/client-portal/incidents/${ids.incident}/contain`), { timeout: 12_000 });
  const transitionClicked = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) => /contenir/i.test(candidate.textContent || ''));
    if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
    button.click();
    return true;
  });
  if (!transitionClicked) throw new Error('Synthetic command control was not available before revocation test.');
  const browserDenial = await denialResponse;
  check('revocation-browser-http', [401, 403, 404].includes(browserDenial.status()), `HTTP ${browserDenial.status()}`);
  await page.waitForSelector('[role="alert"]', { timeout: 12_000 });
  const revoked = await snapshot(page);
  const after = await prisma.incidentEvent.findUniqueOrThrow({ where: { id: ids.incident }, select: { status: true, lockVersion: true } });
  check('revocation-after-load', revoked.commandButtons === 0 && baseline.status === after.status && baseline.lockVersion === after.lockVersion, JSON.stringify({ revoked, baseline, after }));

  const detail = await lab.call(`/client-portal/incidents/${ids.incident}/detail`, { token: session.token });
  check('api-capabilities', detail.status === 200 && detail.data?.capabilities?.canRead === true && detail.data?.capabilities?.canCommand === false && detail.data?.capabilities?.canSupervise === false, `HTTP ${detail.status}`);
  await context.close();
} finally {
  if (originalPermissions) await prisma.clientUser.update({ where: { id: ids.clientUser }, data: { incidentPermissions: originalPermissions } }).catch(() => undefined);
  await prisma.incidentAuthorityAssignment.deleteMany({ where: { incidentEventId: ids.incident } }).catch(() => undefined);
  await prisma.incidentEvent.deleteMany({ where: { id: ids.incident } }).catch(() => undefined);
  await writeFile(join(evidenceRoot, 'acceptance.json'), `${JSON.stringify({ sourceHead: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), checks, verdict: checks.every((item) => item.status === 'PASS') ? 'PASS' : 'FAIL' }, null, 2)}\n`);
  await browser.close().catch(() => undefined);
  await adapter.close().catch(() => undefined);
  await prisma.$disconnect();
}

if (checks.some((item) => item.status !== 'PASS')) process.exitCode = 1;
console.log(JSON.stringify({ checks, verdict: checks.every((item) => item.status === 'PASS') ? 'PASS' : 'FAIL' }, null, 2));
