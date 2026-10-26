#!/usr/bin/env node
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';

const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const puppeteer = require('puppeteer');
const evidenceRoot = assertUnderQaRoot(
  process.env.CORO_QA_PROJECT_LIST_EVIDENCE ||
    'D:\\CORO-QA\\audits\\organization-project-list\\correction',
);
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({
  captureDirectory: process.env.CORO_QA_MFA_DIR,
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
const report = { executedAt: new Date().toISOString(), checks: [], matrix: [] };
const check = (id, pass, detail) => {
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
  if (!pass) throw new Error(`${id}: ${detail}`);
};

let browser;
try {
  const session = await lab.loginAs('advisor');
  const list = await lab.call('/projects', { token: session.token });
  check(
    'canonical-list-scope',
    list.status === 200 &&
      list.data.length === 2 &&
      list.data.every((project) => project.organizationId === session.user.organizationId),
    `HTTP ${list.status}; count=${list.data?.length}`,
  );
  const archived = list.data.find((project) => project.status === 'ARCHIVED');
  const active = list.data.find((project) => project.status !== 'ARCHIVED');
  const summary = await lab.call('/projects/list-summary', { token: session.token });
  check(
    'canonical-quota-summary',
    summary.status === 200 && summary.data.quotaUsed === 2,
    `HTTP ${summary.status}; quota=${summary.data?.quotaUsed}`,
  );
  const users = await lab.call('/projects/filter-users', { token: session.token });
  check(
    'minimal-filter-users',
    users.status === 200 &&
      users.data.length === 1 &&
      Object.keys(users.data[0]).sort().join(',') ===
        'firstName,id,lastName',
    `HTTP ${users.status}; count=${users.data?.length}`,
  );
  const archivedUpdate = await lab.call(`/projects/${archived.id}`, {
    method: 'PUT',
    token: session.token,
    body: { status: 'IN_PROGRESS' },
  });
  check('archived-update-denied', archivedUpdate.status === 403, `HTTP ${archivedUpdate.status}`);
  const archivedDelete = await lab.call(`/projects/${archived.id}`, {
    method: 'DELETE',
    token: session.token,
  });
  check('archived-delete-denied', archivedDelete.status === 403, `HTTP ${archivedDelete.status}`);
  const bulk = await lab.call('/projects/bulk-deactivate', {
    method: 'POST',
    token: session.token,
    body: { projectIds: [active.id, archived.id] },
  });
  const afterBulk = await lab.call(`/projects/${active.id}`, { token: session.token });
  check(
    'bulk-all-or-nothing',
    bulk.status === 403 && afterBulk.status === 200 && afterBulk.data.isActive === true,
    `bulk=${bulk.status}; active=${afterBulk.status}`,
  );

  browser = await puppeteer.launch({ headless: true });
  const isolated = await lab.createIsolatedSession('advisor', { browser });
  const page = isolated.page;
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
    { width: 2560, height: 1440 },
  ];
  const themes = [
    { name: 'classic', ui: 'legacy', theme: 'LIGHT' },
    { name: 'glass-light', ui: 'glass', theme: 'LIGHT' },
    { name: 'glass-dark', ui: 'glass', theme: 'DARK' },
  ];
  await mkdir(evidenceRoot, { recursive: true });
  for (const viewport of viewports) {
    await page.setViewport(viewport);
    for (const theme of themes) {
      await page.evaluate(({ ui, preference }) => {
        localStorage.setItem('coro-ui-generation', ui);
        localStorage.setItem('coro-theme-preference', preference);
      }, { ui: theme.ui, preference: theme.theme });
      await page.goto(`${process.env.CORO_QA_FRONTEND_URL}/projects`, {
        waitUntil: 'networkidle0',
      });
      const geometry = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('main .rounded-md')]
          .filter((element) => element.querySelector('a[href^="/projects/"]'));
        const cardBoxes = cards.map((element) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right, width: box.width };
        });
        const root = document.documentElement;
        return {
          path: location.pathname,
          ui: root.getAttribute('data-ui'),
          theme: root.getAttribute('data-theme'),
          overflow: root.scrollWidth > root.clientWidth,
          cardBoxes,
          hasNativeLinks: cards.every((card) => Boolean(card.querySelector('a[href^="/projects/"]'))),
          hasReactivate: document.body.innerText.includes('Réactiver'),
        };
      });
      const pass =
        geometry.path === '/projects' &&
        !geometry.overflow &&
        geometry.cardBoxes.length === 1 &&
        geometry.cardBoxes.every((box) => box.left >= 0 && box.right <= viewport.width + 1) &&
        geometry.hasNativeLinks &&
        !geometry.hasReactivate;
      report.matrix.push({ viewport, theme: theme.name, geometry, status: pass ? 'PASS' : 'FAIL' });
      check(`browser-${viewport.width}-${theme.name}`, pass, JSON.stringify(geometry));
      await page.screenshot({
        path: join(evidenceRoot, `${viewport.width}-${theme.name}.png`),
        fullPage: true,
      });
    }
  }
  check('critical-console-errors', consoleErrors.length === 0, `count=${consoleErrors.length}`);

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.trim() === 'Archivés',
    );
    button?.click();
  });
  await page.waitForFunction(() => document.body.innerText.includes('Lecture seule'));
  const archiveUi = await page.evaluate(() => ({
    readonly: document.body.innerText.includes('Lecture seule'),
    reactivate: document.body.innerText.includes('Réactiver'),
    selectable: Boolean(document.querySelector('input[type="checkbox"]')),
    nativeLink: Boolean(document.querySelector('a[href="/projects/50000000-0000-4000-8000-000000000002"]')),
  }));
  check(
    'archive-readonly-ui',
    archiveUi.readonly && !archiveUi.reactivate && !archiveUi.selectable && archiveUi.nativeLink,
    JSON.stringify(archiveUi),
  );

  const failurePage = await isolated.context.newPage();
  await failurePage.setRequestInterception(true);
  failurePage.on('request', (request) => {
    if (request.url().endsWith('/api/projects')) {
      request.respond({ status: 503, contentType: 'application/json', body: '{"message":"synthetic outage"}' });
    } else request.continue();
  });
  await failurePage.goto(`${process.env.CORO_QA_FRONTEND_URL}/projects`, { waitUntil: 'networkidle0' });
  const outage = await failurePage.evaluate(() => ({
    alert: document.querySelector('[role="alert"]')?.textContent || '',
    onboarding: document.body.innerText.includes('3 étapes pour créer votre premier projet'),
    retry: [...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Réessayer')),
  }));
  check(
    'primary-outage-truthful-state',
    outage.alert.includes('Impossible de charger') && !outage.onboarding && outage.retry,
    JSON.stringify(outage),
  );
  await failurePage.close();
} finally {
  if (browser) await browser.close();
  await adapter.close();
  report.pass = report.checks.every((item) => item.status === 'PASS');
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(join(evidenceRoot, 'acceptance.json'), JSON.stringify(report, null, 2));
}

console.log(JSON.stringify({ pass: report.pass, checks: report.checks.length, matrix: report.matrix.length }));
if (!report.pass) process.exitCode = 1;
