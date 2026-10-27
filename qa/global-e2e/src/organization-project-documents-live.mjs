#!/usr/bin/env node
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
const evidenceRoot = assertUnderQaRoot(process.env.CORO_QA_PROJECT_DOCUMENTS_EVIDENCE);
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: process.env.CORO_QA_MFA_DIR, channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const ids = {
  orgA: '10000000-0000-4000-8000-000000000002', orgB: '10000000-0000-4000-8000-000000000003',
  clientA: '30000000-0000-4000-8000-000000000001', buildingA: '40000000-0000-4000-8000-000000000001',
  active: '50000000-0000-4000-8000-000000000001', archived: '50000000-0000-4000-8000-000000000002',
  unassigned: '20000000-0000-4000-8000-000000000019', disabled: '50000000-0000-4000-8000-000000000019',
};
const bytes = Buffer.from('%PDF-1.4\nsynthetic project document\n%%EOF');
const expectedHash = createHash('sha256').update(bytes).digest('hex');
const report = { executedAt: new Date().toISOString(), baseline: process.env.CORO_QA_COMMIT, checks: [], matrix: [] };
const record = (id, pass, detail) => report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const rawLogin = async (email) => {
  const after = Date.now();
  const first = await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } });
  if (first.status >= 300 || !first.data?.mfaRequired) return {};
  const code = await lab.completeMfa({ email, key: email }, after);
  const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } });
  return { token: verified.data?.access_token };
};
const upload = async (projectId, token, name = 'synthetic-project-document.pdf') => {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'application/pdf' }), name);
  form.append('category', 'documents_reference');
  form.append('visibility', 'shared');
  const response = await fetch(`${process.env.CORO_QA_BACKEND_URL}/project-files/project/${projectId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  return { status: response.status, data: await response.json().catch(() => null) };
};

let browser;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const password = await bcrypt.hash(secrets.syntheticPassword, 10);
  await prisma.user.upsert({ where: { id: ids.unassigned }, update: { isActive: true, password }, create: { id: ids.unassigned, email: 'projdocs-unassigned@global-e2e.test', password, firstName: 'Project', lastName: 'Documents', role: 'OPERATOR', organizationId: ids.orgA, isActive: true } });
  await prisma.project.upsert({ where: { id: ids.disabled }, update: { isActive: false }, create: { id: ids.disabled, name: 'Disabled document project', documentType: 'PMU', year: 2026, organizationId: ids.orgA, clientId: ids.clientA, buildingId: ids.buildingA, userId: ids.unassigned, isActive: false } });
  const advisor = await lab.loginAs('advisor');
  const adminA = await rawLogin('customer-admin-a@global-e2e.test');
  const adminB = await rawLogin('customer-admin-b@global-e2e.test');
  const unassigned = await rawLogin('projdocs-unassigned@global-e2e.test');
  record('mfa-actors', [advisor.token, adminA.token, adminB.token, unassigned.token].every(Boolean), 'four isolated MFA sessions');

  const uploaded = await upload(ids.active, advisor.token);
  record('authorized-upload', uploaded.status === 201 && uploaded.data?.url === 'private:project-file', `HTTP ${uploaded.status}`);
  const fileId = uploaded.data?.id;
  const list = await lab.call(`/project-files/project/${ids.active}`, { token: advisor.token });
  record('authorized-list', list.status === 200 && list.data.some((item) => item.id === fileId), `HTTP ${list.status}`);
  const sameTenantDenied = await lab.call(`/project-files/project/${ids.active}`, { token: unassigned.token });
  record('same-tenant-unassigned-denial', sameTenantDenied.status === 404, `HTTP ${sameTenantDenied.status}`);
  const crossTenantDenied = await lab.call(`/project-files/project/${ids.active}`, { token: adminB.token });
  record('cross-tenant-denial', crossTenantDenied.status === 404, `HTTP ${crossTenantDenied.status}`);
  const disabledDenied = await lab.call(`/project-files/project/${ids.disabled}`, { token: adminA.token });
  record('disabled-project-denial', disabledDenied.status === 404, `HTTP ${disabledDenied.status}`);
  const archivedRead = await lab.call(`/project-files/project/${ids.archived}`, { token: advisor.token });
  record('archived-read', archivedRead.status === 200, `HTTP ${archivedRead.status}`);
  const archivedWrite = await upload(ids.archived, advisor.token, 'forbidden.pdf');
  record('archived-write-denial', archivedWrite.status === 404, `HTTP ${archivedWrite.status}`);
  const history = await lab.call(`/project-files/${fileId}/history`, { token: advisor.token });
  record('authorized-history', history.status === 200 && history.data.some((event) => event.action === 'UPLOADED'), `HTTP ${history.status}`);
  const response = await fetch(`${process.env.CORO_QA_BACKEND_URL}/project-files/${fileId}/content`, { headers: { Authorization: `Bearer ${advisor.token}` } });
  const downloaded = Buffer.from(await response.arrayBuffer());
  record('authorized-download-sha256', response.status === 200 && createHash('sha256').update(downloaded).digest('hex') === expectedHash, `HTTP ${response.status}; bytes=${downloaded.length}`);
  const deniedDownload = await fetch(`${process.env.CORO_QA_BACKEND_URL}/project-files/${fileId}/content`, { headers: { Authorization: `Bearer ${unassigned.token}` } });
  const deniedBytes = Buffer.from(await deniedDownload.arrayBuffer());
  record('unauthorized-download-no-bytes', deniedDownload.status === 404 && !deniedDownload.headers.get('content-type')?.includes('application/pdf') && createHash('sha256').update(deniedBytes).digest('hex') !== expectedHash, `HTTP ${deniedDownload.status}; protected-bytes=false`);

  browser = await puppeteer.launch({ headless: true });
  const session = await lab.createIsolatedSession('advisor', { browser });
  const page = session.page;
  const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 2560, height: 1440 }];
  const themes = [{ name: 'classic', ui: 'legacy', theme: 'LIGHT' }, { name: 'glass-light', ui: 'glass', theme: 'LIGHT' }, { name: 'glass-dark', ui: 'glass', theme: 'DARK' }];
  for (const viewport of viewports) for (const theme of themes) {
    await page.setViewport(viewport);
    await page.goto(process.env.CORO_QA_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate((value) => { localStorage.setItem('coro-ui-generation', value.ui); localStorage.setItem('coro-theme-preference', value.theme); }, theme);
    await page.goto(`${process.env.CORO_QA_FRONTEND_URL}/projects/${ids.active}`, { waitUntil: 'networkidle0' });
    const geometry = await page.evaluate(() => { const scope = document.querySelector('[data-testid="project-files-space"]'); return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, fileHeading: Boolean(scope?.textContent?.includes('Espace de fichiers')), clipped: [...(scope?.querySelectorAll('button') || [])].filter((element) => { const r = element.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1); }).length }; });
    const pass = geometry.fileHeading && !geometry.overflow && geometry.clipped === 0;
    report.matrix.push({ viewport, theme: theme.name, geometry, status: pass ? 'PASS' : 'FAIL' });
    await page.screenshot({ path: join(evidenceRoot, `${viewport.width}-${theme.name}.png`), fullPage: true });
  }
  record('browser-matrix', report.matrix.every((item) => item.status === 'PASS'), `${report.matrix.filter((item) => item.status === 'PASS').length}/12`);
  const outage = await session.context.newPage();
  let failDocumentList = true;
  await outage.setRequestInterception(true);
  outage.on('request', (request) => {
    const url = new URL(request.url());
    if (failDocumentList && url.pathname === `/api/project-files/project/${ids.active}`) {
      request.respond({ status: 503, contentType: 'application/json', body: '{"message":"synthetic outage"}' });
    } else request.continue();
  });
  await outage.goto(`${process.env.CORO_QA_FRONTEND_URL}/projects/${ids.active}`, { waitUntil: 'networkidle0' });
  const errorVisible = await outage.$eval('[data-testid="project-files-space"]', (scope) => Boolean(scope.querySelector('[role="alert"]')) && [...scope.querySelectorAll('button')].some((button) => button.textContent?.includes('Réessayer')));
  failDocumentList = false;
  await outage.$$eval('[data-testid="project-files-space"] button', (buttons) => buttons.find((button) => button.textContent?.includes('Réessayer'))?.click());
  await outage.waitForFunction(() => document.querySelector('[data-testid="project-files-space"]')?.textContent?.includes('synthetic-project-document.pdf'));
  const recovered = await outage.$eval('[data-testid="project-files-space"]', (scope) => !scope.querySelector('[role="alert"]'));
  record('browser-503-retry-recovery', errorVisible && recovered, `error=${errorVisible}; recovered=${recovered}`);
  await outage.screenshot({ path: join(evidenceRoot, '503-recovered.png'), fullPage: true });
  await outage.close();
} finally {
  if (browser) await browser.close();
  await adapter.close();
  await prisma.$disconnect();
  report.pass = report.checks.every((item) => item.status === 'PASS');
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(join(evidenceRoot, 'acceptance.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ pass: report.pass, checks: report.checks.length, failures: report.checks.filter((item) => item.status === 'FAIL').map((item) => item.id), matrix: report.matrix.length }));
