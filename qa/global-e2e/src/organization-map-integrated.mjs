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
const secrets = await loadSecretStore();
const evidenceRoot = assertUnderQaRoot(
  process.env.CORO_QA_MAP_INTEGRATED_EVIDENCE ||
    'D:\\CORO-QA\\tracking\\organization-map\\integrated\\browser',
);
const adapter = await startMfaCaptureAdapter({
  captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR),
  channelToken: secrets.mfaChannelToken,
});
const lab = new QaIdentityLab({
  apiUrl: process.env.CORO_QA_BACKEND_URL,
  portalUrl: process.env.CORO_QA_PORTAL_URL,
  frontendUrl: process.env.CORO_QA_FRONTEND_URL,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const ids = {
  orgA: '10000000-0000-4000-8000-000000000002',
  orgB: '10000000-0000-4000-8000-000000000003',
  clientA: '30000000-0000-4000-8000-000000000001',
  clientB: '30000000-0000-4000-8000-000000000002',
  buildingA: '40000000-0000-4000-8000-000000000001',
  buildingB: '40000000-0000-4000-8000-000000000002',
  createdBuilding: 'bld_1881d0cc09186723f4647b6d2dc535bf',
  localUser: '70000000-0000-4000-8000-000000000004',
};
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL8WQAAAABJRU5ErkJggg==',
  'base64',
);
const report = {
  sha: process.env.CORO_QA_COMMIT_SHA,
  executedAt: new Date().toISOString(),
  dataPlane: 'REAL_QA_POSTGRESQL_AND_BACKEND',
  tilePlane: 'SIMULATED_LOCAL_RESPONSE',
  checks: [],
  scenarios: [],
  limitations: [
    {
      id: 'real-screen-reader',
      status: 'NOT_VERIFIED',
      reason: 'No reliable screen-reader runtime is installed in this QA environment.',
    },
  ],
};
const check = (id, pass, detail) =>
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });

async function loginAdmin(email) {
  const startedAt = Date.now();
  const first = await lab.call('/auth/login', {
    method: 'POST',
    body: { email, password: secrets.syntheticPassword },
  });
  const code = await lab.completeMfa({ email, key: email }, startedAt);
  const verified = await lab.call('/auth/verify-mfa', {
    method: 'POST',
    body: { email, code },
  });
  if (first.status >= 300 || verified.status >= 300)
    throw new Error(`Internal login failed for ${email}`);
  return { token: verified.data.access_token, user: verified.data.user, portal: false };
}

