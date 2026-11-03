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
const evidenceRoot = assertUnderQaRoot(process.env.CORO_QA_INCIDENT_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-incident-list');
const captureRoot = join(evidenceRoot, 'browser');
await mkdir(captureRoot, { recursive: true });
const adapter = await startMfaCaptureAdapter({ captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR), channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const route = '/sentinelle/40000000-0000-4000-8000-000000000001/incidents';
const configurations = [['390x844', 390, 844], ['768x1024', 768, 1024], ['1440x900', 1440, 900], ['2560x1440', 2560, 1440]];
const themes = [['classic', 'legacy', 'LIGHT'], ['glass-light', 'glass', 'LIGHT'], ['glass-dark', 'glass', 'DARK']];
const results = [];
const consoleErrors = [];

async function authenticate(page, session) {
  await page.goto(lab.portalUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user }) => { localStorage.setItem('coro_client_token', token); localStorage.setItem('coro_client_user', JSON.stringify(user)); }, { token: session.token, user: session.user });
}
async function applyTheme(page, ui, preference) {
  await page.evaluate(({ ui, preference }) => { localStorage.setItem('coro-ui-generation', ui); localStorage.setItem('coro-theme-preference', preference); }, { ui, preference });
}
async function waitForResults(page) { await page.waitForFunction(() => document.body.innerText.includes('137 résultats')); }

