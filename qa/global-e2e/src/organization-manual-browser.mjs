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
const evidenceRoot = assertUnderQaRoot(process.env.CORO_QA_MANUAL_EVIDENCE || 'D:\\CORO-QA\\audits\\organization-manual\\browser');
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR), channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 2560, height: 1440 }];
const themes = [{ name: 'classic', ui: 'legacy', preference: 'LIGHT' }, { name: 'glass-light', ui: 'glass', preference: 'LIGHT' }, { name: 'glass-dark', ui: 'glass', preference: 'DARK' }];
const report = { sha: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), matrix: [], checks: [], consoleErrors: [], limitation: 'Lecteur d’écran réel NOT_VERIFIED; rôles/annonces vérifiés dans le DOM accessible.' };
const check = (id, pass, detail) => report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const measure = () => ({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, outside: [...document.querySelectorAll('main button,main a,main input,main select')].filter((node) => { const box = node.getBoundingClientRect(); return box.width > 0 && box.height > 0 && (box.left < -1 || box.right > innerWidth + 1); }).length, text: document.body.innerText, active: document.activeElement?.tagName });
async function prime(page, session, theme) { await page.evaluateOnNewDocument(({ session, theme }) => { localStorage.setItem(session.portal ? 'coro_client_token' : 'coro_token', session.token); localStorage.setItem(session.portal ? 'coro_client_user' : 'coro_user', JSON.stringify(session.user)); localStorage.setItem('coro-ui-generation', theme.ui); localStorage.setItem('coro-theme-preference', theme.preference); localStorage.setItem('coro-glass-beta', 'production-preview'); }, { session, theme }); }

