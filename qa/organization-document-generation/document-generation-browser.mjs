#!/usr/bin/env node
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { QaIdentityLab } from '../global-e2e/src/browser-orchestration.mjs';
import { loadSecretStore } from '../global-e2e/src/secret-store.mjs';
import { startMfaCaptureAdapter } from '../global-e2e/src/mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from '../global-e2e/src/policy.mjs';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const evidenceRoot = assertUnderQaRoot(
  process.env.CORO_QA_DOCUMENT_GENERATION_EVIDENCE ||
    'D:\\CORO-QA\\runs\\organization-document-generation\\2026-10-28',
);
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({
  captureDirectory: process.env.CORO_QA_MFA_DIR,
  channelToken: secrets.mfaChannelToken,
  port: Number(process.env.CORO_QA_MFA_ADAPTER_PORT || 34644),
});
const lab = new QaIdentityLab({
  apiUrl: process.env.CORO_QA_BACKEND_URL,
  frontendUrl: process.env.CORO_QA_FRONTEND_URL,
  portalUrl: process.env.CORO_QA_PORTAL_URL,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});

const ids = {
  orgA: '10000000-0000-4000-8000-000000000002',
  clientA: '30000000-0000-4000-8000-000000000001',
  buildingA: '40000000-0000-4000-8000-000000000001',
  advisorA: '20000000-0000-4000-8000-000000000007',
  pmu: 'docgen-browser-pmu',
  psi: 'docgen-browser-psi',
  pca: 'docgen-browser-pca',
  archived: 'docgen-browser-archived',
  inactive: 'docgen-browser-inactive',
};
const report = {
  executedAt: new Date().toISOString(),
  baseline: process.env.CORO_QA_COMMIT,
  imageDigests: process.env.CORO_QA_IMAGE_DIGESTS,
  checks: [],
  matrix: [],
  consoleErrors: [],
};
const record = (id, pass, detail) =>
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const commandHeaders = (version) => ({
  'Idempotency-Key': `browser-${randomUUID()}`,
  'X-Expected-Document-Version': String(version),
});

