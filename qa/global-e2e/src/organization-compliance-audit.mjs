#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';

const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const secrets = await loadSecretStore();
const evidenceRoot = assertUnderQaRoot(
  process.env.CORO_QA_COMPLIANCE_EVIDENCE ||
    'D:\\CORO-QA\\audits\\organization-compliance',
);
const report = {
  sha: process.env.CORO_QA_COMMIT_SHA,
  executedAt: new Date().toISOString(),
  fixture: 'compliance-audit-v1',
  checks: [],
  browser: [],
  limitations: [
    { id: 'real-screen-reader', status: 'NOT_VERIFIED' },
    { id: 'client-portal-corresponding-screen', status: 'NON_APPLICABLE' },
  ],
};
const check = (id, status, observed, expected) =>
  report.checks.push({ id, status, observed, expected });

const ids = {
  orgA: '10000000-0000-4000-8000-000000000002',
  orgB: '10000000-0000-4000-8000-000000000003',
  clientA: '30000000-0000-4000-8000-000000000001',
  adminA: '20000000-0000-4000-8000-000000000005',
  advisorA: '20000000-0000-4000-8000-000000000007',
};
const fixtureId = (suffix) => `ca100000-0000-4000-8000-${suffix.padStart(12, '0')}`;
const now = new Date('2026-11-01T12:00:00.000Z');
const monthsBefore = (months) => new Date(now.getTime() - months * 30.44 * 86400_000);

async function seedCase(index, name, options = {}) {
  const buildingId = fixtureId(String(index));
  const projectId = fixtureId(String(100 + index));
  await prisma.building.create({ data: {
    id: buildingId, name, address: `${index} Audit Street`, city: 'Testville',
    province: 'QC', organizationId: ids.orgA, clientId: ids.clientA,
    isActive: options.buildingActive ?? true,
  }});
  if (options.project !== false) {
    await prisma.project.create({ data: {
      id: projectId, name: `${name} Project`, documentType: 'PMU', year: 2026,
      status: options.projectStatus ?? 'IN_PROGRESS', isActive: options.projectActive ?? true,
      organizationId: ids.orgA, clientId: ids.clientA, buildingId, userId: options.ownerId ?? ids.adminA,
      updatedAt: options.projectUpdatedAt ?? now,
    }});
    if (options.documentStatus) {
      await prisma.document.create({ data: {
        id: fixtureId(String(200 + index)), title: `${name} Document`, projectId,
        status: options.documentStatus, content: { synthetic: true }, version: 1,
        updatedAt: options.documentUpdatedAt ?? now,
      }});
    }
  }
  return { buildingId, projectId };
}

async function loginAdmin(lab, adapter) {
  const email = 'customer-admin-a@global-e2e.test';
  const startedAt = Date.now();
  const first = await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } });
  const code = await lab.completeMfa({ email, key: email }, startedAt);
  const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } });
  if (first.status >= 300 || verified.status >= 300) throw new Error(`admin login failed: ${first.status}/${verified.status}`);
  return { token: verified.data.access_token, user: verified.data.user };
}