try {
  const session = await lab.loginAs('clientCorporateA');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setBypassServiceWorker(true);
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300)); });
  await authenticate(page, session);

  for (const [theme, ui, preference] of themes) {
    for (const [viewport, width, height] of configurations) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await applyTheme(page, ui, preference);
      await page.goto(`${lab.portalUrl}${route}`, { waitUntil: 'networkidle0' });
      await waitForResults(page);
      const metrics = await page.evaluate(() => {
        const interactive = [...document.querySelectorAll('button,[role="link"],input,select')].filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).map((node) => {
          const rect = node.getBoundingClientRect();
          return { tag: node.tagName, label: node.getAttribute('aria-label') || node.textContent?.trim().slice(0, 80), width: Math.round(rect.width), height: Math.round(rect.height) };
        });
        const longContentVisible = document.body.innerText.includes('Coupure de courant') && document.body.innerText.includes('Incident réel');
        return { title: document.querySelector('h1')?.textContent?.trim(), bodyText: document.body.innerText.slice(0, 1200), scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, dataUi: document.documentElement.getAttribute('data-ui'), dataTheme: document.documentElement.getAttribute('data-theme'), undersized: interactive.filter((item) => item.height < 44 || item.width < 44), longContentVisible };
      });
      const pass = metrics.title?.includes('Historique des incidents') && metrics.bodyText.includes('137 résultats') && metrics.scrollWidth <= metrics.clientWidth && metrics.undersized.length === 0 && metrics.longContentVisible && metrics.dataUi === ui && metrics.dataTheme === (preference === 'DARK' ? 'dark' : 'light');
      const file = `${theme}-${viewport}.png`;
      await page.screenshot({ path: join(captureRoot, file), fullPage: true });
      results.push({ theme, viewport, status: pass ? 'PASS' : 'FAIL', metrics, screenshot: file });
    }
  }

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.evaluate(() => { document.body.style.zoom = '2'; });
  const zoom = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  await page.screenshot({ path: join(captureRoot, 'zoom-200.png'), fullPage: true });
  await page.evaluate(() => { document.body.style.zoom = '1'; });
  await page.keyboard.press('Tab');
  const keyboardFocus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim() }));
  await page.reload({ waitUntil: 'networkidle0' });
  await waitForResults(page);
  const f5Persistence = await page.evaluate(() => document.body.innerText.includes('137 résultats'));
  await page.click('nav[aria-label="Pagination des incidents"] button:last-of-type');
  await page.waitForFunction(() => document.body.innerText.includes('Page 2 sur 6'));
  const pageTwo = await page.evaluate(() => document.body.innerText.includes('26–50 sur 137'));

  const firstRow = await page.$('[role="link"]');
  await firstRow?.press('Enter');
  await page.waitForFunction(() => /\/incidents\/[^/]+$/.test(location.pathname));
  const detailDestination = new URL(page.url()).pathname;

  const errorPage = await context.newPage();
  await errorPage.setBypassServiceWorker(true);
  await authenticate(errorPage, session);
  await errorPage.goto(`${lab.portalUrl}${route}`, { waitUntil: 'networkidle0' });
  await waitForResults(errorPage);
  await errorPage.type('input[placeholder*="incendie"]', 'P003');
  await errorPage.waitForFunction(() => document.body.innerText.includes('46 résultats'));
  let failOnce = true;
  let intercepted503 = 0;
  await errorPage.setRequestInterception(true);
  errorPage.on('request', (request) => {
    if (failOnce && request.url().includes('/client-portal/incidents/buildings/') && request.url().includes('/history')) {
      failOnce = false; intercepted503 += 1;
      void request.respond({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'QA 503' }) });
    } else void request.continue();
  });
  await errorPage.click('button[aria-label="Actualiser l’historique des incidents"]');
  await errorPage.waitForFunction(() => document.body.innerText.includes('Actualisation échouée'));
  const errorState = await errorPage.evaluate(() => ({ visible: document.body.innerText.includes('Actualisation échouée'), retained: document.body.innerText.includes('46 résultats'), search: document.querySelector('input')?.value }));
  await errorPage.click('section[role="alert"] button');
  await errorPage.waitForFunction(() => !document.body.innerText.includes('Actualisation échouée'));
  const recovered = await errorPage.evaluate(() => document.body.innerText.includes('46 résultats') && document.querySelector('input')?.value === 'P003');
  await errorPage.screenshot({ path: join(captureRoot, '503-recovered.png'), fullPage: true });

  const racePage = await context.newPage();
  await racePage.setBypassServiceWorker(true);
  await authenticate(racePage, session);
  await racePage.goto(`${lab.portalUrl}${route}`, { waitUntil: 'networkidle0' });
  await waitForResults(racePage);
  await racePage.setRequestInterception(true);
  racePage.on('request', (request) => {
    if (request.url().includes('/history') && request.url().includes('search=incendie')) setTimeout(() => void request.continue(), 700);
    else void request.continue();
  });
  const input = await racePage.$('input');
  await input?.type('incendie');
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 350));
  await input?.focus();
  await racePage.keyboard.down('Control');
  await racePage.keyboard.press('A');
  await racePage.keyboard.up('Control');
  await racePage.keyboard.press('Backspace');
  await input?.type('medical');
  await racePage.waitForFunction(() => document.body.innerText.includes('46 résultats'));
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 900));
  const raceProtected = await racePage.evaluate(() => document.querySelector('input')?.value === 'medical' && document.body.innerText.includes('Urgence médicale') && !document.body.innerText.includes('Alerte incendie'));

  const report = { generatedAt: new Date().toISOString(), sourceHead: process.env.CORO_QA_COMMIT_SHA, configurations: results, zoom200: { status: zoom.scrollWidth <= zoom.clientWidth ? 'PASS' : 'FAIL', ...zoom }, keyboardFocus, f5Persistence: f5Persistence ? 'PASS' : 'FAIL', pagination: pageTwo ? 'PASS' : 'FAIL', detailDestination, error503: { intercepted: intercepted503, ...errorState, recovered }, responseOrdering: raceProtected ? 'PASS' : 'FAIL', consoleErrors, verdict: results.every((item) => item.status === 'PASS') && zoom.scrollWidth <= zoom.clientWidth && f5Persistence && pageTwo && intercepted503 === 1 && errorState.visible && errorState.retained && recovered && raceProtected && consoleErrors.length === 0 ? 'PASS' : 'FAIL' };
  await writeFile(join(evidenceRoot, 'incident-list-browser-acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await context.close();
} catch (error) {
  const diagnostic = {
    generatedAt: new Date().toISOString(),
    sourceHead: process.env.CORO_QA_COMMIT_SHA,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack?.split('\n').slice(0, 8) : undefined,
  };
  await writeFile(join(evidenceRoot, 'incident-list-browser-error.json'), `${JSON.stringify(diagnostic, null, 2)}\n`);
  console.error(JSON.stringify(diagnostic, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => undefined);
  await adapter.close().catch(() => undefined);
}