let browser;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const internal = await lab.loginAs('founder');
  const client = await lab.loginAs('clientLocalA');
  check('anonymous-internal-denial', (await lab.call('/user-manual')).status === 401, 'GET /user-manual');
  check('anonymous-client-denial', (await lab.call('/client-portal/user-manual')).status === 401, 'GET /client-portal/user-manual');
  check('revoked-login-denial', (await lab.loginAs('revokedUser')).denied === true, 'revoked identity denied');
  const internalList = await lab.call('/user-manual', { token: internal.token });
  const clientList = await lab.call('/client-portal/user-manual', { token: client.token });
  const required = ['clients', 'carte', 'conformite', 'bibliotheque', 'parametres'];
  check('internal-catalogue', internalList.status === 200 && required.every((id) => internalList.data.articles.some((item) => item.id === id)), `version ${internalList.data?.version}`);
  check('client-scope', clientList.status === 200 && required.every((id) => !clientList.data.articles.some((item) => item.id === id)), 'internal-only articles excluded');
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const viewport of viewports) for (const theme of themes) {
    const id = `${viewport.width}x${viewport.height}-${theme.name}`;
    const context = await browser.createBrowserContext();
    const internalPage = await context.newPage();
    internalPage.on('console', (event) => { if (event.type() === 'error') report.consoleErrors.push(`${id}-internal: ${event.text()}`); });
    internalPage.on('pageerror', (error) => report.consoleErrors.push(`${id}-internal: ${error.message}`));
    await internalPage.setViewport(viewport); await prime(internalPage, internal, theme);
    await internalPage.goto(`${process.env.CORO_QA_FRONTEND_URL}/manual#timelog`, { waitUntil: 'networkidle0', timeout: 60_000 });
    await internalPage.waitForSelector('#timelog');
    await internalPage.waitForFunction(() => { const box = document.getElementById('timelog')?.getBoundingClientRect(); return location.hash === '#timelog' && box && box.top < innerHeight && box.bottom > 0; });
    const internalState = await internalPage.evaluate(measure);
    const anchored = await internalPage.evaluate(() => { const box = document.getElementById('timelog').getBoundingClientRect(); return location.hash === '#timelog' && box.top < innerHeight && box.bottom > 0; });
    const portalPage = await context.newPage();
    portalPage.on('console', (event) => { if (event.type() === 'error') report.consoleErrors.push(`${id}-portal: ${event.text()}`); });
    await portalPage.setViewport(viewport); await prime(portalPage, client, theme);
    await portalPage.goto(`${process.env.CORO_QA_PORTAL_URL}/manual#activites`, { waitUntil: 'networkidle0', timeout: 60_000 });
    await portalPage.waitForSelector('#activites');
    await portalPage.waitForFunction(() => { const box = document.getElementById('activites')?.getBoundingClientRect(); return location.hash === '#activites' && box && box.top < innerHeight && box.bottom > 0; });
    const portalState = await portalPage.evaluate(measure);
    const portalAnchored = await portalPage.evaluate(() => { const box = document.getElementById('activites').getBoundingClientRect(); return location.hash === '#activites' && box.top < innerHeight && box.bottom > 0; });
    const pass = !internalState.overflow && !portalState.overflow && internalState.outside === 0 && portalState.outside === 0 && anchored && portalAnchored;
    report.matrix.push({ id, status: pass ? 'PASS' : 'FAIL', internalOverflow: internalState.overflow, portalOverflow: portalState.overflow, anchored, portalAnchored });
    await internalPage.screenshot({ path: join(evidenceRoot, `${id}-internal.png`), fullPage: true });
    await portalPage.screenshot({ path: join(evidenceRoot, `${id}-portal.png`), fullPage: true });
    await context.close();
  }
  const context = await browser.createBrowserContext(); const page = await context.newPage(); await page.setViewport({ width: 1440, height: 900 }); await prime(page, internal, themes[0]);
  await page.goto(`${process.env.CORO_QA_FRONTEND_URL}/manual#timelog`, { waitUntil: 'networkidle0' }); await page.waitForSelector('#timelog');
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForFunction(() => { const box = document.getElementById('timelog')?.getBoundingClientRect(); return box && box.top < innerHeight && box.bottom > 0; }); check('f5-anchor', true, 'deep link restored after F5');
  await page.evaluate(() => { location.hash = '#clients'; }); await page.waitForFunction(() => document.getElementById('clients').getBoundingClientRect().top < innerHeight); check('hash-change', true, '#clients');
  await page.evaluate(() => { location.hash = '#carte'; }); await page.goBack({ waitUntil: 'networkidle0' }); const historyState = await page.evaluate(() => ({ hash: location.hash, visible: document.getElementById('clients').getBoundingClientRect().top < innerHeight })); check('back-forward', historyState.hash === '#clients' && historyState.visible, historyState.hash);
  await page.focus('input[type="search"]'); await page.keyboard.type('zzzz-aucun-resultat'); check('empty-search', (await page.evaluate(() => document.body.innerText)).includes('Aucun article ne correspond'), 'explicit empty state');
  await page.keyboard.press('Tab'); check('keyboard-focus', await page.evaluate(() => document.activeElement !== document.body), await page.evaluate(() => document.activeElement?.tagName));
  const cdp = await page.createCDPSession(); await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 }); const zoom = await page.evaluate(measure); check('zoom-200', !zoom.overflow && zoom.outside === 0, JSON.stringify(zoom));
  await context.close();
  const retryContext = await browser.createBrowserContext(); const retryPage = await retryContext.newPage(); await retryPage.setViewport({ width: 390, height: 844 }); await prime(retryPage, internal, themes[0]); let fail = true; await retryPage.setRequestInterception(true); retryPage.on('request', (request) => fail && request.url().includes('/api/user-manual') ? request.respond({ status: 503, contentType: 'application/json', body: '{"message":"synthetic"}' }) : request.continue()); await retryPage.goto(`${process.env.CORO_QA_FRONTEND_URL}/manual#timelog`, { waitUntil: 'networkidle0' }); check('error-alert', await retryPage.evaluate(() => Boolean(document.querySelector('[role="alert"]'))), 'accessible alert'); fail = false; await retryPage.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Réessayer'))?.click()); await retryPage.waitForSelector('#timelog'); await retryPage.waitForFunction(() => { const box = document.getElementById('timelog')?.getBoundingClientRect(); return box && box.top < innerHeight && box.bottom > 0; }); check('retry-anchor', true, 'retry restores deep link'); await retryContext.close();
  check('matrix-12-of-12', report.matrix.length === 12 && report.matrix.every((item) => item.status === 'PASS'), `${report.matrix.filter((item) => item.status === 'PASS').length}/12`);
  check('console', report.consoleErrors.length === 0, JSON.stringify(report.consoleErrors));
} finally { if (browser) await browser.close().catch(() => undefined); await adapter.close().catch(() => undefined); }
report.pass = report.checks.every((item) => item.status === 'PASS') && report.matrix.every((item) => item.status === 'PASS');
await writeFile(join(evidenceRoot, 'organization-manual-browser.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ pass: report.pass, matrix: report.matrix, checks: report.checks, limitation: report.limitation }, null, 2));
if (!report.pass) process.exitCode = 1;
