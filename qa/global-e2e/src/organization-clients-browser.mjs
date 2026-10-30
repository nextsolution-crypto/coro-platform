#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';

const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const puppeteer = require('puppeteer');
const evidenceRoot = assertUnderQaRoot(process.env.CORO_QA_CLIENTS_BROWSER_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-clients\\browser');
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: process.env.CORO_QA_MFA_DIR, channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 2560, height: 1440 }];
const themes = [{ name: 'classic', ui: 'legacy', preference: 'LIGHT', expectedUi: 'legacy', expectedTheme: 'light' }, { name: 'glass-light', ui: 'glass', preference: 'LIGHT', expectedUi: 'glass', expectedTheme: 'light' }, { name: 'glass-dark', ui: 'glass', preference: 'DARK', expectedUi: 'glass', expectedTheme: 'dark' }];
const report = { sha: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), matrix: [], checks: [], consoleErrors: [], limitations: [{ id: 'real-screen-reader', status: 'NOT_VERIFIED', reason: 'No reliable screen-reader runtime is available in the isolated QA harness.' }] };
const check = (id, pass, detail) => report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const measure = () => {
  const dialog = document.querySelector('[role="dialog"]');
  const controls = [...document.querySelectorAll('button,a,input')].filter((node) => { const box = node.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((node) => { const box = node.getBoundingClientRect(); return { left: box.left, right: box.right }; });
  return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, outside: controls.filter((box) => box.right > 0 && box.left < innerWidth && (box.left < -1 || box.right > innerWidth + 1)).length, dialog: Boolean(dialog), active: document.activeElement?.tagName, ui: document.documentElement.dataset.ui, theme: document.documentElement.dataset.theme, text: document.body.innerText };
};

let browser; let isolated;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const email = 'customer-admin-a@global-e2e.test';
  const startedAt = Date.now();
  const first = await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } });
  if (first.status >= 300 || !first.data?.mfaRequired) throw new Error(`Password/MFA preflight failed: ${first.status}`);
  const code = await lab.completeMfa({ email, key: 'customer-admin-a' }, startedAt);
  const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } });
  if (verified.status >= 300 || verified.data?.user?.role !== 'ADMIN') throw new Error(`ADMIN MFA verification failed: ${verified.status}`);
  const session = { actor: { key: 'customer-admin-a', role: 'ADMIN' }, portal: false, token: verified.data.access_token, refresh: verified.data.refresh_token, user: verified.data.user };
  browser = await puppeteer.launch({ headless: true });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.goto(process.env.CORO_QA_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user }) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('coro_token', token); localStorage.setItem('coro_user', JSON.stringify(user)); }, { token: session.token, user: session.user });
  isolated = { browser, context, page, ownedBrowser: false, session };
  isolated.page.on('console', (event) => { if (event.type() === 'error') report.consoleErrors.push(event.text()); });
  isolated.page.on('pageerror', (error) => report.consoleErrors.push(error.message));
  for (const viewport of viewports) for (const theme of themes) {
    await isolated.page.setViewport(viewport);
    await isolated.page.evaluate(({ ui, preference }) => { localStorage.setItem('coro-ui-generation', ui); localStorage.setItem('coro-theme-preference', preference); localStorage.setItem('coro-glass-beta', 'production-preview'); }, theme);
    await isolated.page.goto(`${process.env.CORO_QA_FRONTEND_URL}/clients`, { waitUntil: 'networkidle0' });
    await isolated.page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find((node) => node.textContent?.includes('Nouveau client'));
      if (!(button instanceof HTMLButtonElement)) throw new Error('Create client button unavailable');
      button.click();
    });
    await isolated.page.waitForSelector('[role="dialog"]');
    const state = await isolated.page.evaluate(measure);
    const id = `${viewport.width}x${viewport.height}-${theme.name}`;
    const pass = !state.overflow && state.outside === 0 && state.dialog && state.active === 'INPUT' && state.ui === theme.expectedUi && state.theme === theme.expectedTheme;
    report.matrix.push({ id, status: pass ? 'PASS' : 'FAIL', overflow: state.overflow, controlsOutside: state.outside, dialog: state.dialog, focus: state.active, ui: state.ui, theme: state.theme });
    await isolated.page.screenshot({ path: join(evidenceRoot, `clients-${id}.png`), fullPage: true });
    await isolated.page.keyboard.press('Escape');
    check(`escape-${id}`, !(await isolated.page.$('[role="dialog"]')), 'dialog closes with Escape');
    let confirmation = '';
    isolated.page.once('dialog', async (dialog) => { confirmation = dialog.message(); await dialog.dismiss(); });
    await isolated.page.evaluate(() => {
      const button = document.querySelector('button[title="Désactiver le client"]');
      if (!(button instanceof HTMLButtonElement)) throw new Error('Deactivate client button unavailable');
      button.click();
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
    check(`deactivation-confirmation-${id}`, /accès portail/i.test(confirmation) && /historique/i.test(confirmation) && /nouvelle authentification/i.test(confirmation), confirmation);
  }
  await isolated.page.reload({ waitUntil: 'networkidle0' });
  check('f5-session', await isolated.page.evaluate(() => Boolean(localStorage.getItem('coro_token')) && /Clients/i.test(document.body.innerText)), 'authenticated page survives reload');
  const cdp = await isolated.page.createCDPSession();
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  const zoom = await isolated.page.evaluate(measure);
  check('zoom-200', !zoom.overflow && zoom.outside === 0, JSON.stringify({ overflow: zoom.overflow, outside: zoom.outside }));
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  check('matrix-12-of-12', report.matrix.length === 12 && report.matrix.every((row) => row.status === 'PASS'), `${report.matrix.filter((row) => row.status === 'PASS').length}/12`);
  check('no-critical-console-errors', report.consoleErrors.length === 0, JSON.stringify(report.consoleErrors));
} finally {
  if (isolated?.context) await isolated.context.close().catch(() => undefined);
  if (browser) await browser.close().catch(() => undefined);
  await adapter.close().catch(() => undefined);
}
report.pass = report.checks.every((item) => item.status === 'PASS') && report.matrix.every((item) => item.status === 'PASS');
await writeFile(join(evidenceRoot, 'organization-clients-browser.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, matrix: report.matrix, checks: report.checks, limitations: report.limitations }, null, 2));
if (!report.pass) process.exitCode = 1;