async function openScenario(browser, scenario) {
  console.log(`MAP_INTEGRATED_SCENARIO_START: ${scenario.id}`);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setBypassServiceWorker(true);
  const apiResponses = [];
  const failures = [];
  const consoleErrors = [];
  page.on('response', (response) => {
    if (response.url().includes('/api/buildings') || response.url().includes('/api/client-portal/buildings')) {
      apiResponses.push({ url: response.url(), status: response.status() });
    }
  });
  page.on('requestfailed', (request) => failures.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('console', (event) => {
    if (event.type() === 'error') consoleErrors.push(event.text());
  });
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    if (request.url().startsWith('https://tile.openstreetmap.org/')) {
      return request.respond({ status: 200, contentType: 'image/png', body: transparentPng });
    }
    return request.continue();
  });
  await page.evaluateOnNewDocument(({ token, user, portal, theme }) => {
    localStorage.setItem(portal ? 'coro_client_token' : 'coro_token', token);
    localStorage.setItem(portal ? 'coro_client_user' : 'coro_user', JSON.stringify(user));
    localStorage.setItem('coro-ui-generation', theme.ui);
    localStorage.setItem('coro-theme-preference', theme.preference);
    localStorage.setItem('coro-glass-beta', 'production-preview');
  }, { ...scenario.session, theme: scenario.theme });
  await page.setViewport(scenario.viewport);
  await page.goto(`${scenario.origin}${scenario.path}`, { waitUntil: 'networkidle0', timeout: 60_000 });
  try {
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 30_000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      url: location.href,
      text: document.body.innerText.slice(0, 3000),
      map: (() => {
        const element = document.querySelector('[aria-label*="Carte de mes"]');
        return element
          ? {
              className: element.className,
              childCount: element.childElementCount,
              width: element.getBoundingClientRect().width,
              height: element.getBoundingClientRect().height,
              html: element.innerHTML.slice(0, 1000),
            }
          : null;
      })(),
    }));
    await page.screenshot({ path: join(evidenceRoot, `${scenario.id}-marker-failure.png`), fullPage: true });
    throw new Error(
      `Marker readiness failed for ${scenario.id}: ${JSON.stringify({ diagnostic, apiResponses, failures, consoleErrors })}`,
      { cause: error },
    );
  }
  const state = await page.evaluate(() => ({
    markerCount: document.querySelectorAll('.leaflet-marker-icon').length,
    listCount: document.querySelectorAll('[aria-label*="Liste des b"] button').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    attribution: document.body.innerText.includes('OpenStreetMap contributors'),
    body: document.body.innerText,
  }));
  const expectedVisible = scenario.expectedNames.every((name) => state.body.includes(name));
  const forbiddenHidden = scenario.forbiddenNames.every((name) => !state.body.includes(name));
  const selectedName = scenario.expectedNames[0];
  const selectionTriggered = await page.evaluate((name) => {
    const list = document.querySelector('[aria-label*="Liste des b"]');
    const button = [...(list?.querySelectorAll('button') ?? [])].find((candidate) =>
      candidate.textContent?.includes(name),
    );
    button?.click();
    return Boolean(button);
  }, selectedName);
  if (selectionTriggered) {
    await page.waitForSelector('[aria-label*="Fermer les détails"]', { timeout: 10_000 });
  }
  const selectionCoherent = selectionTriggered && await page.evaluate(
    (name) => Boolean(document.querySelector('[aria-label*="Fermer les détails"]')) && document.body.innerText.includes(name),
    selectedName,
  );
  const endpointPass = apiResponses.some((entry) => entry.status === 200);
  const pass =
    endpointPass &&
    expectedVisible &&
    forbiddenHidden &&
    state.markerCount === scenario.expectedNames.length &&
    state.listCount === scenario.expectedNames.length &&
    selectionCoherent &&
    !state.overflow &&
    state.attribution &&
    consoleErrors.length === 0;
  report.scenarios.push({
    id: scenario.id,
    status: pass ? 'PASS' : 'FAIL',
    apiResponses,
    markerCount: state.markerCount,
    listCount: state.listCount,
    expectedVisible,
    forbiddenHidden,
    overflow: state.overflow,
    attribution: state.attribution,
    selectionCoherent,
    requestFailures: failures.filter((entry) => entry.url.includes('/api/')),
    consoleErrors,
  });
  await page.screenshot({ path: join(evidenceRoot, `${scenario.id}.png`), fullPage: true });
  await page.reload({ waitUntil: 'networkidle0' });
  check(`${scenario.id}-f5`, await page.evaluate((key) => Boolean(localStorage.getItem(key)), scenario.session.portal ? 'coro_client_token' : 'coro_token'), 'authenticated session survives F5');
  return { context, page };
}

