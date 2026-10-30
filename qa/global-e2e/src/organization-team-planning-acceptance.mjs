#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';

const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const evidenceRoot = assertUnderQaRoot(process.env.CORO_QA_PLANNING_EVIDENCE ||
  `D:\\CORO-QA\\audits\\organization-team-planning\\${new Date().toISOString().slice(0, 10)}`);
const backendUrl = process.env.CORO_QA_BACKEND_URL;
const frontendUrl = process.env.CORO_QA_FRONTEND_URL;
const portalUrl = process.env.CORO_QA_PORTAL_URL;
const databasePort = Number(process.env.CORO_QA_DATABASE_PORT || 56471);
const secrets = await loadSecretStore();
const databaseUrl = `postgresql://coro_qa:${encodeURIComponent(secrets.databasePassword)}@127.0.0.1:${databasePort}/coro_qa_global_e2e?schema=public`;
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const adapter = await startMfaCaptureAdapter({ captureDirectory: process.env.CORO_QA_MFA_DIR,
  channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: backendUrl, frontendUrl, portalUrl,
  password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });

const ids = {
  orgA: '10000000-0000-4000-8000-000000000002', orgB: '10000000-0000-4000-8000-000000000003',
  adminA: '20000000-0000-4000-8000-000000000005', adminB: '20000000-0000-4000-8000-000000000006',
  advisorA: '20000000-0000-4000-8000-000000000007', projectA: '50000000-0000-4000-8000-000000000001',
  buildingA: '40000000-0000-4000-8000-000000000001', clientA: '30000000-0000-4000-8000-000000000001',
};
const marker = `PLAN-QA-${Date.now()}`;
const report = { executedAt: new Date().toISOString(), sourceHead: process.env.CORO_QA_SOURCE_HEAD || 'working-tree-candidate',
  marker, checks: [], findings: [], matrix: [], consoleErrors: [], limitations: [] };
const check = (id, pass, detail) => {
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
  if (!pass) throw new Error(`${id}: ${detail}`);
};
const observe = (id, pass, detail) => {
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
};
const rawLogin = async (email) => {
  const startedAt = Date.now();
  const first = await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } });
  check(`password-${email}`, [200, 201].includes(first.status) && first.data?.mfaRequired, `HTTP ${first.status}`);
  const code = await lab.completeMfa({ email, key: email }, startedAt);
  const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } });
  check(`mfa-${email}`, [200, 201].includes(verified.status) && Boolean(verified.data?.access_token), `HTTP ${verified.status}`);
  return { token: verified.data.access_token, refresh: verified.data.refresh_token, user: verified.data.user };
};
const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 },
  { width: 1440, height: 900 }, { width: 2560, height: 1440 }];
const themes = [{ name: 'classic', ui: 'legacy', preference: 'LIGHT' },
  { name: 'glass-light', ui: 'glass', preference: 'LIGHT' },
  { name: 'glass-dark', ui: 'glass', preference: 'DARK' }];
const geometry = () => {
  const controls = [...document.querySelectorAll('button,a,input,select')].filter((node) => {
    const box = node.getBoundingClientRect(); const style = getComputedStyle(node);
    return box.width > 0 && box.height > 0 && style.visibility !== 'hidden';
  }).map((node) => { const box = node.getBoundingClientRect();
    return { tag: node.tagName, left: box.left, right: box.right, top: box.top, bottom: box.bottom }; });
  const pageOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
  return { pageOverflow, outside: controls.filter((box) => box.right > 0 && box.left < innerWidth &&
    (box.left < -1 || box.right > innerWidth + 1)), text: document.body.innerText,
    ui: document.documentElement.dataset.ui, theme: document.documentElement.dataset.theme };
};

