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
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const secrets = await loadSecretStore();
const evidenceRoot = assertUnderQaRoot(process.env.CORO_QA_INCIDENT_DETAIL_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-incident-detail');
const captureRoot = join(evidenceRoot, 'browser');
await mkdir(captureRoot, { recursive: true });
const adapter = await startMfaCaptureAdapter({ captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR), channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const incidentId = 'incident-detail-qa-exercise';
const route = `/sentinelle/40000000-0000-4000-8000-000000000001/incidents/${incidentId}`;
const viewports = [['390x844',390,844],['768x1024',768,1024],['1440x900',1440,900],['2560x1440',2560,1440]];
const themes = [['classic','legacy','LIGHT'],['glass-light','glass','LIGHT'],['glass-dark','glass','DARK']];
const configurations = [];
const consoleErrors = [];

async function authenticate(page, session) {
  await page.goto(lab.portalUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user }) => { localStorage.setItem('coro_client_token', token); localStorage.setItem('coro_client_user', JSON.stringify(user)); }, { token: session.token, user: session.user });
}
async function applyTheme(page, ui, preference) { await page.evaluate(({ ui, preference }) => { localStorage.setItem('coro-ui-generation', ui); localStorage.setItem('coro-theme-preference', preference); }, { ui, preference }); }
async function waitForDetail(page) {
  try { await page.waitForFunction(() => Boolean(document.querySelector('h1')) && document.body.innerText.includes('Imprimer le rapport'), { timeout: 12_000 }); }
  catch (error) {
    const diagnostic = await page.evaluate(() => ({ url: location.href, body: document.body.innerText.slice(0, 1200) }));
    throw new Error(`Detail readiness failed: ${JSON.stringify(diagnostic)}`, { cause: error });
  }
}

