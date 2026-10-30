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
const evidenceRoot = assertUnderQaRoot(process.env.CORO_QA_BUILDINGS_BROWSER_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-buildings\\browser');
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR), channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 2560, height: 1440 }];
const themes = [{ name: 'classic', ui: 'legacy', preference: 'LIGHT', expectedUi: 'legacy', expectedTheme: 'light' }, { name: 'glass-light', ui: 'glass', preference: 'LIGHT', expectedUi: 'glass', expectedTheme: 'light' }, { name: 'glass-dark', ui: 'glass', preference: 'DARK', expectedUi: 'glass', expectedTheme: 'dark' }];
const report = { sha: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), matrix: [], checks: [], consoleErrors: [], limitations: [{ id: 'real-screen-reader', status: 'NOT_VERIFIED', reason: 'No reliable screen-reader runtime is installed in this QA environment.' }] };
const check = (id, pass, detail) => report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const loginInternal = async () => {
  const email = 'customer-admin-a@global-e2e.test'; const startedAt = Date.now();
  await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } });
  const code = await lab.completeMfa({ email, key: email }, startedAt);
  const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } });
  return { token: verified.data.access_token, user: verified.data.user };
};
const measure = () => {
  // Navigation drawers intentionally live off-canvas when closed. Geometry is
  // asserted on the active page content so those inaccessible controls do not
  // become false overflow positives.
  const controls = [...document.querySelectorAll('main button,main a,main input,main select')].filter((node) => { const b = node.getBoundingClientRect(); return b.width > 0 && b.height > 0; }).map((node) => { const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width }; });
  const cards = [...document.querySelectorAll('[data-qa-building-card]')].map((node) => node.getBoundingClientRect().width);
  return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, outside: controls.filter((b) => b.left < -1 || b.right > innerWidth + 1).length, cards, ui: document.documentElement.dataset.ui, theme: document.documentElement.dataset.theme, text: document.body.innerText };
};

let browser;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const [admin, corporate] = await Promise.all([loginInternal(), lab.loginAs('clientCorporateA')]);
  browser = await puppeteer.launch({ headless: true });
  for (const target of [{ name: 'organization', origin: process.env.CORO_QA_FRONTEND_URL, path: '/buildings', tokenKey: 'coro_token', userKey: 'coro_user', session: admin }, { name: 'portal', origin: process.env.CORO_QA_PORTAL_URL, path: '/buildings', tokenKey: 'coro_client_token', userKey: 'coro_client_user', session: corporate }]) {
    const context = await browser.createBrowserContext(); const page = await context.newPage();
    page.on('console', (event) => { if (event.type() === 'error') report.consoleErrors.push(`${target.name}: ${event.text()}`); });
    page.on('pageerror', (error) => report.consoleErrors.push(`${target.name}: ${error.message}`));
    await page.goto(target.origin, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ tokenKey, userKey, session }) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem(tokenKey, session.token); localStorage.setItem(userKey, JSON.stringify(session.user)); }, { ...target, session: target.session });
    for (const viewport of viewports) for (const theme of themes) {
      await page.setViewport(viewport);
      await page.evaluate(({ ui, preference }) => { localStorage.setItem('coro-ui-generation', ui); localStorage.setItem('coro-theme-preference', preference); localStorage.setItem('coro-glass-beta', 'production-preview'); }, theme);
      await page.goto(`${target.origin}${target.path}`, { waitUntil: 'networkidle0' });
      if (target.name === 'organization') {
        await page.evaluate(() => { for (const node of document.querySelectorAll('.grid.gap-3 > div')) node.setAttribute('data-qa-building-card', 'true'); });
        const button = await page.$x?.("//button[contains(., 'Nouveau bâtiment')]");
        if (button?.[0]) await button[0].click(); else await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Nouveau bâtiment'))?.click());
        await page.waitForSelector('form', { timeout: 3000 });
        await page.keyboard.press('Escape');
      } else {
        await page.evaluate(() => { for (const node of document.querySelectorAll('div[style*="max-width: 445px"]')) node.setAttribute('data-qa-building-card', 'true'); });
      }
      const state = await page.evaluate(measure); const id = `${target.name}-${viewport.width}x${viewport.height}-${theme.name}`;
      const cardPass = target.name !== 'portal' || state.cards.every((width) => width <= 445.5 && width <= viewport.width);
      const pass = !state.overflow && state.outside === 0 && cardPass && state.ui === theme.expectedUi && state.theme === theme.expectedTheme;
      report.matrix.push({ id, status: pass ? 'PASS' : 'FAIL', overflow: state.overflow, controlsOutside: state.outside, cardWidths: state.cards, ui: state.ui, theme: state.theme });
      await page.screenshot({ path: join(evidenceRoot, `${id}.png`), fullPage: true });
    }
    await page.reload({ waitUntil: 'networkidle0' });
    check(`${target.name}-f5-session`, await page.evaluate((key) => Boolean(localStorage.getItem(key)), target.tokenKey), 'session survives F5');
    const cdp = await page.createCDPSession(); await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 }); const zoom = await page.evaluate(measure);
    check(`${target.name}-zoom-200`, !zoom.overflow && zoom.outside === 0, JSON.stringify({ overflow: zoom.overflow, outside: zoom.outside }));
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 }); await context.close();
  }
  check('matrix-24-of-24', report.matrix.length === 24 && report.matrix.every((row) => row.status === 'PASS'), `${report.matrix.filter((row) => row.status === 'PASS').length}/24`);
  check('no-critical-console-errors', report.consoleErrors.length === 0, JSON.stringify(report.consoleErrors));
} finally { if (browser) await browser.close().catch(() => undefined); await adapter.close().catch(() => undefined); }
report.pass = report.checks.every((row) => row.status === 'PASS') && report.matrix.every((row) => row.status === 'PASS');
await writeFile(join(evidenceRoot, 'organization-buildings-browser.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, matrix: report.matrix, checks: report.checks, limitations: report.limitations }, null, 2));
if (!report.pass) process.exitCode = 1;
