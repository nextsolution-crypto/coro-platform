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
const evidenceRoot = assertUnderQaRoot(
  process.env.CORO_QA_ACTIVITIES_EVIDENCE ||
    `D:\\CORO-QA\\runs\\organization-activities\\${new Date().toISOString().slice(0, 10)}`,
);
const backendUrl = process.env.CORO_QA_BACKEND_URL;
const frontendUrl = process.env.CORO_QA_FRONTEND_URL;
const portalUrl = process.env.CORO_QA_PORTAL_URL;
const providerUrl = process.env.CORO_QA_PROVIDER_URL || 'http://127.0.0.1:34641';
const databasePort = Number(process.env.CORO_QA_DATABASE_PORT || 55473);
const secrets = await loadSecretStore();
const databaseUrl = `postgresql://coro_qa:${encodeURIComponent(secrets.databasePassword)}@127.0.0.1:${databasePort}/coro_qa_global_e2e?schema=public`;
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const adapter = await startMfaCaptureAdapter({
  captureDirectory: process.env.CORO_QA_MFA_DIR,
  channelToken: secrets.mfaChannelToken,
});
const lab = new QaIdentityLab({
  apiUrl: backendUrl,
  frontendUrl,
  portalUrl,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});
const ids = {
  orgA: '10000000-0000-4000-8000-000000000002',
  projectA: '50000000-0000-4000-8000-000000000001',
  projectB: '50000000-0000-4000-8000-000000000003',
  advisorA: '20000000-0000-4000-8000-000000000007',
  buildingA: '40000000-0000-4000-8000-000000000001',
};
const marker = `ACT-QA-${Date.now()}`;
const report = { executedAt: new Date().toISOString(), marker, checks: [], matrix: [], consoleErrors: [], authResponses: [] };
const check = (id, pass, detail) => {
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
  if (!pass) throw new Error(`${id}: ${detail}`);
};
const viewports = [
  { width: 390, height: 844 }, { width: 768, height: 1024 },
  { width: 1440, height: 900 }, { width: 2560, height: 1440 },
];
const themes = [
  { name: 'classic', ui: 'legacy', preference: 'LIGHT' },
  { name: 'glass-light', ui: 'glass', preference: 'LIGHT' },
  { name: 'glass-dark', ui: 'glass', preference: 'DARK' },
];
const geometry = () => {
  const rootElement = document.documentElement;
  const controls = [...document.querySelectorAll('button,a,input,select')]
    .filter((node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    })
    .map((node) => {
      const box = node.getBoundingClientRect();
      return { tag: node.tagName, left: box.left, right: box.right, width: box.width, height: box.height };
    });
  return {
    overflow: rootElement.scrollWidth > rootElement.clientWidth + 1,
    controlsOutside: controls.filter((box) => box.right > 0 && box.left < innerWidth && (box.left < -1 || box.right > innerWidth + 1)),
    ui: rootElement.getAttribute('data-ui'), theme: rootElement.getAttribute('data-theme'),
    text: document.body.innerText,
  };
};

