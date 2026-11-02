#!/usr/bin/env node
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(join(repositoryRoot, 'coro-backend', 'package.json'));
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const evidenceRoot = assertUnderQaRoot(
  process.env.CORO_QA_PERFORMANCE_ARCHIVE_EVIDENCE ||
    'D:\\CORO-QA\\tracking\\organization-performance-fix',
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

const ids = {
  orgA: '10000000-0000-4000-8000-000000000002',
  projectA: '50000000-0000-4000-8000-000000000001',
  archivedA: '50000000-0000-4000-8000-000000000002',
  projectB: '50000000-0000-4000-8000-000000000003',
  advisorA: '20000000-0000-4000-8000-000000000007',
};
const report = {
  executedAt: new Date().toISOString(),
  candidate: process.env.CORO_QA_COMMIT || 'working-tree',
  checks: [],
  browser: [],
};
const check = (id, pass, detail) => {
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
};

let browser;
let taskId;
let timeId;
let originalProject;
try {
  await mkdir(evidenceRoot, { recursive: true });
  originalProject = await prisma.project.findUniqueOrThrow({
    where: { id: ids.projectA },
    select: { status: true, isActive: true },
  });
  await prisma.project.update({
    where: { id: ids.projectA },
    data: { status: 'DRAFT', isActive: true },
  });

  const advisor = await lab.loginAs('advisor');
  const founder = await lab.loginAs('founder');
  const activeTask = await lab.call(`/projects/${ids.projectA}/tasks`, {
    method: 'POST',
    token: advisor.token,
    body: { taskTitle: 'Tâche Rendement archive QA', categoryName: 'QA', estimatedHours: 2 },
  });
  taskId = activeTask.data?.id;
  check('active-project-task-created', activeTask.status === 201 && Boolean(taskId), `HTTP ${activeTask.status}`);

  const activeTime = await lab.call(`/projects/${ids.projectA}/tasks/${taskId}/time`, {
    method: 'POST',
    token: advisor.token,
    body: { date: '2026-11-02', heures: 1.25, note: 'Temps synthétique archive QA' },
  });
  timeId = activeTime.data?.id;
  check('active-project-time-created', activeTime.status === 201 && Boolean(timeId), `HTTP ${activeTime.status}`);

  const financialBefore = await lab.call(`/rendement/financial?organizationId=${ids.orgA}`, {
    token: founder.token,
  });
  const historyBefore = await prisma.taskTimeEntry.count({ where: { id: timeId } });

  const archivedCountBefore = await prisma.projectTask.count({ where: { projectId: ids.archivedA } });
  const archivedMutation = await lab.call(`/projects/${ids.archivedA}/tasks`, {
    method: 'POST', token: advisor.token,
    body: { taskTitle: 'Refus archive QA', categoryName: 'QA' },
  });
  const archivedCountAfter = await prisma.projectTask.count({ where: { projectId: ids.archivedA } });
  check(
    'archived-project-refused-without-effect',
    archivedMutation.status === 409 && archivedCountAfter === archivedCountBefore,
    `HTTP ${archivedMutation.status}; tasks ${archivedCountBefore}->${archivedCountAfter}`,
  );

  await prisma.project.update({ where: { id: ids.projectA }, data: { isActive: false } });
  const inactiveCountBefore = await prisma.projectTask.count({ where: { projectId: ids.projectA } });
  const inactiveMutation = await lab.call(`/projects/${ids.projectA}/tasks`, {
    method: 'POST', token: advisor.token,
    body: { taskTitle: 'Refus inactif QA', categoryName: 'QA' },
  });
  const inactiveCountAfter = await prisma.projectTask.count({ where: { projectId: ids.projectA } });
  check(
    'inactive-project-refused-without-effect',
    inactiveMutation.status === 409 && inactiveCountAfter === inactiveCountBefore,
    `HTTP ${inactiveMutation.status}; tasks ${inactiveCountBefore}->${inactiveCountAfter}`,
  );
  await prisma.project.update({ where: { id: ids.projectA }, data: { status: 'DRAFT', isActive: true } });

  const crossTenant = await lab.call(`/projects/${ids.projectB}/tasks`, {
    method: 'POST', token: advisor.token,
    body: { taskTitle: 'Refus autre tenant QA', categoryName: 'QA' },
  });
  check('cross-tenant-refused', [403, 404].includes(crossTenant.status), `HTTP ${crossTenant.status}`);

  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const isolated = await lab.createIsolatedSession('advisor', { browser });
  const page = isolated.page;
  const consoleErrors = [];
  const responseFailures = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => {
    if (response.status() >= 400) responseFailures.push({ status: response.status(), url: response.url() });
  });

  for (const scenario of [
    { name: 'mobile-classic', width: 390, height: 844, ui: 'legacy', theme: 'LIGHT' },
    { name: 'desktop-glass-light', width: 1440, height: 900, ui: 'glass', theme: 'LIGHT' },
    { name: 'desktop-glass-dark', width: 1440, height: 900, ui: 'glass', theme: 'DARK' },
  ]) {
    await page.setViewport({ width: scenario.width, height: scenario.height });
    await page.goto(process.env.CORO_QA_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ ui, theme }) => {
      localStorage.setItem('coro-ui-generation', ui);
      localStorage.setItem('coro-theme-preference', theme);
    }, scenario);
    await page.goto(`${process.env.CORO_QA_FRONTEND_URL}/projects/${ids.projectA}/mandate`, { waitUntil: 'networkidle0' });
    await page.click('#mandate-tab-work');
    await page.waitForSelector(`[aria-label="Statut de Tâche Rendement archive QA"]`);
    const before = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      readOnlyBanner: document.body.innerText.includes('demeurent consultables en lecture seule'),
    }));
    report.browser.push({ scenario: scenario.name, stage: 'active', ...before });
    await page.screenshot({ path: join(evidenceRoot, `${scenario.name}-active.png`), fullPage: true });
  }

  await prisma.project.update({ where: { id: ids.projectA }, data: { status: 'ARCHIVED', isActive: true } });
  const taskBeforeRace = await prisma.projectTask.findUniqueOrThrow({ where: { id: taskId }, select: { status: true } });
  await page.select(`[aria-label="Statut de Tâche Rendement archive QA"]`, 'en_cours');
  await page.waitForFunction(() => document.body.innerText.includes('demeure en lecture seule'));
  const raceUi = await page.evaluate(() => ({
    alert: document.querySelector('[role="alert"]')?.textContent?.trim() || '',
    selected: document.querySelector('[aria-label="Statut de Tâche Rendement archive QA"]')?.value,
  }));
  const taskAfterRace = await prisma.projectTask.findUniqueOrThrow({ where: { id: taskId }, select: { status: true } });
  check(
    'archive-after-load-visible-refusal-no-write',
    raceUi.alert.includes('demeure en lecture seule') && raceUi.selected === taskBeforeRace.status && taskAfterRace.status === taskBeforeRace.status,
    `alert=${raceUi.alert}; ui=${raceUi.selected}; db=${taskAfterRace.status}`,
  );
  await page.screenshot({ path: join(evidenceRoot, 'archive-after-load-refusal.png'), fullPage: true });

  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('#mandate-tab-work');
  const archivedUi = await page.evaluate(() => ({
    banner: document.body.innerText.includes('demeurent consultables en lecture seule'),
    mutationControls: [...document.querySelectorAll('button, select, input')]
      .filter(element => /Ajouter du temps|Statut de Tâche Rendement archive QA/.test(element.textContent || element.getAttribute('aria-label') || '')).length,
    historyVisible: document.body.innerText.includes('Tâche Rendement archive QA'),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  check(
    'archived-reload-readonly-history-visible',
    archivedUi.banner && archivedUi.mutationControls === 0 && archivedUi.historyVisible && !archivedUi.overflow,
    JSON.stringify(archivedUi),
  );
  await page.screenshot({ path: join(evidenceRoot, 'archived-readonly-after-f5.png'), fullPage: true });

  const historyAfter = await prisma.taskTimeEntry.count({ where: { id: timeId } });
  const financialAfter = await lab.call(`/rendement/financial?organizationId=${ids.orgA}`, { token: founder.token });
  check(
    'history-and-rendement-preserved',
    historyBefore === 1 && historyAfter === 1 && financialBefore.status === 200 && financialAfter.status === 200,
    `history ${historyBefore}->${historyAfter}; rendement ${financialBefore.status}/${financialAfter.status}`,
  );
  const criticalResponses = responseFailures.filter(item => item.status >= 500 || ![403, 404, 409].includes(item.status));
  const criticalConsoleErrors = consoleErrors.filter(message =>
    !message.includes('Failed to load resource: the server responded with a status of 403') &&
    !message.includes('Failed to load resource: the server responded with a status of 404') &&
    !message.includes('Failed to load resource: the server responded with a status of 409'),
  );
  check(
    'browser-console-no-critical-error',
    criticalConsoleErrors.length === 0 && criticalResponses.length === 0,
    criticalConsoleErrors.length || criticalResponses.length
      ? `${criticalConsoleErrors.join(' | ')} ${JSON.stringify(criticalResponses)}`
      : `${consoleErrors.length} expected denial/conflict resource message(s); ${JSON.stringify(responseFailures)}`,
  );

  await prisma.project.update({ where: { id: ids.projectA }, data: originalProject });
  await isolated.context.close();
} finally {
  if (originalProject) {
    await prisma.project.update({ where: { id: ids.projectA }, data: originalProject }).catch(() => undefined);
  }
  if (timeId) await prisma.taskTimeEntry.deleteMany({ where: { id: timeId } }).catch(() => undefined);
  if (taskId) await prisma.projectTask.deleteMany({ where: { id: taskId } }).catch(() => undefined);
  if (browser) await browser.close().catch(() => undefined);
  await Promise.allSettled([adapter.close(), prisma.$disconnect()]);
}

report.pass = report.checks.every(item => item.status === 'PASS');
await writeFile(join(evidenceRoot, 'organization-performance-archive-acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
