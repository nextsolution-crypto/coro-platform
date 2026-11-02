#!/usr/bin/env node
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const puppeteer = require('puppeteer');
const frontend = process.env.CORO_QA_FRONTEND_URL;
const evidenceDir = process.env.CORO_QA_PERFORMANCE_BROWSER_EVIDENCE;
const sessions = JSON.parse(await readFile(process.env.CORO_QA_SESSION_CHECKPOINT, 'utf8'));
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(frontend || '')) throw new Error('Loopback QA frontend required.');

const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 2560, height: 1440 }];
const themes = [{ name: 'classic', ui: 'legacy', preference: 'LIGHT' }, { name: 'glass-light', ui: 'glass', preference: 'LIGHT' }, { name: 'glass-dark', ui: 'glass', preference: 'DARK' }];
const report = { candidate: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), matrix: [], checks: [], consoleErrors: [], network: [] };
const check = (id, pass, detail) => report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
await mkdir(evidenceDir, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--no-proxy-server'] });
try {
  const context = await browser.createBrowserContext(); const page = await context.newPage();
  page.on('console', (event) => { if (event.type() === 'error') report.consoleErrors.push(event.text()); });
  page.on('requestfailed', (request) => report.network.push({ url: request.url().replace(/127\.0\.0\.1:\d+/, 'loopback'), status: 'FAILED', error: request.failure()?.errorText }));
  page.on('response', (response) => { if (response.url().includes('/api/rendement')) report.network.push({ url: response.url().replace(/127\.0\.0\.1:\d+/, 'loopback'), status: response.status() }); });
  await page.goto(frontend, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ access_token, user }) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('coro_token', access_token); localStorage.setItem('coro_user', JSON.stringify(user)); }, sessions.advisor);
  for (const viewport of viewports) for (const theme of themes) {
    await page.setViewport(viewport);
    await page.evaluate(({ ui, preference }) => { localStorage.setItem('coro-ui-generation', ui); localStorage.setItem('coro-theme-preference', preference); localStorage.setItem('coro-glass-beta', 'production-preview'); }, theme);
    await page.goto(`${frontend}/profile/rendement`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const values = ['2026-10-01', '2026-10-31'];
      [...document.querySelectorAll('input[type="date"]')].forEach((input, index) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, values[index]);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    await page.waitForFunction(() => /8\.0 h/.test(document.body.innerText) || document.querySelector('[role="alert"]'), { timeout: 10000 }).catch(() => {});
    const state = await page.evaluate(() => ({ text: document.body.innerText, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, alerts: [...document.querySelectorAll('[role="alert"]')].map((n) => n.textContent), status: [...document.querySelectorAll('[role="status"]')].map((n) => n.textContent), dates: [...document.querySelectorAll('input[type="date"]')].map((n) => n.value), controls: [...document.querySelectorAll('button,a,input')].filter((n) => { const b=n.getBoundingClientRect(); const s=getComputedStyle(n); return b.width>0&&b.height>0&&b.right>0&&b.left<innerWidth&&b.bottom>0&&b.top<innerHeight&&s.visibility!=='hidden'&&s.display!=='none'; }).map((n) => { const b=n.getBoundingClientRect(); return { left:b.left,right:b.right }; }) }));
    const id = `${viewport.width}x${viewport.height}-${theme.name}`;
    const pass = !state.overflow && state.controls.every((b) => b.left >= -1 && b.right <= viewport.width + 1) && /8\.0 h/.test(state.text) && /Rendement op.rationnel/i.test(state.text) && state.alerts.length === 0;
    report.matrix.push({ id, status: pass ? 'PASS' : 'FAIL', overflow: state.overflow, controlsOutside: state.controls.filter((b) => b.left < -1 || b.right > viewport.width + 1).length, dates: state.dates });
    await page.screenshot({ path: join(evidenceDir, `rendement-${id}.png`), fullPage: true });
  }
  await page.reload({ waitUntil: 'networkidle0' });
  check('f5-session-persists', /Mon rendement op.rationnel/i.test(await page.evaluate(() => document.body.innerText)), 'authenticated route survives F5; date filters reset to the current month by design');
  await page.keyboard.press('Tab');
  check('keyboard-focus-visible', await page.evaluate(() => document.activeElement !== document.body), await page.evaluate(() => document.activeElement?.tagName || 'none'));
  const cdp = await page.createCDPSession(); await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  const zoom = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }));
  check('zoom-200-no-page-overflow', !zoom.overflow, JSON.stringify(zoom)); await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  await page.evaluate(({ access_token, user }) => { localStorage.setItem('coro_token', access_token); localStorage.setItem('coro_user', JSON.stringify(user)); }, sessions.admin);
  const adminPage = await context.newPage();
  await adminPage.goto(`${frontend}/dashboard/rendement`, { waitUntil: 'networkidle0' });
  await adminPage.waitForFunction(() => document.querySelector('[role="alert"]') || /Rendement et rentabilit/.test(document.body.innerText), { timeout: 10000 }).catch(() => {});
  const deniedText = await adminPage.evaluate(() => document.body.innerText);
  check('admin-financial-error-visible', /indicateurs financiers ne peuvent pas/i.test(deniedText), 'backend 403 is surfaced as a generic error');
  await adminPage.screenshot({ path: join(evidenceDir, 'financial-admin-denied.png'), fullPage: true });
  await adminPage.close();
  check('matrix-12-of-12', report.matrix.length === 12 && report.matrix.every((row) => row.status === 'PASS'), `${report.matrix.filter((row) => row.status === 'PASS').length}/12`);
  check('no-critical-console-errors', report.consoleErrors.length === 0, JSON.stringify(report.consoleErrors));
  await context.close();
} finally { await browser.close(); }
report.pass = report.matrix.every((row) => row.status === 'PASS') && report.checks.every((row) => row.status === 'PASS');
await writeFile(join(evidenceDir, 'performance-browser-acceptance.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, matrix: report.matrix, checks: report.checks, consoleErrors: report.consoleErrors }, null, 2));
if (!report.pass) process.exitCode = 1;