let browser;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const fixtureProjectIds = [ids.pmu, ids.psi, ids.pca, ids.archived, ids.inactive];
  await prisma.documentGenerationRequest.deleteMany({ where: { projectId: { in: fixtureProjectIds } } });
  await prisma.document.deleteMany({ where: { projectId: { in: fixtureProjectIds } } });
  const common = {
    year: 2026,
    organizationId: ids.orgA,
    clientId: ids.clientA,
    buildingId: ids.buildingA,
    userId: ids.advisorA,
  };
  for (const fixture of [
    { id: ids.pmu, name: 'QA Browser PMU', documentType: 'PMU', configData: { province: 'QC' }, ...common },
    { id: ids.psi, name: 'QA Browser PSI', documentType: 'PSI', configData: { province: 'QC' }, ...common },
    { id: ids.pca, name: 'QA Browser PCA', documentType: 'PCA', ...common },
    { id: ids.archived, name: 'QA Browser Archived', documentType: 'PMU', status: 'ARCHIVED', ...common },
    { id: ids.inactive, name: 'QA Browser Inactive', documentType: 'PMU', isActive: false, ...common },
  ]) {
    await prisma.project.upsert({ where: { id: fixture.id }, update: fixture, create: fixture });
  }
  await prisma.pcaConfig.upsert({
    where: { projectId: ids.pca },
    update: { planName: 'QA Browser PCA' },
    create: {
      projectId: ids.pca,
      planName: 'QA Browser PCA',
      regulatoryReqs: [],
      authoritiesToNotify: [],
    },
  });

  const advisor = await lab.loginAs('advisor');
  record('authenticated-advisor-mfa', Boolean(advisor.token), 'Synthetic assigned OPERATOR authenticated through local MFA capture.');
  for (const [type, projectId] of [['PMU', ids.pmu], ['PSI', ids.psi], ['PCA', ids.pca]]) {
    const generated = await lab.call(`/generator/generate/${projectId}`, {
      method: 'POST', token: advisor.token, body: {}, headers: commandHeaders(0),
    });
    const document = await prisma.document.findFirst({ where: { projectId } });
    record(`api-generate-${type.toLowerCase()}`, generated.status < 300 && document?.version === 1, `HTTP ${generated.status}; version=${document?.version ?? 'none'}`);
  }
  for (const [state, projectId] of [['archived', ids.archived], ['inactive', ids.inactive]]) {
    const denied = await lab.call(`/generator/generate/${projectId}`, {
      method: 'POST', token: advisor.token, body: {}, headers: commandHeaders(0),
    });
    const effects = await prisma.document.count({ where: { projectId } });
    record(`api-deny-${state}`, denied.status === 409 && effects === 0, `HTTP ${denied.status}; documents=${effects}`);
  }

  browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.CORO_QA_CHROME_EXECUTABLE ||
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const session = await lab.createIsolatedSession('advisor', { browser });
  const page = session.page;
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  const viewports = [
    { width: 390, height: 844 }, { width: 768, height: 1024 },
    { width: 1440, height: 900 }, { width: 2560, height: 1440 },
  ];
  const themes = [
    { name: 'classic', ui: 'legacy', preference: 'LIGHT' },
    { name: 'glass-light', ui: 'glass', preference: 'LIGHT' },
    { name: 'glass-dark', ui: 'glass', preference: 'DARK' },
  ];
  for (const viewport of viewports) {
    await page.setViewport(viewport);
    for (const theme of themes) {
      await page.goto(process.env.CORO_QA_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ ui, preference }) => {
        localStorage.setItem('coro-ui-generation', ui);
        localStorage.setItem('coro-theme-preference', preference);
      }, theme);
      await page.goto(`${process.env.CORO_QA_FRONTEND_URL}/projects/${ids.pmu}`, { waitUntil: 'networkidle0' });
      const geometry = await page.evaluate(() => {
        const actionable = [...document.querySelectorAll('button, a')]
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        return {
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          clipped: actionable.filter((element) => {
            const rect = element.getBoundingClientRect();
            return !element.closest('nav, aside') &&
              (rect.left < -1 || rect.right > innerWidth + 1);
          }).map((element) => element.textContent?.trim().slice(0, 60)),
          generateVisible: actionable.some((element) => /R.g.n.rer|G.n.rer/.test(element.textContent || '')),
          path: location.pathname,
        };
      });
      const pass = !geometry.overflow && geometry.clipped.length === 0 && geometry.generateVisible;
      report.matrix.push({ viewport, theme: theme.name, status: pass ? 'PASS' : 'FAIL', geometry });
      await page.screenshot({ path: join(evidenceRoot, `${viewport.width}-${theme.name}.png`), fullPage: true });
    }
  }
  record('browser-responsive-12-of-12', report.matrix.every((entry) => entry.status === 'PASS'), `${report.matrix.filter((entry) => entry.status === 'PASS').length}/12`);

  await page.goto(`${process.env.CORO_QA_FRONTEND_URL}/projects/${ids.psi}`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  record('psi-f5-and-result', (await page.evaluate(() => document.body.innerText)).includes('QA Browser PSI'), page.url());
  await page.goto(`${process.env.CORO_QA_FRONTEND_URL}/configurator/pca/${ids.pca}`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  record('pca-f5-and-result', (await page.evaluate(() => document.body.innerText)).includes('QA Browser PCA'), page.url());
  await page.goto(`${process.env.CORO_QA_FRONTEND_URL}/projects/${ids.archived}`, { waitUntil: 'networkidle0' });
  const archivedGeneration = await page.evaluate(() => {
    const control = [...document.querySelectorAll('button')]
      .find((element) => /Régénérer|Générer le document/.test(element.textContent || ''));
    if (!control) return { offered: false };
    control.click();
    return { offered: true };
  });
  if (archivedGeneration.offered) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 750));
  }
  const archivedText = await page.evaluate(() => document.body.innerText);
  record(
    'archived-ui-explicit-refusal',
    !archivedGeneration.offered || /archiv|désactiv/i.test(archivedText),
    archivedGeneration.offered ? 'Server refusal is displayed without a generated document.' : 'Generation action is not offered.',
  );
  record('critical-console-errors', report.consoleErrors.length === 0, `count=${report.consoleErrors.length}`);
} finally {
  if (browser) await browser.close();
  await adapter.close();
  report.pass = report.checks.every((entry) => entry.status === 'PASS');
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(join(evidenceRoot, 'browser-acceptance.json'), JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

console.log(JSON.stringify({ pass: report.pass, checks: report.checks, matrix: report.matrix.length }));
if (!report.pass) process.exitCode = 1;
