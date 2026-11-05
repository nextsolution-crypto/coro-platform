#!/usr/bin/env node
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertSafeEnvironment, assertUnderQaRoot } from './policy.mjs';

assertSafeEnvironment();
const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const puppeteer = require('puppeteer');
const secrets = await loadSecretStore();
const evidenceRoot = assertUnderQaRoot(
  process.env.CORO_QA_SP_OPS_02_BROWSER_EVIDENCE ||
    'D:\\CORO-QA\\tracking\\sentinelle-population\\sp-ops-02-browser',
);
const resultFile = join(evidenceRoot, 'browser-acceptance.json');
const adapter = await startMfaCaptureAdapter({
  captureDirectory: process.env.CORO_QA_MFA_DIR,
  channelToken: secrets.mfaChannelToken,
});
const lab = new QaIdentityLab({
  apiUrl: process.env.CORO_QA_BACKEND_URL,
  portalUrl: process.env.CORO_QA_PORTAL_URL,
  frontendUrl: process.env.CORO_QA_PORTAL_URL,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});
const buildingId = '40000000-0000-4000-8000-000000000001';
const report = { executedAt: new Date().toISOString(), candidate: process.env.CORO_QA_COMMIT_SHA, matrix: [], checks: [], consoleErrors: [], networkRefusals: [], serverErrors: [], limitation: 'Route Population explicitement Classic (shell none); Glass est NOT_APPLICABLE.' };
const check = (id, pass, detail) => {
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
  if (!pass) throw new Error(`${id}: ${detail}`);
};
const viewports = [
  { width: 390, height: 844 }, { width: 768, height: 1024 },
  { width: 1440, height: 900 }, { width: 2560, height: 1440 },
];
const themes = [
  { name: 'classic-light', preference: 'LIGHT', expected: 'light' },
  { name: 'classic-dark', preference: 'DARK', expected: 'dark' },
  { name: 'classic-system-dark', preference: 'SYSTEM', expected: 'dark' },
];
let browser;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const session = await lab.loginAs('clientLocalA');
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const viewport of viewports) for (const theme of themes) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const id = `${viewport.width}x${viewport.height}-${theme.name}`;
    page.on('console', (event) => {
      if (event.type() === 'error' && !event.text().startsWith('Failed to load resource:')) {
        report.consoleErrors.push(`${id}: ${event.text()}`);
      }
    });
    page.on('pageerror', (error) => report.consoleErrors.push(`${id}: ${error.message}`));
    page.on('response', (response) => {
      const status = response.status();
      const item = `${id}: ${status} ${response.url()}`;
      if (status === 401 || status === 403 || status === 404) report.networkRefusals.push(item);
      if (status >= 500) report.serverErrors.push(item);
    });
    await page.setViewport(viewport);
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme.expected }]);
    await page.evaluateOnNewDocument(({ token, user, preference }) => {
      localStorage.setItem('coro_client_token', token);
      localStorage.setItem('coro_client_user', JSON.stringify(user));
      localStorage.setItem('coro-ui-generation', 'legacy');
      localStorage.setItem('coro-theme-preference', preference);
    }, { token: session.token, user: session.user, preference: theme.preference });
    await page.goto(`${process.env.CORO_QA_PORTAL_URL}/sentinelle/${buildingId}/population`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction(() => document.body.innerText.includes('Scénarios d’urgence'), { timeout: 30_000 });
    const state = await page.evaluate(() => {
      const controls = [...document.querySelectorAll('button,a,input')].filter((node) => {
        const box = node.getBoundingClientRect(); return box.width > 0 && box.height > 0;
      }).map((node) => { const box = node.getBoundingClientRect(); return { left: box.left, right: box.right }; });
      return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, outside: controls.filter((box) => box.left < -1 || box.right > innerWidth + 1).length, ui: document.documentElement.dataset.ui, theme: document.documentElement.dataset.theme, fixture: document.body.innerText.includes('EXERCICE — rejet synthétique') };
    });
    const pass = !state.overflow && state.outside === 0 && state.ui === 'legacy' && state.theme === theme.expected && state.fixture;
    report.matrix.push({ id, status: pass ? 'PASS' : 'FAIL', ...state });
    await page.screenshot({ path: join(evidenceRoot, `${id}.png`), fullPage: true });
    if (viewport.width === 1440 && theme.name === 'classic-light') {
      const click = (text) => page.evaluate((needle) => { const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes(needle) && !item.disabled); button?.click(); return Boolean(button); }, text);
      check('scenario-select', await click('EXERCICE — rejet synthétique'), 'scenario selectable');
      check('preview', await click('Calculer la population ciblée'), 'preview action');
      await page.waitForFunction(() => document.body.innerText.includes('Préparer l’alerte'), { timeout: 20_000 });
      check('prepare', await click('Préparer l’alerte'), 'composer open');
      await page.waitForFunction(() => document.body.innerText.includes('Qualifier la communication'), { timeout: 20_000 });
      await click('Continuer'); await page.waitForFunction(() => document.body.innerText.includes('Confirmer le territoire ciblé'));
      await click('Continuer'); await page.waitForFunction(() => document.body.innerText.includes('Établissements sensibles dans le périmètre'));
      const targeting = await page.evaluate(() => {
        const text = document.body.innerText;
        const heading = [...document.querySelectorAll('h3')].find((node) =>
          node.textContent?.includes('Établissements sensibles dans le périmètre'),
        );
        const section = heading?.parentElement;
        const boxes = [...(section?.querySelectorAll('input[type="checkbox"]') ?? [])];
        return { hospital: text.includes('Hôpital QA'), school: text.includes('École QA'), geometryOnlyAbsent: !text.includes('Géométrie sans coordonnées QA'), count: boxes.length, unchecked: boxes.every((box) => !box.checked), selectable: boxes.filter((box) => !box.disabled).length };
      });
      check('sensitive-assets', targeting.hospital && targeting.school && targeting.geometryOnlyAbsent, JSON.stringify(targeting));
      check('human-selection', targeting.count === 2 && targeting.unchecked && targeting.selectable === 2, JSON.stringify(targeting));
      await page.screenshot({ path: join(evidenceRoot, 'targeting-step-desktop.png'), fullPage: true });
    }
    await context.close();
  }
  check('matrix-12-of-12', report.matrix.length === 12 && report.matrix.every((entry) => entry.status === 'PASS'), `${report.matrix.filter((entry) => entry.status === 'PASS').length}/12`);
  check('console', report.consoleErrors.length === 0, JSON.stringify(report.consoleErrors));
  check('no-server-error', report.serverErrors.length === 0, JSON.stringify(report.serverErrors));
} finally {
  if (browser) await browser.close().catch(() => undefined);
  await adapter.close();
  await mkdir(dirname(resultFile), { recursive: true });
  await writeFile(resultFile, JSON.stringify(report, null, 2), { mode: 0o600 });
}
process.stdout.write(`${JSON.stringify({ status: report.checks.every((entry) => entry.status === 'PASS') && report.matrix.every((entry) => entry.status === 'PASS') ? 'PASS' : 'FAIL', matrix: report.matrix.length, evidence: resultFile })}\n`);
