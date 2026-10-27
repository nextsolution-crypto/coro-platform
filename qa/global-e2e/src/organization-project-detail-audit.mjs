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
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const evidenceRoot = assertUnderQaRoot(
  process.env.CORO_QA_PROJECT_DETAIL_EVIDENCE ||
    'D:\\CORO-QA\\audits\\organization-project-detail\\2026-10-26',
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
  orgB: '10000000-0000-4000-8000-000000000003',
  clientA: '30000000-0000-4000-8000-000000000001',
  clientB: '30000000-0000-4000-8000-000000000002',
  buildingA: '40000000-0000-4000-8000-000000000001',
  buildingB: '40000000-0000-4000-8000-000000000002',
  active: '50000000-0000-4000-8000-000000000001',
  archived: '50000000-0000-4000-8000-000000000002',
  foreign: '50000000-0000-4000-8000-000000000003',
  unassigned: '20000000-0000-4000-8000-000000000009',
  disabled: '50000000-0000-4000-8000-000000000009',
};
const report = { executedAt: new Date().toISOString(), baseline: process.env.CORO_QA_COMMIT, checks: [], matrix: [], observations: [] };
const record = (id, pass, detail, severity = 'acceptance') => {
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', severity, detail });
};
const rawLogin = async (email) => {
  const after = Date.now();
  const first = await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } });
  if (first.status >= 300 || !first.data?.mfaRequired) return { status: first.status };
  const identity = { email, key: email };
  const code = await lab.completeMfa(identity, after);
  const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } });
  return { status: verified.status, token: verified.data?.access_token, user: verified.data?.user };
};