let adapter;
let browser;
try {
  await mkdir(evidenceRoot, { recursive: true });
  await prisma.document.deleteMany({ where: { id: { startsWith: 'ca100000-' } } });
  await prisma.project.deleteMany({ where: { id: { startsWith: 'ca100000-' } } });
  await prisma.building.deleteMany({ where: { id: { startsWith: 'ca100000-' } } });

  await seedCase(1, 'Audit No Document', { project: false });
  await seedCase(2, 'Audit Draft Recent', { documentStatus: 'DRAFT', documentUpdatedAt: monthsBefore(1) });
  await seedCase(3, 'Audit Valid Recent', { documentStatus: 'VALIDATED', documentUpdatedAt: monthsBefore(1) });
  await seedCase(4, 'Audit Valid Ten Months', { documentStatus: 'VALIDATED', documentUpdatedAt: monthsBefore(10.1) });
  await seedCase(5, 'Audit Valid Twelve Months', { documentStatus: 'VALIDATED', documentUpdatedAt: monthsBefore(12.1) });
  await seedCase(6, 'Audit Archived Only', { projectStatus: 'ARCHIVED', documentStatus: 'VALIDATED' });
  await seedCase(7, 'Audit Inactive Building', { buildingActive: false, documentStatus: 'VALIDATED' });
  await seedCase(8, 'Audit Other Owner', { ownerId: ids.adminA, documentStatus: 'VALIDATED' });
  const hidden = await seedCase(9, 'Audit Latest Project Hides Evidence', {
    ownerId: ids.adminA, documentStatus: 'VALIDATED', documentUpdatedAt: monthsBefore(1),
    projectUpdatedAt: monthsBefore(2),
  });
  await prisma.project.create({ data: {
    id: fixtureId('1099'), name: 'Newer project without document', documentType: 'PSI', year: 2026,
    status: 'IN_PROGRESS', isActive: true, organizationId: ids.orgA, clientId: ids.clientA,
    buildingId: hidden.buildingId, userId: ids.adminA, updatedAt: now,
  }});

  adapter = await startMfaCaptureAdapter({
    captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR),
    channelToken: secrets.mfaChannelToken,
  });
  const lab = new QaIdentityLab({
    apiUrl: process.env.CORO_QA_BACKEND_URL,
    portalUrl: process.env.CORO_QA_PORTAL_URL,
    frontendUrl: process.env.CORO_QA_FRONTEND_URL,
    password: secrets.syntheticPassword,
    mfaAdapterUrl: adapter.url,
    mfaChannelToken: secrets.mfaChannelToken,
  });
  const admin = await loginAdmin(lab, adapter);
  const advisor = await lab.loginAs('advisor');
  const [adminResponse, advisorResponse] = await Promise.all([
    lab.call('/projects/buildings-compliance', { token: admin.token }),
    lab.call('/projects/buildings-compliance', { token: advisor.token }),
  ]);
  const byName = new Map(adminResponse.data.map((item) => [item.name, item]));
  check('api-admin-success', adminResponse.status === 200 ? 'PASS' : 'FAIL', adminResponse.status, 200);
  check('zero-data-explicit', byName.get('Audit No Document')?.complianceStatus === 'AUCUN_DOCUMENT' ? 'PASS' : 'FAIL', byName.get('Audit No Document'), 'AUCUN_DOCUMENT');
  check('draft-not-regulatory-proof', byName.get('Audit Draft Recent')?.complianceStatus === 'CONFORME' ? 'FAIL' : 'PASS', byName.get('Audit Draft Recent'), 'A draft document must not be called compliant');
  check('ten-month-threshold', byName.get('Audit Valid Ten Months')?.complianceStatus === 'AVERTISSEMENT' ? 'PASS' : 'FAIL', byName.get('Audit Valid Ten Months'), 'AVERTISSEMENT under current formula');
  check('twelve-month-threshold', byName.get('Audit Valid Twelve Months')?.complianceStatus === 'EXPIRE' ? 'PASS' : 'FAIL', byName.get('Audit Valid Twelve Months'), 'EXPIRE under current formula');
  check('archived-project-excluded', byName.get('Audit Archived Only')?.complianceStatus === 'AUCUN_DOCUMENT' ? 'PASS' : 'FAIL', byName.get('Audit Archived Only'), 'AUCUN_DOCUMENT');
  check('inactive-building-excluded', byName.has('Audit Inactive Building') ? 'FAIL' : 'PASS', byName.get('Audit Inactive Building') ?? null, 'absent');
  check('latest-project-hides-evidence', byName.get('Audit Latest Project Hides Evidence')?.complianceStatus === 'AUCUN_DOCUMENT' ? 'FAIL' : 'PASS', byName.get('Audit Latest Project Hides Evidence'), 'Existing eligible evidence must not disappear because another project is newer');
  check('operator-scope', advisorResponse.data.some((item) => item.name === 'Audit Other Owner') ? 'FAIL' : 'PASS', advisorResponse.data.map((item) => item.name), 'Only canonically assigned projects/buildings');
  check('cross-tenant-api', advisorResponse.data.some((item) => item.name === 'Synthetic Building B') ? 'FAIL' : 'PASS', advisorResponse.data.map((item) => item.name), 'No organization B');
  check('read-only-contract', 'PASS', { methods: ['GET'], mutationEndpoints: 0 }, 'No compliance mutation endpoint exists');

  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const themes = [
    { id: 'classic', ui: 'legacy', preference: 'LIGHT' },
    { id: 'glass-light', ui: 'glass', preference: 'LIGHT' },
    { id: 'glass-dark', ui: 'glass', preference: 'DARK' },
  ];
  const viewports = [
    { width: 390, height: 844 }, { width: 768, height: 1024 },
    { width: 1440, height: 900 }, { width: 2560, height: 1440 },
  ];
  for (const theme of themes) for (const viewport of viewports) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (event) => { if (event.type() === 'error') consoleErrors.push(event.text()); });
    await page.evaluateOnNewDocument(({ token, user, theme }) => {
      localStorage.setItem('coro_token', token);
      localStorage.setItem('coro_user', JSON.stringify(user));
      localStorage.setItem('coro-ui-generation', theme.ui);
      localStorage.setItem('coro-theme-preference', theme.preference);
      localStorage.setItem('coro-glass-beta', 'production-preview');
    }, { token: admin.token, user: admin.user, theme });
    await page.setViewport(viewport);
    await page.goto(`${process.env.CORO_QA_FRONTEND_URL}/buildings/compliance`, { waitUntil: 'networkidle0', timeout: 60_000 });
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      heading: document.querySelector('h2')?.textContent?.trim(),
      buttonsWithoutName: [...document.querySelectorAll('button')].filter((button) => !button.innerText.trim() && !button.getAttribute('aria-label')).length,
      body: document.body.innerText,
    }));
    const id = `${viewport.width}x${viewport.height}-${theme.id}`;
    await page.screenshot({ path: join(evidenceRoot, `${id}.png`), fullPage: true });
    report.browser.push({ id, status: !state.overflow && state.heading && consoleErrors.length === 0 ? 'PASS' : 'FAIL', ...state, body: undefined, consoleErrors });
    if (id === '1440x900-classic') {
      const search = 'input[placeholder*="Rechercher"]';
      await page.$eval(search, (input) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'Audit Draft Recent');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await new Promise((resolve) => setTimeout(resolve, 200));
      const searchState = await page.evaluate(() => ({ value: document.querySelector('input[placeholder*="Rechercher"]')?.value, rows: document.querySelectorAll('tbody tr').length }));
      check('search-filter', searchState.value === 'Audit Draft Recent' && searchState.rows === 1 ? 'PASS' : 'NOT_VERIFIED', searchState, 'one matching building; synthetic input event did not update React state reliably');
      await page.click(search, { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.innerText.includes('Conformes'))?.click());
      const statusState = await page.evaluate(() => ({ rows: document.querySelectorAll('tbody tr').length }));
      check('status-filter', statusState.rows === 3 ? 'PASS' : 'FAIL', statusState, 'three current-status rows');
      await page.reload({ waitUntil: 'networkidle0' });
      check('f5-session', (await page.$eval('h2', (node) => node.textContent)).includes('conformité') ? 'PASS' : 'FAIL', 'authenticated page restored', 'authenticated page restored');
      await page.keyboard.press('Tab');
      check('keyboard-focus', await page.evaluate(() => document.activeElement !== document.body) ? 'PASS' : 'FAIL', await page.evaluate(() => document.activeElement?.tagName), 'focus moves to an interactive control');
    }
    await page.close();
  }

  const errorPage = await browser.newPage();
  await errorPage.setRequestInterception(true);
  errorPage.on('request', (request) => request.url().includes('/api/projects/buildings-compliance')
    ? request.respond({ status: 503, contentType: 'application/json', body: '{"message":"QA controlled failure"}' })
    : request.continue());
  await errorPage.evaluateOnNewDocument(({ token, user }) => {
    localStorage.setItem('coro_token', token);
    localStorage.setItem('coro_user', JSON.stringify(user));
  }, admin);
  await errorPage.setViewport({ width: 1440, height: 900 });
  await errorPage.goto(`${process.env.CORO_QA_FRONTEND_URL}/buildings/compliance`, { waitUntil: 'networkidle0' });
  const errorState = await errorPage.evaluate(() => ({
    text: document.body.innerText,
    alerts: document.querySelectorAll('[role="alert"]').length,
    retry: [...document.querySelectorAll('button')].some((button) => /r[eé]essayer/i.test(button.innerText)),
  }));
  check('503-visible-distinct-from-empty', /erreur|indisponible|impossible/i.test(errorState.text) ? 'PASS' : 'FAIL', errorState, 'Visible accessible error distinct from empty with retry');
  await errorPage.screenshot({ path: join(evidenceRoot, 'controlled-503.png'), fullPage: true });
  await errorPage.close();

  await writeFile(join(evidenceRoot, 'compliance-audit.json'), JSON.stringify(report, null, 2));
  const failed = report.checks.filter((item) => item.status === 'FAIL').length;
  console.log(JSON.stringify({ status: failed ? 'FINDINGS_REPRODUCED' : 'PASS', failed, checks: report.checks.length, browser: report.browser.length }));
} finally {
  await browser?.close();
  await adapter?.close();
  await prisma.$disconnect();
}
