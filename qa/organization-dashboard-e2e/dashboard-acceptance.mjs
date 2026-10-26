#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { QaIdentityLab } from '../global-e2e/src/browser-orchestration.mjs';
import { startMfaCaptureAdapter } from '../global-e2e/src/mfa-capture-adapter.mjs';
import { loadSecretStore } from '../global-e2e/src/secret-store.mjs';
import { assertLocalUrl, assertUnderQaRoot } from '../global-e2e/src/policy.mjs';

const apiUrl = assertLocalUrl(process.env.CORO_QA_BACKEND_URL, 'CORO_QA_BACKEND_URL').href.replace(/\/$/, '');
const frontendUrl = assertLocalUrl(process.env.CORO_QA_FRONTEND_URL, 'CORO_QA_FRONTEND_URL').href.replace(/\/$/, '');
const evidenceRoot = assertUnderQaRoot(resolve(process.env.CORO_QA_EVIDENCE_DIR || 'D:\\CORO-QA\\runs\\org-dashboard\\acceptance'));
const dependencyRoot = resolve(process.env.CORO_QA_DEPENDENCY_ROOT || 'coro-backend');
const require = createRequire(join(dependencyRoot, 'package.json'));
const puppeteer = require('puppeteer');
const secrets = await loadSecretStore();
await mkdir(evidenceRoot, { recursive: true });

const adapter = await startMfaCaptureAdapter({
  captureDirectory: process.env.CORO_QA_MFA_DIR,
  channelToken: secrets.mfaChannelToken,
  port: Number(process.env.CORO_QA_MFA_ADAPTER_PORT || 36643),
});
const lab = new QaIdentityLab({
  apiUrl,
  portalUrl: frontendUrl,
  frontendUrl,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});

async function loginInternal(email, expectedRole) {
  const startedAt = Date.now();
  const first = await lab.call('/auth/login', { method: 'POST', body: { email, password: secrets.syntheticPassword } });
  assert.ok([200, 201].includes(first.status));
  assert.equal(first.data?.mfaRequired, true);
  const code = await lab.completeMfa({ email, key: email }, startedAt);
  const verified = await lab.call('/auth/verify-mfa', { method: 'POST', body: { email, code } });
  assert.ok([200, 201].includes(verified.status));
  assert.equal(verified.data?.user?.role, expectedRole);
  return { token: verified.data.access_token, refresh: verified.data.refresh_token, user: verified.data.user };
}

const ids = {
  clientA: '30000000-0000-4000-8000-000000000001',
  buildingA: '40000000-0000-4000-8000-000000000001',
  projectA: '50000000-0000-4000-8000-000000000001',
  projectB: '50000000-0000-4000-8000-000000000003',
};
const results = [];
const record = (id, status, detail) => results.push({ id, status, detail });

