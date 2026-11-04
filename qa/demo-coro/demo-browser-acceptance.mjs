#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { startMfaCaptureAdapter } from '../global-e2e/src/mfa-capture-adapter.mjs';
import { assertLocalUrl, assertUnderQaRoot } from '../global-e2e/src/policy.mjs';
import { loadSecretStore } from '../global-e2e/src/secret-store.mjs';
import { demoActors } from './demo-identity-lab.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const require = createRequire(join(repositoryRoot, 'coro-backend', 'package.json'));
const puppeteer = require('puppeteer');
const apiUrl = assertLocalUrl(process.env.CORO_DEMO_QA_BACKEND_URL, 'CORO_DEMO_QA_BACKEND_URL').href.replace(/\/$/, '');
const frontendUrl = assertLocalUrl(process.env.CORO_DEMO_QA_FRONTEND_URL, 'CORO_DEMO_QA_FRONTEND_URL').href.replace(/\/$/, '');
const portalUrl = assertLocalUrl(process.env.CORO_DEMO_QA_PORTAL_URL, 'CORO_DEMO_QA_PORTAL_URL').href.replace(/\/$/, '');
const evidenceRoot = assertUnderQaRoot(resolve(process.env.CORO_DEMO_BROWSER_EVIDENCE || 'D:\\CORO-QA\\tracking\\demo-coro\\browser'));
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: resolve(process.env.CORO_QA_MFA_DIR), channelToken: secrets.mfaChannelToken });
const delay = (ms) => new Promise((done) => setTimeout(done, ms));

async function call(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${apiUrl}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data };
}

async function mfaCode(actor, after) {
  const url = new URL(`${adapter.url}/challenge`);
  url.searchParams.set('recipient', actor.email);
  url.searchParams.set('after', String(after));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await fetch(url, { headers: { authorization: `Bearer ${secrets.mfaChannelToken}` } });
    if (response.status === 200) return (await response.json()).code;
    if (response.status !== 404) throw new Error(`MFA_CAPTURE_${response.status}`);
    await delay(100);
  }
  throw new Error(`MFA_TIMEOUT_${actor.email}`);
}

async function login(actor) {
  const prefix = actor.kind === 'portal' ? '/client-auth' : '/auth';
  const after = Date.now();
  const started = await call(`${prefix}/login`, { method: 'POST', body: { email: actor.email, password: secrets.syntheticPassword } });
  if (started.status >= 300 || started.data?.mfaRequired !== true) throw new Error(`LOGIN_${actor.email}_${started.status}`);
  const verified = await call(`${prefix}/verify-mfa`, { method: 'POST', body: { email: actor.email, code: await mfaCode(actor, after) } });
  if (verified.status >= 300) throw new Error(`MFA_${actor.email}_${verified.status}`);
  return { portal: actor.kind === 'portal', token: actor.kind === 'portal' ? verified.data.token : verified.data.access_token, user: verified.data.user };
}

async function prime(page, session, theme) {
  await page.evaluateOnNewDocument(({ session: value, selected }) => {
    localStorage.setItem(value.portal ? 'coro_client_token' : 'coro_token', value.token);
    localStorage.setItem(value.portal ? 'coro_client_user' : 'coro_user', JSON.stringify(value.user));
    localStorage.setItem('coro-ui-generation', selected.ui);
    localStorage.setItem('coro-theme-preference', selected.preference);
    localStorage.setItem('coro-glass-beta', 'production-preview');
  }, { session, selected: theme });
}

const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 2560, height: 1440 }];
const themes = [{ name: 'classic', ui: 'legacy', preference: 'LIGHT' }, { name: 'glass-light', ui: 'glass', preference: 'LIGHT' }, { name: 'glass-dark', ui: 'glass', preference: 'DARK' }];
const report = { executedAt: new Date().toISOString(), environment: 'LOCAL_QA_ONLY', matrix: [], checks: [], consoleErrors: [], limitation: 'Local QA Chrome proof only; production account activation remains separate.' };
const check = (id, pass, detail) => report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const measure = () => ({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, outside: [...document.querySelectorAll('main button,main a,main input,main select')].filter((node) => { const box = node.getBoundingClientRect(); return box.width > 0 && box.height > 0 && (box.left < -1 || box.right > innerWidth + 1); }).length, text: document.body.innerText, path: location.pathname });