let browser;
let organization;
let client;
let scheduleId;
let previousAdvisorState;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const advisor = await lab.loginAs('advisor');
  const corporate = await lab.loginAs('clientCorporateA');
  const foreign = await lab.loginAs('clientOrganizationB');
  await prisma.booking.updateMany({
    where: {
      assignedUserId: ids.advisorA,
      requestedDate: { gte: new Date('2030-11-06T15:00:00.000Z'), lt: new Date('2030-11-06T16:00:00.000Z') },
      status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] },
    },
    data: { status: 'ANNULEE' },
  });

  const created = await lab.call(`/projects/${ids.projectA}/activities`, {
    method: 'POST', token: advisor.token,
    body: {
      type: 'autre', label: marker, customLabel: marker, duration: '1h00',
      scheduledDate: '2026-11-03T15:00:00.000Z', clientVisible: true, clientBookable: true,
      notes: 'Synthetic organization activities acceptance',
    },
  });
  check('advisor-creates-visible-activity', created.status === 201, `HTTP ${created.status}`);
  const activityId = created.data.id;
  previousAdvisorState = await prisma.user.findUniqueOrThrow({ where: { id: ids.advisorA }, select: { timeZone: true, timeZoneVerified: true } });
  await prisma.user.update({ where: { id: ids.advisorA }, data: { timeZone: 'America/Toronto', timeZoneVerified: true } });
  const schedule = await prisma.userWorkSchedule.create({ data: {
    organizationId: ids.orgA, userId: ids.advisorA, timeZone: 'America/Toronto',
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'), verifiedAt: new Date(), verifiedByUserId: ids.advisorA,
    intervals: { create: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: 0, endTime: 1440 })) },
  } });
  scheduleId = schedule.id;
  await prisma.projectAdvisorEligibility.create({ data: {
    organizationId: ids.orgA, projectId: ids.projectA, activityId,
    advisorUserId: ids.advisorA, authorizedByUserId: ids.advisorA, priority: 1,
  } });

  const portalList = await lab.call('/client-portal/activities', { token: corporate.token });
  check('client-sees-advisor-activity', portalList.status === 200 && portalList.data.some((item) => item.id === activityId), `HTTP ${portalList.status}`);
  const foreignList = await lab.call('/client-portal/activities', { token: foreign.token });
  check('cross-tenant-list-denied-by-isolation', foreignList.status === 200 && !foreignList.data.some((item) => item.id === activityId), `HTTP ${foreignList.status}`);
  const foreignBooking = await lab.call(`/client-portal/activities/${activityId}/bookings`, {
    method: 'POST', token: foreign.token, body: { requestedLocalDateTime: '2030-11-06T10:00', duration: 60 },
  });
  check('cross-tenant-direct-booking-denied', [403, 404].includes(foreignBooking.status), `HTTP ${foreignBooking.status}`);

  const preview = await lab.call('/planning/team-preview', {
    method: 'POST', token: advisor.token,
    body: { buildingId: ids.buildingA, startUtc: '2030-11-06T15:00:00.000Z', durationMinutes: 60 },
  });
  const advisorPreview = Array.isArray(preview.data) ? preview.data.find((item) => item.userId === ids.advisorA) : preview.data?.candidates?.find((item) => item.userId === ids.advisorA);
  check('synthetic-advisor-capacity-ready', preview.status === 201 && advisorPreview?.availabilityStatus === 'AVAILABLE', `HTTP ${preview.status}; ${JSON.stringify(advisorPreview)}`);

  const providerBefore = await fetch(`${providerUrl}/__qa/state`).then((response) => response.json());
  const booking = await lab.call(`/client-portal/activities/${activityId}/bookings`, {
    method: 'POST', token: corporate.token,
    body: { requestedLocalDateTime: '2030-11-06T10:00', duration: 60, comment: 'Synthetic QA booking' },
  });
  check('client-requests-booking', booking.status === 201, `HTTP ${booking.status}; ${JSON.stringify(booking.data)}`);
  const providerAfterBooking = await fetch(`${providerUrl}/__qa/state`).then((response) => response.json());
  check('booking-notification-simulated', providerAfterBooking.accepted === providerBefore.accepted + 1, JSON.stringify({ providerBefore, providerAfterBooking }));
  const repeated = await lab.call(`/client-portal/activities/${activityId}/bookings`, {
    method: 'POST', token: corporate.token,
    body: { requestedLocalDateTime: '2030-11-06T10:00', duration: 60, comment: 'Synthetic QA booking' },
  });
  check('repeated-booking-does-not-duplicate', repeated.status === 409, `HTTP ${repeated.status}`);
  const providerAfterRepeated = await fetch(`${providerUrl}/__qa/state`).then((response) => response.json());
  check('repeated-booking-does-not-notify', providerAfterRepeated.requests === providerAfterBooking.requests, JSON.stringify({ providerAfterBooking, providerAfterRepeated }));
  const advisorBookings = await lab.call(`/bookings/project/${ids.projectA}`, { token: advisor.token });
  check('advisor-sees-client-request', advisorBookings.status === 200 && advisorBookings.data.some((item) => item.id === booking.data.id), `HTTP ${advisorBookings.status}`);

  const foreignUpdate = await lab.call(`/activities/${activityId}`, {
    method: 'PUT', token: (await lab.loginAs('delegatedEmployee')).token, body: { status: 'fait', expectedUpdatedAt: created.data.updatedAt },
  });
  check('out-of-scope-operator-update-denied', [403, 404].includes(foreignUpdate.status), `HTTP ${foreignUpdate.status}`);
  const firstUpdate = await lab.call(`/activities/${activityId}`, {
    method: 'PUT', token: advisor.token, body: { status: 'reporte', reportedDate: '2026-11-05T15:00:00.000Z', expectedUpdatedAt: created.data.updatedAt },
  });
  check('authorized-reschedule', firstUpdate.status === 200, `HTTP ${firstUpdate.status}`);
  const staleUpdate = await lab.call(`/activities/${activityId}`, {
    method: 'PUT', token: advisor.token, body: { status: 'fait', expectedUpdatedAt: created.data.updatedAt },
  });
  check('stale-update-conflict', staleUpdate.status === 409, `HTTP ${staleUpdate.status}`);

  const ics = await fetch(`${backendUrl}/activities/${activityId}/ics`, { headers: { authorization: `Bearer ${advisor.token}` } });
  const icsText = await ics.text();
  check('real-ics-contract', ics.status === 200 && /text\/calendar/i.test(ics.headers.get('content-type') || '') &&
    icsText.includes('BEGIN:VCALENDAR') && icsText.includes('BEGIN:VEVENT') && icsText.includes(`UID:${activityId}@coro.app`) &&
    icsText.includes('DTSTART:20261105T150000Z') && icsText.includes('END:VEVENT') && icsText.includes('END:VCALENDAR'), `HTTP ${ics.status}`);
  const foreignIcs = await fetch(`${backendUrl}/activities/${activityId}/ics`, { headers: { authorization: `Bearer ${(await lab.loginAs('delegatedEmployee')).token}` } });
  check('ics-out-of-scope-no-calendar', foreignIcs.status === 404 && !/text\/calendar/i.test(foreignIcs.headers.get('content-type') || ''), `HTTP ${foreignIcs.status}`);

  browser = await puppeteer.launch({ headless: true });
  organization = await lab.createIsolatedSession('advisor', { browser });
  client = await lab.createIsolatedSession('clientCorporateA', { browser });
  await organization.page.evaluate(({ token, refreshToken, user }) => {
    for (const storage of [localStorage, sessionStorage]) {
      storage.setItem('coro_token', token);
      storage.setItem('coro_refresh_token', refreshToken);
      storage.setItem('coro_user', JSON.stringify(user));
    }
  }, { token: advisor.token, refreshToken: advisor.refresh, user: advisor.user });
  const advisorSession = await lab.call('/users/me', { token: advisor.token });
  check('advisor-session-ready', advisorSession.status === 200, `HTTP ${advisorSession.status}`);
  for (const page of [organization.page, client.page]) {
    page.on('console', (entry) => { if (entry.type() === 'error') report.consoleErrors.push(entry.text()); });
    page.on('pageerror', (error) => report.consoleErrors.push(error.message));
    page.on('response', (response) => {
      if (/\/users\/me|\/auth\/refresh/.test(response.url())) {
        report.authResponses.push({ url: response.url(), status: response.status() });
      }
    });
  }
  const browserAdvisorSession = await organization.page.evaluate(async (apiUrl) => {
    const token = localStorage.getItem('coro_token');
    try {
      const response = await fetch(`${apiUrl}/users/me`, { headers: { authorization: `Bearer ${token}` } });
      return { status: response.status, ok: response.ok };
    } catch (error) {
      return { status: 0, ok: false, error: String(error) };
    }
  }, backendUrl);
  check('advisor-browser-session-ready', browserAdvisorSession.status === 200, JSON.stringify(browserAdvisorSession));
  for (const viewport of viewports) {
    for (const theme of themes) {
      for (const isolated of [organization, client]) {
        await isolated.page.setViewport(viewport);
        await isolated.page.evaluate(({ ui, preference }) => {
          localStorage.setItem('coro-ui-generation', ui);
          localStorage.setItem('coro-theme-preference', preference);
          localStorage.setItem('coro-glass-beta', 'on');
        }, theme);
      }
      await organization.page.goto(`${frontendUrl}/activities/portfolio`, { waitUntil: 'networkidle0' });
      await client.page.goto(`${portalUrl}/activities`, { waitUntil: 'networkidle0' });
      const orgState = await organization.page.evaluate(geometry);
      const clientState = await client.page.evaluate(geometry);
      await organization.page.reload({ waitUntil: 'networkidle0' });
      await client.page.reload({ waitUntil: 'networkidle0' });
      const organizationPersistent = await organization.page.evaluate((expectedMarker) => ({
        path: location.pathname, hasToken: Boolean(localStorage.getItem('coro_token')),
        ready: document.body.innerText.includes(expectedMarker), text: document.body.innerText.slice(0, 240),
      }), marker);
      const clientPersistent = await client.page.evaluate(() => ({
        path: location.pathname, hasToken: Boolean(localStorage.getItem('coro_client_token')),
        ready: document.body.innerText.toLocaleLowerCase('fr').includes('activit'), text: document.body.innerText.slice(0, 240),
      }));
      const persistent = organizationPersistent.ready && clientPersistent.ready;
      const expectedTheme = theme.preference === 'DARK' ? 'dark' : 'light';
      const themeApplied = orgState.ui === theme.ui && orgState.theme === expectedTheme &&
        clientState.ui === theme.ui && clientState.theme === expectedTheme;
      const pass = !orgState.overflow && !clientState.overflow && orgState.controlsOutside.length === 0 &&
        clientState.controlsOutside.length === 0 && orgState.text.includes(marker) && clientState.text.includes(marker) &&
        persistent && themeApplied;
      const id = `${viewport.width}x${viewport.height}-${theme.name}`;
      report.matrix.push({ id, status: pass ? 'PASS' : 'FAIL', organization: { ...orgState, text: undefined }, client: { ...clientState, text: undefined }, persistent });
      check(`browser-${id}`, pass, JSON.stringify({ orgOverflow: orgState.overflow, clientOverflow: clientState.overflow, organizationPersistent, clientPersistent }));
      await organization.page.screenshot({ path: join(evidenceRoot, `organization-${id}.png`), fullPage: true });
      await client.page.screenshot({ path: join(evidenceRoot, `client-${id}.png`), fullPage: true });
    }
  }
  await organization.page.setViewport({ width: 390, height: 844 });
  await organization.page.goto(`${frontendUrl}/activities/portfolio`, { waitUntil: 'networkidle0' });
  await organization.page.keyboard.press('Tab');
  const keyboardFocus = await organization.page.evaluate(() => {
    const active = document.activeElement;
    const box = active?.getBoundingClientRect();
    return {
      tag: active?.tagName || null,
      visible: Boolean(box && box.width > 0 && box.height > 0 && box.right > 0 && box.left < innerWidth),
    };
  });
  check('keyboard-focus-visible', keyboardFocus.visible, JSON.stringify(keyboardFocus));
  const cdp = await organization.page.createCDPSession();
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  const zoomState = await organization.page.evaluate(geometry);
  check('zoom-200-no-horizontal-overflow', !zoomState.overflow, JSON.stringify({ overflow: zoomState.overflow }));
  await organization.page.screenshot({ path: join(evidenceRoot, 'organization-390x844-zoom-200.png'), fullPage: true });
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  const critical = [...new Set(report.consoleErrors)].filter((message) => !/favicon|404 \(Not Found\)/i.test(message));
  check('critical-console-errors', critical.length === 0, `count=${critical.length}`);
  report.criticalConsoleErrors = critical;

  const failurePage = await organization.context.newPage();
  await failurePage.setRequestInterception(true);
  failurePage.on('request', (request) => {
    if (request.url() === `${backendUrl}/activities/portfolio`) request.respond({ status: 503, contentType: 'application/json', body: '{"message":"synthetic outage"}' });
    else request.continue();
  });
  await failurePage.goto(`${frontendUrl}/activities/portfolio`, { waitUntil: 'networkidle0' });
  const outage = await failurePage.evaluate(() => ({ text: document.body.innerText, retry: [...document.querySelectorAll('button')].some((button) => /essayer/i.test(button.textContent || '')) }));
  check('explicit-outage-and-retry', outage.text.includes('Impossible de charger') && outage.retry && !outage.text.includes(marker), JSON.stringify(outage));
  await failurePage.close();

  await organization.page.evaluate(() => {
    localStorage.setItem('coro-ui-generation', 'legacy');
    localStorage.setItem('coro-theme-preference', 'LIGHT');
  });
  await organization.page.goto(`${frontendUrl}/activities/portfolio`, { waitUntil: 'networkidle0' });
  await organization.page.evaluate(() => {
    window.__qaCreatedCalendarUrls = 0;
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (...args) => {
      window.__qaCreatedCalendarUrls += 1;
      return original(...args);
    };
  });
  await organization.page.setRequestInterception(true);
  const failIcs = (request) => {
    if (/\/activities\/[^/]+\/ics$/.test(request.url())) {
      request.respond({ status: 503, contentType: 'application/json', body: '{"message":"synthetic ICS outage"}' });
    } else request.continue();
  };
  organization.page.on('request', failIcs);
  await organization.page.click('button[title*=".ics"]');
  await organization.page.waitForFunction(() => /calendrier.*pas pu/i.test(document.body.innerText));
  const failedIcsState = await organization.page.evaluate(() => ({
    objectUrls: window.__qaCreatedCalendarUrls,
    alert: [...document.querySelectorAll('[role="alert"]')].some((node) => /calendrier.*pas pu/i.test(node.textContent || '')),
  }));
  check('ics-503-no-download-and-visible-retry', failedIcsState.alert && failedIcsState.objectUrls === 0, JSON.stringify(failedIcsState));
  organization.page.off('request', failIcs);
  await organization.page.setRequestInterception(false);

  const cancelled = await lab.call(`/client-portal/bookings/${booking.data.id}/cancel`, {
    method: 'PUT', token: corporate.token, body: { reason: 'Synthetic acceptance cleanup' },
  });
  check('client-cancels-own-booking', cancelled.status === 200, `HTTP ${cancelled.status}`);
} finally {
  if (organization) await organization.context.close();
  if (client) await client.context.close();
  if (browser) await browser.close();
  await prisma.projectAdvisorEligibility.deleteMany({ where: { activity: { customLabel: marker } } }).catch(() => undefined);
  await prisma.booking.deleteMany({ where: { comment: 'Synthetic QA booking' } }).catch(() => undefined);
  await prisma.projectActivity.deleteMany({ where: { customLabel: marker } }).catch(() => undefined);
  if (scheduleId) await prisma.userWorkSchedule.deleteMany({ where: { id: scheduleId } }).catch(() => undefined);
  if (previousAdvisorState) await prisma.user.update({ where: { id: ids.advisorA }, data: previousAdvisorState }).catch(() => undefined);
  await prisma.$disconnect();
  await adapter.close();
  report.pass = report.checks.every((item) => item.status === 'PASS');
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(join(evidenceRoot, 'activities-acceptance.json'), JSON.stringify(report, null, 2));
}

console.log(JSON.stringify({ pass: report.pass, checks: report.checks.length, matrix: `${report.matrix.filter((item) => item.status === 'PASS').length}/12` }));
if (!report.pass) process.exitCode = 1;
