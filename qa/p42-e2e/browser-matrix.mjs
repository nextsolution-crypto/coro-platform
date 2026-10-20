import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import puppeteer from '../../coro-backend/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import { loadSecretStore } from '../global-e2e/src/secret-store.mjs';
import { startMfaCaptureAdapter } from '../global-e2e/src/mfa-capture-adapter.mjs';

const require = createRequire(new URL('../../coro-backend/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const origin = 'http://localhost:3157';
const api = 'http://localhost:3156/api';
const buildingId = '40000000-0000-4000-8000-000000000001';
const actorId = '70000000-0000-4000-8000-000000000007';
const evidenceRoot = 'D:/CORO-QA/runs/p42-identity-lab/browser';
const mfaRoot = 'D:/CORO-QA/runs/p42-identity-lab/mfa';
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: mfaRoot, channelToken: secrets.mfaChannelToken });
const prisma = new PrismaClient();
const viewports = [[1440, 900], [1920, 1080], [390, 844], [430, 932]];
const themes = [
  { id: 'classic', ui: 'legacy', theme: 'LIGHT' },
  { id: 'glass-light', ui: 'glass', theme: 'LIGHT' },
  { id: 'glass-dark', ui: 'glass', theme: 'DARK' },
];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!process.env.DATABASE_URL?.includes('127.0.0.1:55442/coro_qa_p42')) throw new Error('Refusing non-P42 QA database');

async function newestMfa(since, recipient) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const url = new URL(`${adapter.url}/challenge`);
    url.searchParams.set('recipient', recipient);
    url.searchParams.set('after', String(since));
    const response = await fetch(url, { headers: { authorization: `Bearer ${secrets.mfaChannelToken}` } });
    if (response.status === 200) return (await response.json()).code;
    await pause(100);
  }
  throw new Error('MFA_CAPTURE_NOT_FOUND');
}

async function login(page) {
  const email = 'portal-corporate-a@global-e2e.test';
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle0' });
  await page.type('#email', email);
  await page.type('#password', secrets.syntheticPassword);
  const since = Date.now() - 1000;
  await page.click('button[type="submit"]');
  await page.waitForSelector('#mfa-code', { timeout: 15000 });
  await page.type('#mfa-code', await newestMfa(since, email));
  await Promise.all([page.click('button[type="button"]'), page.waitForFunction(() => location.pathname === '/dashboard', { timeout: 15000 })]);
}

async function apiCall(page, path, method = 'GET', body) {
  return page.evaluate(async ({ api, path, method, body }) => {
    const response = await fetch(`${api}${path}`, {
      method,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${localStorage.getItem('coro_client_token')}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, payload: await response.json().catch(() => null) };
  }, { api, path, method, body });
}

async function clickByText(page, text) {
  const clicked = await page.$$eval('button', (buttons, needle) => {
    const button = buttons.find((item) => item.textContent?.includes(needle));
    if (!button) return false;
    button.click();
    return true;
  }, text);
  if (!clicked) throw new Error(`BUTTON_NOT_FOUND:${text}`);
}

async function forceDue(taskId) {
  await prisma.incidentTask.update({ where: { id: taskId }, data: { nextEscalationAt: new Date(Date.now() - 1000) } });
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const task = await prisma.incidentTask.findUniqueOrThrow({ where: { id: taskId } });
    if (task.nextEscalationAt && task.nextEscalationAt > new Date()) return task;
    if (task.escalationStatus === 'OPERATOR_QUEUE') return task;
    await pause(1000);
  }
  throw new Error(`ESCALATION_DISPATCH_TIMEOUT:${taskId}`);
}

function geometryScript() {
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const elements = [...document.querySelectorAll('main,nav,header,section,article,form,[role="dialog"],table,input,select,textarea,button')].filter(visible);
  const failures = [];
  const samples = [];
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement?.getBoundingClientRect();
    if (samples.length < 80) samples.push({ tag: element.tagName, text: (element.textContent || '').trim().slice(0, 60), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height });
    if (rect.right > innerWidth + 1 || rect.left < -1) failures.push({ tag: element.tagName, kind: 'viewport', left: rect.left, right: rect.right, width: rect.width });
    if (parent && getComputedStyle(element.parentElement).overflowX !== 'auto' && rect.right > parent.right + 2) failures.push({ tag: element.tagName, kind: 'parent', right: rect.right, parentRight: parent.right });
  }
  return { viewport: { width: innerWidth, height: innerHeight }, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, failures, samples, criticalConsole: window.__p42ConsoleErrors || [] };
}