try {
  const advisor = await lab.loginAs('advisor');
  const admin = await loginInternal('customer-admin-a@global-e2e.test', 'ADMIN');

  let adminProjects = await lab.call('/projects?limit=200', { token: admin.token });
  const projectList = adminProjects.data?.projects || adminProjects.data || [];
  const hidden = projectList.find((item) => item.name === 'Dashboard Hidden Admin Project');
  assert.ok(hidden, 'synthetic same-tenant unassigned project fixture is required');

  const advisorProjects = await lab.call('/projects?limit=200', { token: advisor.token });
  assert.equal(advisorProjects.status, 200);
  const advisorRows = advisorProjects.data?.projects || advisorProjects.data || [];
  assert.ok(advisorRows.some((item) => item.id === ids.projectA));
  assert.ok(!advisorRows.some((item) => item.id === hidden.id || item.id === ids.projectB));
  record('operator-project-scope', 'PASS', 'assigned project visible; same-tenant unassigned and cross-tenant projects absent');

  adminProjects = await lab.call('/projects?limit=200', { token: admin.token });
  assert.equal(adminProjects.status, 200);
  assert.ok((adminProjects.data?.projects || adminProjects.data || []).some((item) => item.id === hidden.id));
  record('admin-organization-scope', 'PASS', 'organization administrator retains legitimate organization view');

  const searchAdvisor = await lab.call('/projects/search?q=Dashboard', { token: advisor.token });
  const searchAdmin = await lab.call('/projects/search?q=Dashboard', { token: admin.token });
  assert.equal(searchAdvisor.status, 200);
  assert.equal(searchAdmin.status, 200);
  assert.equal(searchAdvisor.data.projects.length, 0);
  assert.ok(searchAdmin.data.projects.some((item) => item.id === hidden.id));
  record('search-scope', 'PASS', 'direct search applies the same operator scope as the project list');

  for (const [id, route] of [
    ['updates', '/projects/upcoming-updates'],
    ['recurring', '/activities/recurring-to-renew'],
    ['upcoming', '/activities/upcoming'],
    ['delays', '/notifications/mandate-delays'],
    ['tasks', '/projects/dashboard/late-tasks'],
  ]) {
    const response = await lab.call(route, { token: advisor.token });
    assert.equal(response.status, 200, `${id} endpoint`);
    const serialized = JSON.stringify(response.data);
    assert.ok(!serialized.includes(ids.projectB));
    assert.ok(!serialized.includes(hidden.id));
    record(`operator-${id}-scope`, 'PASS', 'no same-tenant unassigned or cross-tenant resource returned');
  }
  const deniedApproval = await lab.call('/projects/pending-approval', { token: advisor.token });
  assert.equal(deniedApproval.status, 403);
  const adminSummary = await lab.call('/users/organization/dashboard-summary', { token: admin.token });
  assert.equal(adminSummary.status, 200);
  assert.equal(adminSummary.data.activeOperatorCount, 1);
  record('approval-and-team-authority', 'PASS', 'operator approval denied; admin receives scalar active-adviser summary');

  const revoked = await lab.loginAs('revokedUser');
  assert.equal(revoked.denied, true);
  record('inactive-user', 'PASS', 'inactive identity cannot authenticate');

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
    { width: 2560, height: 1440 },
  ];
  const themes = [
    { id: 'classic', ui: 'legacy', preference: 'LIGHT' },
    { id: 'glass-light', ui: 'glass', preference: 'LIGHT' },
    { id: 'glass-dark', ui: 'glass', preference: 'DARK' },
  ];
  const matrix = [];
  try {
    for (const theme of themes) for (const viewport of viewports) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push({ text: message.text(), url: message.location().url || null });
        }
      });
      await page.setViewport(viewport);
      await page.goto(frontendUrl, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ token, refresh, user, theme }) => {
        localStorage.setItem('coro_token', token);
        localStorage.setItem('coro_refresh_token', refresh);
        localStorage.setItem('coro_user', JSON.stringify(user));
        localStorage.setItem('coro-ui-generation', theme.ui);
        localStorage.setItem('coro-theme-preference', theme.preference);
      }, { token: advisor.token, refresh: advisor.refresh, user: advisor.user, theme });
      await page.goto(`${frontendUrl}/dashboard`, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => document.body.innerText.includes('Bonjour') && !document.body.innerText.includes('Chargement des données'));
      const geometry = await page.evaluate(() => {
        const root = document.documentElement;
        const interactiveDivs = [...document.querySelectorAll('div[role="button"]')].length;
        const clipped = [...document.querySelectorAll('main *')].filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.right > root.clientWidth + 1 && style.position !== 'fixed';
        }).length;
        return { clientWidth: root.clientWidth, scrollWidth: root.scrollWidth, clipped, interactiveDivs, theme: root.getAttribute('data-theme'), ui: root.getAttribute('data-ui') };
      });
      assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, `global overflow ${theme.id} ${viewport.width}`);
      assert.equal(geometry.clipped, 0, `component overflow ${theme.id} ${viewport.width}`);
      assert.equal(geometry.interactiveDivs, 0);
      assert.equal(geometry.theme, theme.preference === 'DARK' ? 'dark' : 'light');
      assert.equal(geometry.ui, theme.ui);
      const screenshot = join(evidenceRoot, `${theme.id}-${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      const criticalConsoleErrors = consoleErrors.filter(({ text }) =>
        !/^Failed to load resource: the server responded with a status of 404\b/i.test(text),
      );
      matrix.push({ theme: theme.id, viewport, status: 'PASS', geometry, consoleErrors, criticalConsoleErrors });
      await writeFile(join(evidenceRoot, 'browser-progress.json'), JSON.stringify(matrix, null, 2));
      assert.equal(criticalConsoleErrors.length, 0, JSON.stringify(criticalConsoleErrors));
      await context.close();
    }

    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => request.url().includes('/activities/upcoming')
      ? request.respond({ status: 503, contentType: 'application/json', body: '{"message":"synthetic failure"}' })
      : request.continue());
    await page.goto(frontendUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('coro_token', token);
      localStorage.setItem('coro_user', JSON.stringify(user));
    }, { token: advisor.token, user: advisor.user });
    await page.goto(`${frontendUrl}/dashboard`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Activités indisponibles'));
    assert.ok((await page.$$('button')).length > 0);
    record('partial-failure-ui', 'PASS', 'secondary failure is explicit and retry remains available');
    await context.close();
  } finally { await browser.close(); }

  assert.equal(matrix.length, 12);
  record('browser-matrix', 'PASS', '12/12 measured Classic, Glass Light and Glass Dark configurations');
  await writeFile(join(evidenceRoot, 'dashboard-acceptance.json'), JSON.stringify({ generatedAt: new Date().toISOString(), apiUrl, frontendUrl, results, matrix }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', scenarios: results.length, browserConfigurations: matrix.length, evidenceRoot }, null, 2));
} finally {
  await adapter.close();
}