let browser;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const passwordHash = await bcrypt.hash(secrets.syntheticPassword, 10);
  await prisma.user.upsert({
    where: { id: ids.unassigned },
    update: { isActive: true, password: passwordHash },
    create: { id: ids.unassigned, email: 'unassigned-a@global-e2e.test', password: passwordHash, firstName: 'Synthetic', lastName: 'Unassigned', role: 'OPERATOR', organizationId: ids.orgA, isActive: true },
  });
  await prisma.project.upsert({
    where: { id: ids.disabled },
    update: { isActive: false },
    create: { id: ids.disabled, name: 'Synthetic Disabled Project', documentType: 'PMU', year: 2026, organizationId: ids.orgA, clientId: ids.clientA, buildingId: ids.buildingA, userId: ids.unassigned, isActive: false },
  });

  const advisor = await lab.loginAs('advisor');
  const adminA = await rawLogin('customer-admin-a@global-e2e.test');
  const adminB = await rawLogin('customer-admin-b@global-e2e.test');
  const unassigned = await rawLogin('unassigned-a@global-e2e.test');
  record('actor-preflight', [advisor.token, adminA.token, adminB.token, unassigned.token].every(Boolean), `advisor/adminA/adminB/unassigned authenticated with MFA`);

  const authorized = await lab.call(`/projects/${ids.active}`, { token: advisor.token });
  record('assigned-direct-read', authorized.status === 200 && authorized.data.id === ids.active, `HTTP ${authorized.status}`);
  const archiveRead = await lab.call(`/projects/${ids.archived}`, { token: advisor.token });
  record('archived-direct-read', archiveRead.status === 200 && archiveRead.data.status === 'ARCHIVED', `HTTP ${archiveRead.status}; status=${archiveRead.data?.status}`);
  const crossTenant = await lab.call(`/projects/${ids.foreign}`, { token: advisor.token });
  record('cross-tenant-direct-denial', [403, 404].includes(crossTenant.status), `HTTP ${crossTenant.status}`);
  const adminCrossTenant = await lab.call(`/projects/${ids.active}`, { token: adminB.token });
  record('admin-cross-tenant-direct-denial', [403, 404].includes(adminCrossTenant.status), `HTTP ${adminCrossTenant.status}`);
  const unassignedRead = await lab.call(`/projects/${ids.active}`, { token: unassigned.token });
  record('same-tenant-unassigned-direct-denial', [403, 404].includes(unassignedRead.status), `HTTP ${unassignedRead.status}`);
  const unassignedQuality = await lab.call(`/projects/${ids.active}/quality-score`, { token: unassigned.token });
  record('same-tenant-unassigned-quality-denial', [403, 404].includes(unassignedQuality.status), `HTTP ${unassignedQuality.status}`, 'security');
  const disabledList = await lab.call('/projects', { token: adminA.token });
  const disabledRead = await lab.call(`/projects/${ids.disabled}`, { token: adminA.token });
  const disabledListed = Array.isArray(disabledList.data) && disabledList.data.some((item) => item.id === ids.disabled);
  record('disabled-list-direct-consistency', disabledList.status === 200 && !disabledListed && [403, 404].includes(disabledRead.status), `list HTTP ${disabledList.status}; listed=${disabledListed}; direct HTTP ${disabledRead.status}`, 'security');

  const original = { clientId: authorized.data.clientId, buildingId: authorized.data.buildingId };
  const forgedParent = await lab.call(`/projects/${ids.active}`, { method: 'PUT', token: advisor.token, body: { clientId: ids.clientB, buildingId: ids.buildingB } });
  const forgedRead = await lab.call(`/projects/${ids.active}`, { token: advisor.token });
  const crossParentAccepted = forgedParent.status < 300 && forgedRead.data?.buildingId === ids.buildingB;
  record('cross-tenant-parent-substitution-denial', !crossParentAccepted, `update HTTP ${forgedParent.status}; building=${forgedRead.data?.buildingId}; client=${forgedRead.data?.clientId}`, 'security');
  if (crossParentAccepted) {
    const restored = await lab.call(`/projects/${ids.active}`, { method: 'PUT', token: advisor.token, body: original });
    record('synthetic-parent-fixture-restored', restored.status < 300, `HTTP ${restored.status}`, 'cleanup');
  }
  const forgedOrganization = await lab.call(`/projects/${ids.active}`, { method: 'PUT', token: advisor.token, body: { organizationId: ids.orgB } });
  record('organization-substitution-denial', forgedOrganization.status === 403, `HTTP ${forgedOrganization.status}`, 'security');
  const forgedResponsible = await lab.call(`/projects/${ids.active}`, { method: 'PUT', token: advisor.token, body: { userId: ids.unassigned } });
  record('responsible-substitution-denial', forgedResponsible.status === 403, `HTTP ${forgedResponsible.status}`, 'security');

  const originalName = authorized.data.name;
  const concurrentFirst = await lab.call(`/projects/${ids.active}`, { method: 'PUT', token: advisor.token, body: { name: 'Synthetic concurrent edit A' } });
  const concurrentSecond = await lab.call(`/projects/${ids.active}`, { method: 'PUT', token: adminA.token, body: { name: 'Synthetic concurrent edit B' } });
  const concurrentFinal = await lab.call(`/projects/${ids.active}`, { token: advisor.token });
  record('concurrent-stale-write-detection', !(concurrentFirst.status < 300 && concurrentSecond.status < 300 && concurrentFinal.data?.name === 'Synthetic concurrent edit B'), `first=${concurrentFirst.status}; second=${concurrentSecond.status}; final=${concurrentFinal.data?.name}`, 'integrity');
  await lab.call(`/projects/${ids.active}`, { method: 'PUT', token: advisor.token, body: { name: originalName } });
  const archiveUpdate = await lab.call(`/projects/${ids.archived}`, { method: 'PUT', token: advisor.token, body: { name: 'Forbidden archive mutation' } });
  record('archived-mutation-denial', archiveUpdate.status === 403, `HTTP ${archiveUpdate.status}`);

  browser = await puppeteer.launch({ headless: true });
  const isolated = await lab.createIsolatedSession('advisor', { browser });
  const page = isolated.page;
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(`${process.env.CORO_QA_FRONTEND_URL}/projects`, { waitUntil: 'networkidle0' });
  const listLink = await page.$(`a[href="/projects/${ids.active}"]`);
  if (listLink) await listLink.click();
  await page.waitForFunction((id) => location.pathname === `/projects/${id}`, {}, ids.active);
  record('list-to-detail-navigation', page.url().endsWith(`/projects/${ids.active}`), page.url());
  await page.reload({ waitUntil: 'networkidle0' });
  record('detail-f5', page.url().endsWith(`/projects/${ids.active}`), page.url());
  await page.goBack({ waitUntil: 'networkidle0' });
  record('browser-back-to-list', new URL(page.url()).pathname === '/projects', page.url());
  const viewports = [
    { width: 390, height: 844 }, { width: 768, height: 1024 },
    { width: 1440, height: 900 }, { width: 2560, height: 1440 },
  ];
  const themes = [
    { name: 'classic', ui: 'legacy', theme: 'LIGHT' },
    { name: 'glass-light', ui: 'glass', theme: 'LIGHT' },
    { name: 'glass-dark', ui: 'glass', theme: 'DARK' },
  ];
  for (const viewport of viewports) {
    await page.setViewport(viewport);
    for (const theme of themes) {
      await page.goto(process.env.CORO_QA_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ ui, preference }) => {
        localStorage.setItem('coro-ui-generation', ui);
        localStorage.setItem('coro-theme-preference', preference);
      }, { ui: theme.ui, preference: theme.theme });
      await page.goto(`${process.env.CORO_QA_FRONTEND_URL}/projects/${ids.active}`, { waitUntil: 'networkidle0' });
      const geometry = await page.evaluate(() => {
        const root = document.documentElement;
        const actionable = [...document.querySelectorAll('button, a')].filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        const projectActionPattern = /Journal|Activit|Mod.le|Proc.dures|Mandat|Archiver|Supprimer|Configurer|G.n.rer|Aper.u|Exporter|D.poser/;
        const outside = actionable.filter((el) => {
          const rect = el.getBoundingClientRect();
          return !el.closest('nav, aside') && projectActionPattern.test(el.textContent || '') && (rect.right > innerWidth + 1 || rect.left < -1);
        }).map((el) => el.textContent?.trim().slice(0, 80));
        return {
          path: location.pathname,
          title: document.querySelector('h2')?.textContent?.trim() || '',
          overflow: root.scrollWidth > root.clientWidth,
          outside,
          visibleActions: actionable.map((el) => el.textContent?.trim()).filter(Boolean).slice(0, 30),
          ui: root.getAttribute('data-ui'), theme: root.getAttribute('data-theme'),
        };
      });
      const pass = geometry.path === `/projects/${ids.active}` && geometry.title.includes('Synthetic PMU') && !geometry.overflow && geometry.outside.length === 0;
      report.matrix.push({ viewport, theme: theme.name, geometry, status: pass ? 'PASS' : 'FAIL' });
      await page.screenshot({ path: join(evidenceRoot, `${viewport.width}-${theme.name}.png`), fullPage: true });
    }
  }
  record('browser-responsive-12-of-12', report.matrix.every((item) => item.status === 'PASS'), `${report.matrix.filter((item) => item.status === 'PASS').length}/12`);

  await page.goto(`${process.env.CORO_QA_FRONTEND_URL}/projects/${ids.archived}`, { waitUntil: 'networkidle0' });
  const archivedUi = await page.evaluate(() => ({
    text: document.body.innerText,
    archiveButton: [...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Archiver')),
    deleteButton: [...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Supprimer')),
  }));
  record('archived-ui-no-mutation-actions', !archivedUi.archiveButton && !archivedUi.deleteButton, `archive=${archivedUi.archiveButton}; delete=${archivedUi.deleteButton}`);

  const outage = await isolated.context.newPage();
  await outage.setRequestInterception(true);
  outage.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === `/api/projects/${ids.active}`) request.respond({ status: 503, contentType: 'application/json', body: '{"message":"synthetic outage"}' });
    else request.continue();
  });
  await outage.goto(`${process.env.CORO_QA_FRONTEND_URL}/projects/${ids.active}`, { waitUntil: 'networkidle0' });
  const outageState = await outage.evaluate(() => ({
    body: document.body.innerText,
    alert: document.querySelector('[role="alert"]')?.textContent || '',
    retry: [...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Réessayer')),
  }));
  record('primary-outage-truthful-state', !outageState.body.includes('Projet introuvable') && Boolean(outageState.alert) && outageState.retry, JSON.stringify(outageState), 'ux');
  await outage.screenshot({ path: join(evidenceRoot, 'primary-outage.png'), fullPage: true });
  await outage.close();

  record('critical-console-errors', consoleErrors.length === 0, `count=${consoleErrors.length}; ${consoleErrors.slice(0, 3).join(' | ')}`, 'ux');
} finally {
  if (browser) await browser.close();
  await adapter.close();
  await prisma.$disconnect();
  report.pass = report.checks.every((item) => item.status === 'PASS');
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(join(evidenceRoot, 'acceptance.json'), JSON.stringify(report, null, 2));
}

console.log(JSON.stringify({ pass: report.pass, checks: report.checks.length, matrix: report.matrix.length, failures: report.checks.filter((item) => item.status === 'FAIL').map((item) => item.id) }));