await fs.mkdir(evidenceRoot, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const results = [];
try {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    window.__p42ConsoleErrors = [];
    const original = console.error;
    console.error = (...args) => { window.__p42ConsoleErrors.push(args.map(String).join(' ')); original(...args); };
  });
  await login(page);
  await page.goto(`${origin}/sentinelle/${buildingId}/incident`, { waitUntil: 'networkidle0' });
  page.once('dialog', (dialog) => dialog.accept());
  await clickByText(page, 'Nouvel incident');
  const triggerResponse = page.waitForResponse((response) => response.url().includes('/client-portal/incidents/trigger') && response.request().method() === 'POST');
  await clickByText(page, 'Déclencher');
  const trigger = await triggerResponse;
  if (trigger.status() !== 201) throw new Error(`TRIGGER_FAILED:${trigger.status()}`);
  const created = await trigger.json();
  const incidentId = created.incident.id;

  const authority = await apiCall(page, '/client-portal/incidents/authority/assign', 'POST', {
    buildingId,
    incidentEventId: incidentId,
    subjectId: actorId,
    operationalRole: 'INCIDENT_COMMANDER',
    permissions: ['INCIDENT_READ', 'INCIDENT_TASK_PARTICIPATE', 'INCIDENT_SUPERVISE', 'INCIDENT_COMMAND', 'PCA_ACTIVATE'],
    reason: 'Explicit P-4.2 browser authority',
  });
  if (authority.status !== 201) throw new Error(`AUTHORITY_ASSIGN_FAILED:${authority.status}:${JSON.stringify(authority.payload)}`);

  const active = await apiCall(page, `/client-portal/incidents/buildings/${buildingId}/active-all`);
  const tasks = active.payload?.find((item) => item.id === incidentId)?.tasks || [];
  if (tasks.length < 2) throw new Error('INSUFFICIENT_INCIDENT_TASKS');

  const lateTask = tasks[0];
  const configuredLate = await apiCall(page, `/client-portal/incidents/tasks/${lateTask.id}/escalation-policy`, 'PUT', {
    severity: 'CRITICAL',
    alternateEmployeeIds: ['p42-alternate-1', 'p42-alternate-2'],
    acknowledgmentSubjectType: 'CLIENT_USER',
    acknowledgmentSubjectId: actorId,
    lockVersion: lateTask.lockVersion,
    reason: 'P-4.2 critical task policy browser acceptance',
  });
  if (configuredLate.status !== 200) throw new Error(`POLICY_FAILED:${configuredLate.status}:${JSON.stringify(configuredLate.payload)}`);
  await forceDue(lateTask.id);
  const lateAck = await apiCall(page, `/client-portal/incidents/tasks/${lateTask.id}/acknowledge`, 'PUT');
  if (lateAck.status !== 200 || !lateAck.payload?.missedAcknowledgmentAt) throw new Error(`LATE_ACK_FAILED:${lateAck.status}`);

  const queueTask = tasks[1];
  const configuredQueue = await apiCall(page, `/client-portal/incidents/tasks/${queueTask.id}/escalation-policy`, 'PUT', {
    severity: 'HIGH',
    alternateEmployeeIds: ['p42-alternate-1', 'p42-alternate-2'],
    acknowledgmentSubjectType: 'CLIENT_USER',
    acknowledgmentSubjectId: actorId,
    lockVersion: queueTask.lockVersion,
    reason: 'P-4.2 operator queue browser acceptance',
  });
  if (configuredQueue.status !== 200) throw new Error(`QUEUE_POLICY_FAILED:${configuredQueue.status}`);
  await forceDue(queueTask.id);
  await forceDue(queueTask.id);
  await forceDue(queueTask.id);
  const queue = await apiCall(page, `/client-portal/incidents/buildings/${buildingId}/escalations/operator-queue`);
  if (queue.status !== 200 || !queue.payload.some((item) => item.id === queueTask.id)) throw new Error('OPERATOR_QUEUE_NOT_VISIBLE');

  for (const [width, height] of viewports) {
    for (const theme of themes) {
      await page.setViewport({ width, height });
      await page.evaluate(({ ui, selectedTheme }) => { localStorage.setItem('coro-ui-generation', ui); localStorage.setItem('coro-theme-preference', selectedTheme); }, { ui: theme.ui, selectedTheme: theme.theme });
      await page.goto(`${origin}/sentinelle/${buildingId}/incidents/${incidentId}`, { waitUntil: 'networkidle0' });
      const geometry = await page.evaluate(geometryScript);
      const appliedTheme = await page.evaluate(() => ({ ui: document.documentElement.getAttribute('data-ui'), theme: document.documentElement.getAttribute('data-theme') }));
      const visible = await page.evaluate(() => ({
        panel: Boolean([...document.querySelectorAll('section')].find((section) => section.querySelector('article') && section.textContent?.includes('CRITICAL'))),
        critical: document.body.innerText.includes('CRITICAL'),
        missed: document.body.innerText.includes('Échéance manquée'),
        queue: document.body.innerText.includes('File opérateur'),
      }));
      const key = `${width}x${height}-${theme.id}`;
      await page.screenshot({ path: `${evidenceRoot}/${key}.png`, fullPage: true });
      const expectedUi = theme.ui === 'glass' ? 'glass' : 'legacy';
      const expectedTheme = theme.theme === 'DARK' ? 'dark' : 'light';
      const pass = geometry.viewport.width === width && geometry.viewport.height === height && !geometry.pageOverflow && geometry.failures.length === 0 && geometry.criticalConsole.length === 0 && visible.panel && visible.critical && visible.missed && visible.queue && appliedTheme.ui === expectedUi && appliedTheme.theme === expectedTheme;
      results.push({ key, pass, visible, appliedTheme, geometry });
    }
  }

  await page.reload({ waitUntil: 'networkidle0' });
  const sessionPersistent = await page.evaluate(() => location.pathname.includes('/sentinelle/') && Boolean(localStorage.getItem('coro_client_token')));
  const report = { status: results.every((item) => item.pass) && sessionPersistent ? 'PASS' : 'FAIL', incidentId, lateTaskId: lateTask.id, queueTaskId: queueTask.id, operatorQueueCount: queue.payload.length, sessionPersistent, results };
  await fs.writeFile(`${evidenceRoot}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, matrix: `${results.filter((item) => item.pass).length}/${results.length}`, incidentId, sessionPersistent }));
  if (report.status !== 'PASS') process.exitCode = 1;
} finally {
  await browser.close();
  await prisma.$disconnect();
  await adapter.close();
}