try {
  await prisma.incidentEvent.update({ where: { id: incidentId }, data: { status: 'ACTIVE', isActive: true, containedAt: null, resolvedAt: null, closingNotes: null, lockVersion: 0, occupantsSnapshot: { historical: 'malformed' }, teamSnapshot: null, rexRecommendations: '<script>globalThis.__qaPrintScript=1</script>' } });
  await prisma.incidentLog.deleteMany({ where: { incidentEventId: incidentId, action: { startsWith: '<img src=x onerror=' } } });
  await prisma.incidentLog.create({ data: { incidentEventId: incidentId, action: '<img src=x onerror="globalThis.__qaPrintLog=1">', actor: 'SYSTEM:qa', details: '<script>globalThis.__qaPrintDetail=1</script>', isAutomatic: false } });
  const session = await lab.loginAs('clientCorporateA');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setBypassServiceWorker(true);
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300)); });
  await authenticate(page, session);
  for (const [theme, ui, preference] of themes) {
    for (const [viewport, width, height] of viewports) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await applyTheme(page, ui, preference);
      await page.goto(`${lab.portalUrl}${route}`, { waitUntil: 'networkidle0' });
      await waitForDetail(page);
      const metrics = await page.evaluate(() => {
        const interactives = [...document.querySelectorAll('button,input,textarea,a,[role="button"]')].filter((node) => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map((node) => { const r = node.getBoundingClientRect(); return { label: node.getAttribute('aria-label') || node.textContent?.trim().slice(0, 70), width: Math.round(r.width), height: Math.round(r.height) }; });
        return { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, heading: document.querySelector('h1')?.textContent?.trim(), hasExerciseLabel: /exercice/i.test(document.body.innerText), hasResponsible: /responsable/i.test(document.body.innerText), hasFreshness: /modifi|mise à jour|dernière information/i.test(document.body.innerText), hasSnapshotWarning: /données historiques.*incomplètes/i.test(document.body.innerText), undersized: interactives.filter((item) => item.width < 44 || item.height < 44), body: document.body.innerText.slice(0, 1000), dataUi: document.documentElement.getAttribute('data-ui'), dataTheme: document.documentElement.getAttribute('data-theme') };
      });
      const pass = metrics.heading && metrics.hasSnapshotWarning && metrics.scrollWidth <= metrics.clientWidth && metrics.undersized.length === 0;
      const screenshot = `${theme}-${viewport}.png`;
      await page.screenshot({ path: join(captureRoot, screenshot), fullPage: true });
      configurations.push({ theme, viewport, status: pass ? 'PASS' : 'FAIL', screenshot, metrics });
    }
  }
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`${lab.portalUrl}${route}`, { waitUntil: 'networkidle0' });
  await waitForDetail(page);
  const transitionBaseline = await prisma.incidentLog.groupBy({ by: ['action'], where: { incidentEventId: incidentId, action: { in: ['Incident contenu', 'Incident résolu'] } }, _count: true });
  const baselineCounts = Object.fromEntries(transitionBaseline.map((entry) => [entry.action, entry._count]));
  await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => /résoudre l.incident/i.test(button.textContent || ''))?.click());
  await page.waitForFunction(() => document.body.innerText.includes('Le motif de résolution est obligatoire.'));
  const requiredReason = await page.evaluate(() => Boolean(document.querySelector('[role="alert"]')));
  await page.evaluate(() => { const button = [...document.querySelectorAll('button')].find((candidate) => /contenir l.incident/i.test(candidate.textContent || '')); button?.click(); button?.click(); });
  await page.waitForFunction(() => document.body.innerText.includes('Contenu'));
  const textarea = await page.$('#incident-closing-reason');
  await textarea?.type('Résolution navigateur synthétique');
  await page.evaluate(() => { const button = [...document.querySelectorAll('button')].find((candidate) => /résoudre l.incident/i.test(candidate.textContent || '')); button?.click(); button?.click(); });
  await page.waitForFunction(() => document.body.innerText.includes('Résolu') && !document.body.innerText.includes('Actions sur l’incident'));
  const transitionLogs = await prisma.incidentLog.groupBy({ by: ['action'], where: { incidentEventId: incidentId, action: { in: ['Incident contenu', 'Incident résolu'] } }, _count: true });
  const transitionCounts = Object.fromEntries(transitionLogs.map((entry) => [entry.action, entry._count]));
  const browserActions = {
    requiredReason,
    containEffects: (transitionCounts['Incident contenu'] || 0) - (baselineCounts['Incident contenu'] || 0),
    resolveEffects: (transitionCounts['Incident résolu'] || 0) - (baselineCounts['Incident résolu'] || 0),
  };
  await page.evaluate(() => { document.body.style.zoom = '2'; });
  const zoom = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  await page.screenshot({ path: join(captureRoot, 'zoom-200.png'), fullPage: true });
  await page.evaluate(() => { document.body.style.zoom = '1'; });
  await page.keyboard.press('Tab');
  const keyboardFocus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, visible: !!document.activeElement && getComputedStyle(document.activeElement).outlineStyle !== 'none' }));
  await page.reload({ waitUntil: 'networkidle0' });
  await waitForDetail(page);
  const f5 = await page.evaluate(() => document.body.innerText.includes('Retour d'));

  const deniedSession = await lab.loginAs('clientWithoutBuildings');
  const deniedPage = await context.newPage();
  await deniedPage.setBypassServiceWorker(true);
  await authenticate(deniedPage, deniedSession);
  await deniedPage.goto(`${lab.portalUrl}${route}`, { waitUntil: 'networkidle0' });
  await deniedPage.waitForSelector('[role="alert"]', { timeout: 12_000 });
  const scopeDenial = await deniedPage.evaluate(() => /accès refusé|incident introuvable/i.test(document.body.innerText) && !document.body.innerText.includes('Actions sur l’incident'));
  await deniedPage.close();

  const printTargetPromise = browser.waitForTarget((target) => target.opener() === page.target(), { timeout: 12_000 });
  await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => /imprimer le rapport/i.test(button.textContent || ''))?.click());
  const printTarget = await printTargetPromise;
  const printPage = await printTarget.page();
  await printPage?.waitForSelector('.header', { timeout: 12_000 });
  const printSafety = await printPage?.evaluate(() => ({
    hasExecutablePayload: Boolean(document.querySelector('script, img[onerror]')) || Boolean(globalThis.__qaPrintXss || globalThis.__qaPrintScript || globalThis.__qaPrintLog || globalThis.__qaPrintDetail),
    containsLiteralPayload: document.body.innerText.includes('globalThis.__qaPrint'),
    legalDisclaimer: document.body.innerText.includes('Aucune certification PDF/UA ou valeur juridique'),
  }));
  await printPage?.close();

  const errorPage = await context.newPage();
  await errorPage.setBypassServiceWorker(true);
  await authenticate(errorPage, session);
  await errorPage.setRequestInterception(true);
  let intercepted = 0;
  errorPage.on('request', (request) => {
    if (!intercepted && request.url().includes(`/client-portal/incidents/${incidentId}/detail`)) { intercepted += 1; void request.respond({ status: 503, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': lab.portalUrl, 'Access-Control-Allow-Credentials': 'true' }, body: JSON.stringify({ message: 'QA 503' }) }); }
    else void request.continue();
  });
  await errorPage.goto(`${lab.portalUrl}${route}`, { waitUntil: 'networkidle0' });
  await errorPage.waitForSelector('[role="alert"]', { timeout: 12_000 });
  const errorState = await errorPage.evaluate(() => ({ text: document.body.innerText, hasServiceUnavailable: document.body.innerText.includes('Service temporairement indisponible'), hasRetry: [...document.querySelectorAll('button')].some((b) => /réessayer|actualiser/i.test(b.textContent || '')), roleAlert: !!document.querySelector('[role="alert"]'), falseNotFound: document.body.innerText.includes('Incident introuvable') }));
  await errorPage.screenshot({ path: join(captureRoot, '503-state.png'), fullPage: true });
  await errorPage.evaluate(() => [...document.querySelectorAll('button')].find((button) => /réessayer/i.test(button.textContent || ''))?.click());
  await waitForDetail(errorPage);
  const recovery = await errorPage.evaluate(() => document.body.innerText.includes('Imprimer le rapport'));

  const xss = await page.evaluate(() => ({ executed: !!globalThis.__qaXss || !!globalThis.__qaLogXss, visibleLiteral: document.body.innerText.includes('globalThis.__qa') }));
  const printStatus = Boolean(printSafety && !printSafety.hasExecutablePayload && printSafety.containsLiteralPayload && printSafety.legalDisclaimer);
  const actionStatus = requiredReason && browserActions.containEffects === 1 && browserActions.resolveEffects === 1 && scopeDenial;
  const report = { generatedAt: new Date().toISOString(), sourceHead: process.env.CORO_QA_COMMIT_SHA, configurations, browserActions: { status: actionStatus ? 'PASS' : 'FAIL', ...browserActions, scopeDenial }, zoom200: { status: zoom.scrollWidth <= zoom.clientWidth ? 'PASS' : 'FAIL', ...zoom }, keyboardFocus, f5: f5 ? 'PASS' : 'FAIL', printExport: { status: printStatus ? 'PASS' : 'FAIL', ...printSafety }, error503: { intercepted, observed: errorState, recovery, status: errorState.hasServiceUnavailable && errorState.hasRetry && errorState.roleAlert && !errorState.falseNotFound && recovery ? 'PASS' : 'FAIL' }, xssDomRendering: { status: !xss.executed ? 'PASS' : 'FAIL', ...xss }, consoleErrors, readerScreen: 'NOT_VERIFIED', verdict: configurations.every((x) => x.status === 'PASS') && actionStatus && zoom.scrollWidth <= zoom.clientWidth && f5 && printStatus && errorState.hasServiceUnavailable && errorState.hasRetry && errorState.roleAlert && !errorState.falseNotFound && recovery && !xss.executed && consoleErrors.length === 0 ? 'PASS' : 'CORRECTION_REQUIRED' };
  await writeFile(join(evidenceRoot, 'incident-detail-browser.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await context.close();
} finally {
  await browser.close().catch(() => undefined);
  await adapter.close().catch(() => undefined);
  await prisma.$disconnect();
}