let browser;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const sessions = {
    advisor: await login(demoActors.advisor),
    clientResponsible: await login(demoActors.clientResponsible),
    buildingManager: await login(demoActors.buildingManager),
  };
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const viewport of viewports) for (const theme of themes) {
    const id = `${viewport.width}x${viewport.height}-${theme.name}`;
    const context = await browser.createBrowserContext();
    const app = await context.newPage();
    const portal = await context.newPage();
    for (const [kind, page] of [['app', app], ['portal', portal]]) {
      page.on('console', (event) => { if (event.type() === 'error') report.consoleErrors.push(`${id}-${kind}: ${event.text()}`); });
      page.on('pageerror', (error) => report.consoleErrors.push(`${id}-${kind}: ${error.message}`));
      await page.setViewport(viewport);
    }
    await prime(app, sessions.advisor, theme);
    await prime(portal, sessions.buildingManager, theme);
    await app.goto(`${frontendUrl}/projects`, { waitUntil: 'networkidle0', timeout: 90_000 });
    await portal.goto(`${portalUrl}/buildings`, { waitUntil: 'networkidle0', timeout: 90_000 });
    const appState = await app.evaluate(measure);
    const portalState = await portal.evaluate(measure);
    const pass = !appState.overflow && !portalState.overflow && appState.outside === 0 && portalState.outside === 0 && appState.text.includes('Édifice Boréal') && portalState.text.includes('Édifice Boréal') && !portalState.text.includes('Résidences des Érables');
    report.matrix.push({ id, status: pass ? 'PASS' : 'FAIL', app: { overflow: appState.overflow, outside: appState.outside, path: appState.path }, portal: { overflow: portalState.overflow, outside: portalState.outside, path: portalState.path } });
    await app.screenshot({ path: join(evidenceRoot, `${id}-app.png`), fullPage: true });
    await portal.screenshot({ path: join(evidenceRoot, `${id}-portal.png`), fullPage: true });
    await context.close();
  }
  const context = await browser.createBrowserContext();
  const corporate = await context.newPage();
  await corporate.setViewport({ width: 1440, height: 900 });
  await prime(corporate, sessions.clientResponsible, themes[1]);
  await corporate.goto(`${portalUrl}/buildings`, { waitUntil: 'networkidle0', timeout: 90_000 });
  const corporateText = await corporate.evaluate(() => document.body.innerText);
  check('corporate-organization-scope', corporateText.includes('Édifice Boréal') && corporateText.includes('Résidences des Érables') && corporateText.includes('Complexe Horizon'), 'three synthetic buildings visible');
  await corporate.reload({ waitUntil: 'networkidle0', timeout: 90_000 });
  check('f5-session', (await corporate.evaluate(() => document.body.innerText)).includes('Édifice Boréal'), 'session and scope preserved');
  await corporate.keyboard.press('Tab');
  check('keyboard-focus', await corporate.evaluate(() => document.activeElement !== document.body), await corporate.evaluate(() => document.activeElement?.tagName));
  const cdp = await corporate.createCDPSession();
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  const zoom = await corporate.evaluate(measure);
  check('zoom-200', !zoom.overflow && zoom.outside === 0, JSON.stringify({ overflow: zoom.overflow, outside: zoom.outside }));
  await corporate.screenshot({ path: join(evidenceRoot, 'corporate-1440-glass-light.png'), fullPage: true });
  await context.close();
  check('matrix-12-of-12', report.matrix.length === 12 && report.matrix.every((item) => item.status === 'PASS'), `${report.matrix.filter((item) => item.status === 'PASS').length}/12`);
  check('critical-console-errors', report.consoleErrors.length === 0, `count=${report.consoleErrors.length}`);
} finally {
  if (browser) await browser.close().catch(() => undefined);
  await adapter.close().catch(() => undefined);
}
report.pass = report.checks.every((item) => item.status === 'PASS') && report.matrix.every((item) => item.status === 'PASS');
await mkdir(dirname(join(evidenceRoot, 'browser-acceptance.json')), { recursive: true });
await writeFile(join(evidenceRoot, 'browser-acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ pass: report.pass, matrix: `${report.matrix.filter((item) => item.status === 'PASS').length}/${report.matrix.length}`, checks: report.checks, consoleErrors: report.consoleErrors.length, evidence: evidenceRoot })}\n`);
if (!report.pass) process.exitCode = 1;
