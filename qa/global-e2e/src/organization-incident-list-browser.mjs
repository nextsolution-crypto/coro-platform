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
const puppeteer = require('puppeteer');
const secrets = await loadSecretStore();
const evidenceRoot = assertUnderQaRoot(
  process.env.CORO_QA_INCIDENT_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-incident-list',
);
const captureRoot = join(evidenceRoot, 'browser');
await mkdir(captureRoot, { recursive: true });
const adapter = await startMfaCaptureAdapter({
  captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR),
  channelToken: secrets.mfaChannelToken,
});
const lab = new QaIdentityLab({
  apiUrl: process.env.CORO_QA_BACKEND_URL,
  frontendUrl: process.env.CORO_QA_FRONTEND_URL,
  portalUrl: process.env.CORO_QA_PORTAL_URL,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const results = [];
const consoleErrors = [];
const route = '/sentinelle/40000000-0000-4000-8000-000000000001/incidents';
const configurations = [
  ['390x844', 390, 844],
  ['768x1024', 768, 1024],
  ['1440x900', 1440, 900],
  ['2560x1440', 2560, 1440],
];
const themes = [
  ['classic', 'legacy', 'LIGHT'],
  ['glass-light', 'glass', 'LIGHT'],
  ['glass-dark', 'glass', 'DARK'],
];

async function applyTheme(page, ui, preference) {
  await page.evaluate(({ ui, preference }) => {
    localStorage.setItem('coro-ui-generation', ui);
    localStorage.setItem('coro-theme-preference', preference);
  }, { ui, preference });
}

try {
  const session = await lab.loginAs('clientCorporateA');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300));
  });
  await page.goto(lab.portalUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('coro_client_token', token);
    localStorage.setItem('coro_client_user', JSON.stringify(user));
  }, { token: session.token, user: session.user });

  for (const [theme, ui, preference] of themes) {
    for (const [viewport, width, height] of configurations) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await applyTheme(page, ui, preference);
      await page.goto(`${lab.portalUrl}${route}`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('h1');
      const metrics = await page.evaluate(() => ({
        title: document.querySelector('h1')?.textContent?.trim(),
        bodyText: document.body.innerText,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        dataUi: document.documentElement.getAttribute('data-ui'),
        dataTheme: document.documentElement.getAttribute('data-theme'),
        focusable: [...document.querySelectorAll('button,[role="link"]')].every((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height >= 40;
        }),
      }));
      const pass = metrics.title?.includes('Historique des incidents')
        && metrics.bodyText.includes('50 incidents')
        && metrics.scrollWidth <= metrics.clientWidth
        && metrics.focusable
        && metrics.dataUi === ui
        && metrics.dataTheme === (preference === 'DARK' ? 'dark' : 'light');
      const file = `${theme}-${viewport}.png`;
      await page.screenshot({ path: join(captureRoot, file), fullPage: true });
      results.push({ theme, viewport, status: pass ? 'PASS' : 'FAIL', metrics, screenshot: file });
    }
  }

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.evaluate(() => { document.body.style.zoom = '2'; });
  const zoom = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    activeLabel: document.querySelector('[role="link"]')?.getAttribute('aria-label'),
  }));
  await page.screenshot({ path: join(captureRoot, 'zoom-200.png'), fullPage: true });

  await page.evaluate(() => { document.body.style.zoom = '1'; });
  await page.keyboard.press('Tab');
  const keyboardFocus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    label: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim(),
  }));

  await page.reload({ waitUntil: 'networkidle0' });
  const afterRefresh = await page.evaluate(() => document.body.innerText.includes('50 incidents'));
  const firstRow = await page.$('[role="link"]');
  await firstRow?.press('Enter');
  await page.waitForFunction(() => /\/incidents\/[^/]+$/.test(location.pathname));
  const detailDestination = new URL(page.url()).pathname;

  const errorPage = await context.newPage();
  let failOnce = true;
  let intercepted503 = 0;
  await errorPage.setRequestInterception(true);
  errorPage.on('request', (request) => {
    if (failOnce && request.url().includes('/client-portal/incidents/buildings/') && request.url().includes('/history')) {
      failOnce = false;
      intercepted503 += 1;
      void request.respond({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'QA 503' }) });
    } else void request.continue();
  });
  await errorPage.goto(lab.portalUrl, { waitUntil: 'domcontentloaded' });
  await errorPage.evaluate(({ token, user }) => {
    localStorage.setItem('coro_client_token', token);
    localStorage.setItem('coro_client_user', JSON.stringify(user));
  }, { token: session.token, user: session.user });
  await errorPage.goto(`${lab.portalUrl}${route}`, { waitUntil: 'networkidle0' });
  const errorVisible = await errorPage.evaluate(() => document.body.innerText.includes('Impossible de charger'));
  let recovered = false;
  if (errorVisible) {
    await errorPage.click('section[role="alert"] button');
    await errorPage.waitForFunction(() => document.body.innerText.includes('50 incidents'));
    recovered = await errorPage.evaluate(() => document.body.innerText.includes('50 incidents'));
  }
  await errorPage.screenshot({ path: join(captureRoot, '503-recovered.png'), fullPage: true });

  const report = {
    generatedAt: new Date().toISOString(),
    sourceHead: process.env.CORO_QA_COMMIT_SHA,
    configurations: results,
    zoom200: { status: zoom.scrollWidth <= zoom.clientWidth ? 'PASS' : 'FAIL', ...zoom },
    keyboardFocus,
    f5Persistence: afterRefresh ? 'PASS' : 'FAIL',
    detailDestination,
    error503: { intercepted: intercepted503, visible: errorVisible, recovered },
    consoleErrors,
    verdict: results.every((item) => item.status === 'PASS') && afterRefresh && errorVisible && recovered ? 'PASS' : 'FAIL',
  };
  await writeFile(join(evidenceRoot, 'incident-list-browser-acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await context.close();
} finally {
  await browser.close().catch(() => undefined);
  await adapter.close().catch(() => undefined);
}