let browser;
let localOriginal;
try {
  await mkdir(evidenceRoot, { recursive: true });
  await Promise.all([
    prisma.building.update({ where: { id: ids.buildingA }, data: { latitude: 45.5017, longitude: -73.5673 } }),
    prisma.building.update({ where: { id: ids.buildingB }, data: { latitude: 46.8139, longitude: -71.208 } }),
    prisma.building.update({ where: { id: ids.createdBuilding }, data: { latitude: 45.5317, longitude: -73.5973 } }),
  ]);
  localOriginal = await prisma.clientUser.findUnique({ where: { id: ids.localUser }, select: { buildingIds: true } });

  // Keep authentication deterministic and below the canonical per-IP window.
  // A 429 is terminal for this campaign; the runner never retries or resets counters.
  const adminA = await loginAdmin('customer-admin-a@global-e2e.test');
  const advisor = await lab.loginAs('advisor');
  const corporateA = await lab.loginAs('clientCorporateA');
  const localA = await lab.loginAs('clientLocalA');
  const corporateB = await lab.loginAs('clientOrganizationB');
  const [adminList, operatorList, corporateList, managerList, crossTenant] = await Promise.all([
    lab.call('/buildings', { token: adminA.token }),
    lab.call('/buildings', { token: advisor.token }),
    lab.call('/client-portal/buildings', { token: corporateA.token }),
    lab.call('/client-portal/buildings', { token: localA.token }),
    lab.call(`/client-portal/buildings/${ids.buildingA}`, { token: corporateB.token }),
  ]);
  check('admin-real-endpoint-scope', adminList.status === 200 && adminList.data.some((b) => b.id === ids.buildingA) && adminList.data.some((b) => b.id === ids.createdBuilding) && !adminList.data.some((b) => b.id === ids.buildingB), `HTTP ${adminList.status}; count=${adminList.data?.length ?? 0}`);
  check('operator-real-endpoint-scope', operatorList.status === 200 && operatorList.data.length === 1 && operatorList.data[0].id === ids.buildingA, `HTTP ${operatorList.status}; count=${operatorList.data?.length ?? 0}`);
  check('corporate-real-endpoint-scope', corporateList.status === 200 && corporateList.data.some((b) => b.id === ids.buildingA) && corporateList.data.some((b) => b.id === ids.createdBuilding) && !corporateList.data.some((b) => b.id === ids.buildingB), `HTTP ${corporateList.status}; count=${corporateList.data?.length ?? 0}`);
  check('manager-real-endpoint-scope', managerList.status === 200 && managerList.data.length === 1 && managerList.data[0].id === ids.buildingA, `HTTP ${managerList.status}; count=${managerList.data?.length ?? 0}`);
  check('cross-tenant-real-endpoint-denied', [403, 404].includes(crossTenant.status), `HTTP ${crossTenant.status}`);
  const revoked = await lab.loginAs('revokedUser');
  check('inactive-identity-denied', revoked.denied === true, `HTTP ${revoked.status}`);
  await prisma.client.update({ where: { id: ids.clientB }, data: { isActive: false } });
  lab.resetSession('clientOrganizationB');
  let disabledClientDenied = false;
  try {
    await lab.loginAs('clientOrganizationB');
  } catch {
    disabledClientDenied = true;
  }
  check('disabled-client-denied', disabledClientDenied, 'client authentication rejected while Client.isActive=false');
  await prisma.client.update({ where: { id: ids.clientB }, data: { isActive: true } });

  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const scenarios = [
    { id: 'organization-admin-1440-classic', origin: process.env.CORO_QA_FRONTEND_URL, path: '/buildings/map', session: adminA, viewport: { width: 1440, height: 900 }, theme: { ui: 'legacy', preference: 'LIGHT' }, expectedNames: ['Synthetic Building A', 'Bâtiment intégrité QA'], forbiddenNames: ['Synthetic Building B'] },
    { id: 'organization-operator-390-glass-dark', origin: process.env.CORO_QA_FRONTEND_URL, path: '/buildings/map', session: { ...advisor, portal: false }, viewport: { width: 390, height: 844 }, theme: { ui: 'glass', preference: 'DARK' }, expectedNames: ['Synthetic Building A'], forbiddenNames: ['Synthetic Building B', 'Bâtiment intégrité QA'] },
    { id: 'portal-corporate-1440-glass-light', origin: process.env.CORO_QA_PORTAL_URL, path: '/map', session: corporateA, viewport: { width: 1440, height: 900 }, theme: { ui: 'glass', preference: 'LIGHT' }, expectedNames: ['Synthetic Building A', 'Bâtiment intégrité QA'], forbiddenNames: ['Synthetic Building B'] },
    { id: 'portal-manager-390-classic', origin: process.env.CORO_QA_PORTAL_URL, path: '/map', session: localA, viewport: { width: 390, height: 844 }, theme: { ui: 'legacy', preference: 'LIGHT' }, expectedNames: ['Synthetic Building A'], forbiddenNames: ['Synthetic Building B', 'Bâtiment intégrité QA'] },
    { id: 'portal-other-tenant-768-classic', origin: process.env.CORO_QA_PORTAL_URL, path: '/map', session: corporateB, viewport: { width: 768, height: 1024 }, theme: { ui: 'legacy', preference: 'LIGHT' }, expectedNames: ['Synthetic Building B'], forbiddenNames: ['Synthetic Building A', 'Bâtiment intégrité QA'] },
  ];
  for (const scenario of scenarios) {
    const run = await openScenario(browser, scenario);
    if (scenario.id === 'portal-manager-390-classic') {
      await prisma.clientUser.update({ where: { id: ids.localUser }, data: { buildingIds: [] } });
      await run.page.reload({ waitUntil: 'networkidle0' });
      const revokedState = await run.page.evaluate(() => ({
        markers: document.querySelectorAll('.leaflet-marker-icon').length,
        text: document.body.innerText,
      }));
      check('manager-access-removal-after-f5', revokedState.markers === 0 && revokedState.text.includes('Aucun bâtiment'), `markers=${revokedState.markers}`);
      await prisma.clientUser.update({ where: { id: ids.localUser }, data: { buildingIds: localOriginal.buildingIds } });
    }
    await run.context.close();
  }
  check('representative-browser-matrix', report.scenarios.length === 5 && report.scenarios.every((item) => item.status === 'PASS'), `${report.scenarios.filter((item) => item.status === 'PASS').length}/5`);
} finally {
  if (localOriginal) await prisma.clientUser.update({ where: { id: ids.localUser }, data: { buildingIds: localOriginal.buildingIds } }).catch(() => undefined);
  await prisma.client.update({ where: { id: ids.clientB }, data: { isActive: true } }).catch(() => undefined);
  if (browser) await browser.close().catch(() => undefined);
  await Promise.allSettled([adapter.close(), prisma.$disconnect()]);
}
report.pass = report.checks.every((item) => item.status === 'PASS') && report.scenarios.every((item) => item.status === 'PASS');
await writeFile(join(evidenceRoot, 'organization-map-integrated.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
