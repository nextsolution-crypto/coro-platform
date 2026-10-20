import fs from 'node:fs/promises';
import puppeteer from '../../coro-backend/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import { loadSecretStore } from '../global-e2e/src/secret-store.mjs';
import { startMfaCaptureAdapter } from '../global-e2e/src/mfa-capture-adapter.mjs';

const origin = 'http://localhost:3157';
const api = 'http://localhost:3156/api';
const buildingId = '40000000-0000-4000-8000-000000000001';
const actorId = '70000000-0000-4000-8000-000000000007';
const evidenceRoot = 'D:/CORO-QA/runs/p41-identity-lab/browser';
const mfaRoot = 'D:/CORO-QA/runs/p41-identity-lab/mfa';
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: mfaRoot, channelToken: secrets.mfaChannelToken });
const viewports = [[1440, 900], [1920, 1080], [390, 844], [430, 932]];
const themes = [
  { id: 'classic', ui: 'legacy', theme: 'LIGHT' },
  { id: 'glass-light', ui: 'glass', theme: 'LIGHT' },
  { id: 'glass-dark', ui: 'glass', theme: 'DARK' },
];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const response = await fetch(`${api}${path}`, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${localStorage.getItem('coro_client_token')}` }, body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json().catch(() => null);
    return { status: response.status, payload };
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

function geometryScript() {
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const elements = [...document.querySelectorAll('main,nav,header,section,article,form,[role="dialog"],table,input,select,textarea,button')].filter(visible);
  const failures = [];
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement?.getBoundingClientRect();
    if (rect.right > innerWidth + 1 || rect.left < -1) failures.push({ tag: element.tagName, kind: 'viewport', left: rect.left, right: rect.right, width: rect.width });
    if (parent && getComputedStyle(element.parentElement).overflowX !== 'auto' && rect.right > parent.right + 2) failures.push({ tag: element.tagName, kind: 'parent', right: rect.right, parentRight: parent.right });
  }
  return { viewport: { width: innerWidth, height: innerHeight }, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, failures, criticalConsole: window.__p41ConsoleErrors || [] };
}

await fs.mkdir(evidenceRoot, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const results = [];
try {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { window.__p41ConsoleErrors = []; const original = console.error; console.error = (...args) => { window.__p41ConsoleErrors.push(args.map(String).join(' ')); original(...args); }; });
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

  const authority = await apiCall(page, '/client-portal/incidents/authority/assign', 'POST', { buildingId, incidentEventId: incidentId, subjectId: actorId, operationalRole: 'INCIDENT_COMMANDER', permissions: ['INCIDENT_READ', 'INCIDENT_TASK_PARTICIPATE', 'INCIDENT_SUPERVISE', 'INCIDENT_COMMAND', 'PCA_ACTIVATE'], reason: 'Explicit browser E2E assignment' });
  if (authority.status !== 201) throw new Error(`AUTHORITY_ASSIGN_FAILED:${authority.status}:${JSON.stringify(authority.payload)}`);
  await page.reload({ waitUntil: 'networkidle0' });

  const active = await apiCall(page, `/client-portal/incidents/buildings/${buildingId}/active-all`);
  const task = active.payload?.[0]?.tasks?.[0];
  if (!task) throw new Error('NO_INCIDENT_TASK');
  const ack = await apiCall(page, `/client-portal/incidents/tasks/${task.id}/acknowledge`, 'PUT');
  if (ack.status !== 200) throw new Error(`ACK_FAILED:${ack.status}`);
  const reassigned = await apiCall(page, `/client-portal/incidents/tasks/${task.id}/reassign`, 'PUT', { employeeId: 'p41-employee', lockVersion: ack.payload.lockVersion });
  if (reassigned.status !== 200) throw new Error(`REASSIGN_FAILED:${reassigned.status}`);
  const complete = await apiCall(page, `/client-portal/incidents/tasks/${task.id}/complete`, 'PUT');
  if (complete.status !== 200) throw new Error(`COMPLETE_FAILED:${complete.status}`);
  const pca = await apiCall(page, '/client-portal/incidents/pca/activate', 'POST', { buildingId, projectId: '50000000-0000-4000-8000-000000000041', incidentEventId: incidentId, reason: 'P41 browser PCA activation' });
  if (pca.status !== 201) throw new Error(`PCA_FAILED:${pca.status}:${JSON.stringify(pca.payload)}`);

  await page.reload({ waitUntil: 'networkidle0' });
  await page.setOfflineMode(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await pause(1000);
  const offlineDiagnostic = await page.evaluate(() => ({ online: navigator.onLine, path: location.pathname, hasBanner: document.body.innerText.includes('lecture seule'), text: document.body.innerText.slice(0, 300) }));
  if (!offlineDiagnostic.hasBanner) throw new Error(`DEGRADED_BANNER_NOT_VISIBLE:${JSON.stringify(offlineDiagnostic)}`);
  const degraded = await page.evaluate(() => ({ visible: document.body.innerText.includes('lecture seule'), triggerDisabled: [...document.querySelectorAll('button')].some((item) => item.textContent?.includes('Nouvel incident') && item.disabled) }));
  await page.setOfflineMode(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await pause(1000);
  if (!degraded.visible || !degraded.triggerDisabled) throw new Error('DEGRADED_MODE_FAILED');

  for (const [width, height] of viewports) {
    for (const theme of themes) {
      await page.setViewport({ width, height });
      await page.evaluate(({ ui, selectedTheme }) => { localStorage.setItem('coro_ui_mode', ui); localStorage.setItem('coro_theme', selectedTheme); }, { ui: theme.ui, selectedTheme: theme.theme });
      await page.goto(`${origin}/sentinelle/${buildingId}/incident`, { waitUntil: 'networkidle0' });
      const geometry = await page.evaluate(geometryScript);
      const key = `${width}x${height}-${theme.id}`;
      await page.screenshot({ path: `${evidenceRoot}/${key}.png`, fullPage: true });
      const pass = geometry.viewport.width === width && geometry.viewport.height === height && !geometry.pageOverflow && geometry.failures.length === 0 && geometry.criticalConsole.length === 0 && (await page.evaluate(() => document.body.innerText.includes('Module Incident')));
      results.push({ key, pass, geometry });
    }
  }
  await page.reload({ waitUntil: 'networkidle0' });
  const sessionPersistent = await page.evaluate(() => location.pathname.includes('/sentinelle/') && Boolean(localStorage.getItem('coro_client_token')));
  const report = { status: results.every((item) => item.pass) && sessionPersistent ? 'PASS' : 'FAIL', incidentId, degraded, sessionPersistent, results };
  await fs.writeFile(`${evidenceRoot}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, matrix: `${results.filter((item) => item.pass).length}/${results.length}`, incidentId, degraded, sessionPersistent }));
  if (report.status !== 'PASS') process.exitCode = 1;
} finally {
  await browser.close();
  await adapter.close();
}