let browser; let isolated; let activityId; let bookingId;
try {
  await mkdir(evidenceRoot, { recursive: true });
  await prisma.activityType.upsert({ where: { organizationId_code: { organizationId: ids.orgA, code: 'custom-plan-qa' } },
    update: { isActive: true }, create: { organizationId: ids.orgA, code: 'custom-plan-qa', nameFR: 'Activité QA planification',
      nameEN: 'Planning QA activity', defaultDurationMinutes: 90, clientBookableDefault: true, isActive: true } });
  const activityType = await prisma.activityType.findUnique({ where: { organizationId_code: { organizationId: ids.orgA, code: 'custom-plan-qa' } } });
  const adminA = await rawLogin('customer-admin-a@global-e2e.test');
  await new Promise((resolve) => setTimeout(resolve, 55_000));
  const adminB = await rawLogin('customer-admin-b@global-e2e.test');
  const advisor = await lab.loginAs('advisor');
  const revoked = await lab.loginAs('revokedUser');
  check('inactive-identity-denied', revoked.denied === true && revoked.status >= 400, `HTTP ${revoked.status}`);

  const start = '2026-11-02T14:00:00.000-05:00';
  const end = '2026-11-07T00:00:00.000-05:00';
  const query = `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&displayTimeZone=America%2FToronto`;
  const contextA = await lab.call('/planning/context', { token: adminA.token });
  check('context-tenant-a', contextA.status === 200 && contextA.data.projects.some((row) => row.id === ids.projectA), `HTTP ${contextA.status}`);
  const contextB = await lab.call('/planning/context', { token: adminB.token });
  check('context-cross-tenant-minimized', contextB.status === 200 && !contextB.data.projects.some((row) => row.id === ids.projectA), `HTTP ${contextB.status}`);
  const operatorTeam = await lab.call(`/planning/team${query}`, { token: advisor.token });
  const operatorUserIds = operatorTeam.data?.users?.map((row) => row.id) || [];
  const operatorGenericColleagueEvents = (operatorTeam.data?.events || []).filter((event) =>
    event.userIds?.some((userId) => userId !== ids.advisorA) && event.id?.startsWith('busy:'));
  check('operator-team-tenant-scope', operatorTeam.status === 200 &&
    operatorUserIds.includes(ids.advisorA) && !operatorUserIds.includes(ids.adminB),
  JSON.stringify({ status: operatorTeam.status, userIds: operatorUserIds }));
  check('operator-colleague-data-minimized', operatorGenericColleagueEvents.every((event) =>
    event.status === 'BUSY' && event.label === 'Occupé' && event.bookingId === undefined &&
    event.projectId === undefined && event.projectName === undefined && event.clientName === undefined &&
    event.buildingName === undefined),
  JSON.stringify({ genericColleagueEventCount: operatorGenericColleagueEvents.length }));
  const teamA = await lab.call(`/planning/team${query}`, { token: adminA.token });
  check('admin-team-tenant-scope', teamA.status === 200 && !teamA.data.users.some((row) => row.id === ids.adminB), `HTTP ${teamA.status}`);
  check('capacity-is-explicitly-informational', teamA.data.users.every((row) => row.capacity === undefined || typeof row.capacity === 'object'), 'capacity projection shape');

  const creationRequestId = crypto.randomUUID();
  const creationBody = {
    requestId: creationRequestId, projectId: ids.projectA, activityTypeId: activityType.id,
    customLabel: marker, clientVisible: true, clientBookable: true,
  };
  const created = await lab.call('/planning/activities', { method: 'POST', token: adminA.token, body: creationBody });
  check('create-unplanned-activity-contract', created.status === 201 && created.data.activityId && created.data.id === undefined,
    JSON.stringify({ status: created.status, keys: Object.keys(created.data || {}) }));
  activityId = created.data.activityId;
  const creationReplay = await lab.call('/planning/activities', { method: 'POST', token: adminA.token, body: creationBody });
  check('create-response-loss-retry-idempotent', creationReplay.status === 201 && creationReplay.data.activityId === activityId &&
    await prisma.projectActivity.count({ where: { organizationId: ids.orgA, customLabel: marker } }) === 1,
  JSON.stringify({ status: creationReplay.status, activityId: creationReplay.data?.activityId }));
  const crossTenantPlan = await lab.call(`/planning/activities/${activityId}/plan`, { method: 'POST', token: adminB.token,
    body: { startUtc: '2026-11-03T15:00:00.000Z', durationMinutes: 90, leadUserId: ids.adminB, confirmUnknown: true } });
  check('cross-tenant-direct-plan-denied', [403, 404].includes(crossTenantPlan.status), `HTTP ${crossTenantPlan.status}`);
  const preview = await lab.call('/planning/team-preview', { method: 'POST', token: adminA.token,
    body: { buildingId: ids.buildingA, startUtc: '2026-11-03T15:00:00.000Z', durationMinutes: 90 } });
  check('team-preview-authorized', preview.status === 201 && preview.data.candidates.some((row) => row.userId === ids.advisorA), `HTTP ${preview.status}`);
  const planningRequestId = crypto.randomUUID();
  const planningBody = { requestId: planningRequestId, startUtc: '2026-11-03T15:00:00.000Z', durationMinutes: 90,
    leadUserId: ids.adminA, confirmUnknown: true };
  const planned = await lab.call(`/planning/activities/${activityId}/plan`, { method: 'POST', token: adminA.token,
    body: planningBody });
  check('plan-existing-activity', planned.status === 201 && planned.data.bookingId, `HTTP ${planned.status}`);
  bookingId = planned.data.bookingId;
  const planningReplay = await lab.call(`/planning/activities/${activityId}/plan`, { method: 'POST', token: adminA.token,
    body: planningBody });
  check('plan-response-loss-retry-idempotent', planningReplay.status === 201 && planningReplay.data.bookingId === bookingId &&
    await prisma.booking.count({ where: { activityId } }) === 1,
  JSON.stringify({ status: planningReplay.status, bookingId: planningReplay.data?.bookingId }));
  const persisted = await prisma.booking.findUnique({ where: { id: bookingId }, include: { assignments: true, activity: true } });
  check('canonical-booking-assignment', persisted?.activityId === activityId && persisted.assignments.filter((row) => ['PENDING', 'ACCEPTED'].includes(row.status)).length === 1,
    JSON.stringify({ bookingId, activityId, assignments: persisted?.assignments.length }));
  const duplicate = await lab.call(`/planning/activities/${activityId}/plan`, { method: 'POST', token: adminA.token,
    body: { startUtc: '2026-11-03T16:00:00.000Z', durationMinutes: 60, leadUserId: ids.adminA, confirmUnknown: true } });
  check('duplicate-open-booking-denied', [400, 409].includes(duplicate.status), `HTTP ${duplicate.status}`);
  check('duplicate-denial-no-side-effect', await prisma.booking.count({ where: { activityId, status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] } } }) === 1, 'one open Booking');
  const moved = await lab.call(`/planning/bookings/${bookingId}/slot`, { method: 'PATCH', token: adminA.token,
    body: { startUtc: '2026-11-04T17:00:00.000Z', durationMinutes: 60, reschedule: true, confirmUnknown: true } });
  check('reschedule-persists', moved.status === 200,
    JSON.stringify({ status: moved.status, data: moved.data }));
  const foreignMove = await lab.call(`/planning/bookings/${bookingId}/slot`, { method: 'PATCH', token: adminB.token,
    body: { startUtc: '2026-11-03T18:00:00.000Z', durationMinutes: 60, reschedule: true, confirmUnknown: true } });
  check('cross-tenant-slot-denied', [403, 404].includes(foreignMove.status), `HTTP ${foreignMove.status}`);

  browser = await puppeteer.launch({ headless: true });
  isolated = await lab.createIsolatedSession('advisor', { browser });
  await isolated.page.evaluate(({ token, refresh, user }) => {
    localStorage.setItem('coro_token', token); localStorage.setItem('coro_refresh_token', refresh);
    localStorage.setItem('coro_user', JSON.stringify(user));
  }, { token: adminA.token, refresh: adminA.refresh, user: adminA.user });
  let expectedFaultWindow = false;
  isolated.page.on('console', (event) => { if (event.type() === 'error' && !expectedFaultWindow) report.consoleErrors.push(event.text()); });
  isolated.page.on('pageerror', (error) => { if (!expectedFaultWindow) report.consoleErrors.push(error.message); });
  for (const viewport of viewports) for (const theme of themes) {
    await isolated.page.setViewport(viewport);
    await isolated.page.evaluate(({ ui, preference }) => { localStorage.setItem('coro-ui-generation', ui);
      localStorage.setItem('coro-theme-preference', preference); localStorage.setItem('coro-glass-beta', 'on'); }, theme);
    await isolated.page.goto(`${frontendUrl}/planning?date=2026-11-04&view=day&tz=America%2FToronto`, { waitUntil: 'networkidle0' });
    const state = await isolated.page.evaluate(geometry);
    const id = `${viewport.width}x${viewport.height}-${theme.name}`;
    const pass = !state.pageOverflow && state.outside.length === 0 && /Planification d['’]équipe/i.test(state.text) && state.text.includes(marker);
    report.matrix.push({ id, status: pass ? 'PASS' : 'FAIL', overflow: state.pageOverflow,
      controlsOutside: state.outside.length, ui: state.ui, theme: state.theme });
    await isolated.page.screenshot({ path: join(evidenceRoot, `planning-${id}.png`), fullPage: true });
    observe(`browser-${id}`, pass, JSON.stringify(report.matrix.at(-1)));
    if (!pass && !report.findings.some((finding) => finding.id === 'PLAN-002'))
      report.findings.push({ id: 'PLAN-002', severity: 'MEDIUM',
        title: 'Planning controls are clipped at the mobile viewport boundary',
        evidence: `${id}: ${state.outside.length} visible controls extend outside the viewport although page overflow is suppressed.` });
  }
  await isolated.page.reload({ waitUntil: 'networkidle0' });
  check('f5-session-persistence', await isolated.page.evaluate((text) => Boolean(localStorage.getItem('coro_token')) && document.body.innerText.includes(text), marker), 'session and event retained');
  await isolated.page.keyboard.press('Tab');
  check('keyboard-focus-visible', await isolated.page.evaluate(() => { const box = document.activeElement?.getBoundingClientRect(); return Boolean(box && box.width > 0 && box.height > 0); }), 'visible keyboard target');
  const cdp = await isolated.page.createCDPSession();
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  const zoom = await isolated.page.evaluate(geometry);
  check('zoom-200', zoom.outside.length === 0, JSON.stringify({ overflow: zoom.pageOverflow, outside: zoom.outside.length }));
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });

  let failContextOnce = true;
  expectedFaultWindow = true;
  await isolated.page.setRequestInterception(true);
  const contextFailure = (request) => {
    if (failContextOnce && request.url().includes('/planning/context')) {
      failContextOnce = false;
      void request.respond({ status: 503, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': frontendUrl },
        body: '{"message":"qa-context-outage"}' });
      return;
    }
    void request.continue();
  };
  isolated.page.on('request', contextFailure);
  await isolated.page.goto(`${frontendUrl}/planning?date=2026-11-04&view=day&tz=America%2FToronto`, { waitUntil: 'networkidle0' });
  check('context-503-visible', await isolated.page.evaluate(() => document.body.innerText.includes('temporairement indisponible')), 'explicit context outage');
  await isolated.page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Réessayer'))?.click());
  await isolated.page.waitForFunction((text) => document.body.innerText.includes(text), {}, marker);
  check('context-retry-recovers', true, 'retry restored planning context without stale data');
  isolated.page.off('request', contextFailure);
  expectedFaultWindow = false;

  let failMonthOnce = true;
  expectedFaultWindow = true;
  const monthFailure = (request) => {
    if (failMonthOnce && request.method() === 'GET' && request.url().includes('/planning/actions')) {
      failMonthOnce = false;
      void request.respond({ status: 503, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': frontendUrl },
        body: '{"message":"qa-month-outage"}' });
      return;
    }
    void request.continue();
  };
  isolated.page.on('request', monthFailure);
  await isolated.page.goto(`${frontendUrl}/planning?date=2026-11-04&view=month&tz=America%2FToronto`, { waitUntil: 'networkidle0' });
  check('month-503-visible-no-false-empty', await isolated.page.evaluate(() =>
    document.body.innerText.includes('temporairement indisponible') && !document.querySelector('[data-qa="month-calendar"]')),
  'explicit monthly outage and no false empty calendar');
  await isolated.page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Réessayer'))?.click());
  await isolated.page.waitForFunction(() => !document.body.innerText.includes('temporairement indisponible'));
  check('month-retry-recovers', true, 'monthly retry completed');
  isolated.page.off('request', monthFailure);
  await isolated.page.setRequestInterception(false);
  expectedFaultWindow = false;

  const cancelled = await lab.call(`/planning/bookings/${bookingId}/cancel-schedule`, { method: 'POST', token: adminA.token });
  check('cancel-schedule', cancelled.status === 201, `HTTP ${cancelled.status}`);
  const finalBooking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { assignments: true } });
  check('cancel-consistency', finalBooking?.status === 'ANNULEE' && finalBooking.assignments.every((row) => !['PENDING', 'ACCEPTED'].includes(row.status)),
    JSON.stringify({ status: finalBooking?.status, assignments: finalBooking?.assignments.map((row) => row.status) }));
  check('no-critical-console-errors', report.consoleErrors.length === 0, JSON.stringify(report.consoleErrors));
  report.limitations.push({ id: 'real-screen-reader', status: 'NOT_VERIFIED', reason: 'No real screen-reader runtime is available.' });
  report.limitations.push({ id: 'external-delivery', status: 'NOT_APPLICABLE', reason: 'Planning acceptance uses provider fakes only.' });
  report.verdict = report.findings.length ? 'PASS_WITH_FINDINGS' : 'PASS';
} catch (error) {
  report.verdict = 'FAIL'; report.error = error instanceof Error ? { message: error.message, stack: error.stack } : String(error);
  process.exitCode = 1;
} finally {
  if (bookingId) {
    await prisma.bookingAssignment.updateMany({ where: { bookingId }, data: { status: 'REMOVED', endedAt: new Date() } }).catch(() => undefined);
    await prisma.booking.updateMany({ where: { id: bookingId }, data: { status: 'ANNULEE' } }).catch(() => undefined);
  }
  await prisma.activityType.deleteMany({ where: { organizationId: ids.orgA, code: 'custom-plan-qa' } }).catch(() => undefined);
  if (isolated?.context) await isolated.context.close().catch(() => undefined);
  if (browser) await browser.close().catch(() => undefined);
  await prisma.$disconnect().catch(() => undefined); await adapter.close().catch(() => undefined);
  await writeFile(join(evidenceRoot, 'organization-team-planning-acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
