#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';

const evidenceDirectory = assertUnderQaRoot(
  process.env.CORO_QA_PILOT_BROWSER_EVIDENCE ||
    'D:\\CORO-QA\\tracking\\client-portal\\pilot-access-browser',
);
await mkdir(evidenceDirectory, { recursive: true });
const secrets = await loadSecretStore();
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
const viewports = [
  [1440, 900],
  [1920, 1080],
  [390, 844],
  [430, 932],
];
const themes = [
  { id: 'classic', ui: 'legacy', preference: 'LIGHT', expectedUi: 'legacy', expectedTheme: 'light' },
  { id: 'glass-light', ui: 'glass', preference: 'LIGHT', expectedUi: 'glass', expectedTheme: 'light' },
  { id: 'glass-dark', ui: 'glass', preference: 'DARK', expectedUi: 'glass', expectedTheme: 'dark' },
];
const archivedProjectId = '50000000-0000-4000-8000-000000000002';
const activeProjectId = '50000000-0000-4000-8000-000000000001';
const buildingId = '40000000-0000-4000-8000-000000000001';

function measure() {
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const nodes = [...document.querySelectorAll('main,nav,header,section,article,form,button,a,input,textarea')].filter(visible);
  const failures = nodes.flatMap((element) => {
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement?.getBoundingClientRect();
    const parentOverflow = Boolean(
      parent && getComputedStyle(element.parentElement).overflowX !== 'auto' && rect.right > parent.right + 2,
    );
    return rect.left < -1 || rect.right > innerWidth + 1 || parentOverflow
      ? [{ tag: element.tagName, left: rect.left, right: rect.right, parentRight: parent?.right ?? null }]
      : [];
  });
  return {
    viewport: { width: innerWidth, height: innerHeight },
    ui: document.documentElement.getAttribute('data-ui'),
    theme: document.documentElement.getAttribute('data-theme'),
    globalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    failures,
    text: document.body.innerText,
  };
}

const results = [];
const browserErrors = [];
let isolated;
try {
  isolated = await lab.createIsolatedSession('clientLocalA');
  const { page } = isolated;
  page.on('console', (entry) => {
    if (entry.type() === 'error') browserErrors.push(entry.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  for (const [width, height] of viewports) {
    for (const selected of themes) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.evaluate(({ ui, preference }) => {
        localStorage.setItem('coro-ui-generation', ui);
        localStorage.setItem('coro-theme-preference', preference);
      }, selected);

      await page.goto(`${process.env.CORO_QA_PORTAL_URL}/documents/${activeProjectId}`, {
        waitUntil: 'networkidle2',
      });
      const documentState = await page.evaluate(measure);

      await page.goto(`${process.env.CORO_QA_PORTAL_URL}/documents/${archivedProjectId}`, {
        waitUntil: 'networkidle2',
      });
      const archivedDocumentState = await page.evaluate(measure);
      const archivedTextareaDisabled = await page.$eval(
        'textarea[placeholder="Ajouter un commentaire..."]',
        (element) => element.disabled,
      );

      await page.goto(`${process.env.CORO_QA_PORTAL_URL}/sentinelle/${buildingId}/invitations`, {
        waitUntil: 'networkidle2',
      });
      const invitationState = await page.evaluate(measure);
      const inviteButtonDisabled = await page.$eval('button[title="Fonction exclue du pilote"]', (element) => element.disabled);

      await page.goto(`${process.env.CORO_QA_PORTAL_URL}/profile`, { waitUntil: 'networkidle2' });
      const profileState = await page.evaluate(measure);
      const currentPasswordVisible = await page.$eval('#current-password', (element) => {
        const rect = element.getBoundingClientRect();
        return element.getAttribute('autocomplete') === 'current-password' && rect.width > 0 && rect.height >= 44;
      });
      await page.reload({ waitUntil: 'networkidle2' });
      const sessionPersistent = await page.evaluate(() =>
        Boolean(localStorage.getItem('coro_client_token')) && Boolean(document.querySelector('#current-password')),
      );

      const id = `${width}x${height}-${selected.id}`;
      await page.screenshot({ path: join(evidenceDirectory, `${id}.png`), fullPage: true });
      const geometryPass = [documentState, archivedDocumentState, invitationState, profileState].every(
        (state) => !state.globalOverflow && state.failures.length === 0,
      );
      const pass =
        documentState.viewport.width === width &&
        documentState.viewport.height === height &&
        documentState.ui === selected.expectedUi &&
        documentState.theme === selected.expectedTheme &&
        invitationState.text.includes('invitations externes') &&
        archivedTextareaDisabled &&
        inviteButtonDisabled &&
        currentPasswordVisible &&
        sessionPersistent &&
        geometryPass;
      results.push({
        id,
        status: pass ? 'PASS' : 'FAIL',
        document: { ...documentState, text: undefined },
        archivedDocument: { ...archivedDocumentState, text: undefined },
        invitations: { ...invitationState, text: undefined },
        profile: { ...profileState, text: undefined },
        archivedTextareaDisabled,
        inviteButtonDisabled,
        currentPasswordVisible,
        sessionPersistent,
      });
    }
  }
} finally {
  if (isolated) {
    await isolated.context.close();
    if (isolated.ownedBrowser) await isolated.browser.close();
  }
  await adapter.close();
}

const criticalErrors = [...new Set(browserErrors)].filter(
  (message) => !/favicon|Failed to load resource.*404/i.test(message),
);
const report = {
  status:
    results.length === 12 &&
    results.every((item) => item.status === 'PASS') &&
    criticalErrors.length === 0
      ? 'PASS'
      : 'FAIL',
  results,
  criticalErrors,
};
await writeFile(join(evidenceDirectory, 'browser-matrix.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, matrix: `${results.filter((item) => item.status === 'PASS').length}/12`, criticalErrors: criticalErrors.length }));
if (report.status !== 'PASS') process.exitCode = 1;
