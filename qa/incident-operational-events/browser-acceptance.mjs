import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import puppeteer from '../../coro-backend/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import { loadSecretStore } from '../global-e2e/src/secret-store.mjs';
import { startMfaCaptureAdapter } from '../global-e2e/src/mfa-capture-adapter.mjs';

const origin = 'http://127.0.0.1:3173';
const api = 'http://127.0.0.1:3002/api';
const evidenceRoot = 'D:/CORO-QA/runs/incop26/incident-operational-events';
const mfaRoot = process.env.CORO_QA_MFA_DIR;
const buildingId = '40000000-0000-4000-8000-000000000001';
const actorId = '70000000-0000-4000-8000-000000000007';
const projectId = '50000000-0000-4000-8000-000000000001';
const documentId = '8f9b2b26-0343-4d3d-a6d4-100000000001';
const cases = Object.freeze([
  ['ELEVATOR_ENTRAPMENT', 'P012'],
  ['FIRE_PROTECTION_IMPAIRMENT', 'P032'],
  ['HAZARDOUS_ATMOSPHERE', 'P029'],
  ['EMERGENCY_POWER_FAILURE', 'P030'],
  ['SEVERE_ICE_CONDITIONS', 'P025'],
  ['CRITICAL_SAFETY_SYSTEM_LOSS', 'P031'],
]);
const viewports = [[390, 844], [768, 1024], [1440, 900], [2560, 1440]];
const themes = [
  { id: 'classic', ui: 'legacy', theme: 'LIGHT' },
  { id: 'glass-light', ui: 'glass', theme: 'LIGHT' },
  { id: 'glass-dark', ui: 'glass', theme: 'DARK' },
];
const require = createRequire(new URL('../../coro-backend/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: mfaRoot, channelToken: secrets.mfaChannelToken });
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
  await page.waitForSelector('#mfa-code', { timeout: 15_000 });
  await page.type('#mfa-code', await newestMfa(since, email));
  await Promise.all([
    page.click('button[type="button"]'),
    page.waitForFunction(() => location.pathname === '/dashboard', { timeout: 15_000 }),
  ]);
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

function geometry() {
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const controls = [...document.querySelectorAll('button,input,textarea,select,a')].filter(visible);
  const overflow = [...document.querySelectorAll('main,section,article,form,button,input,textarea,select')]
    .filter(visible)
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left < -1 || rect.right > innerWidth + 1;
    })
    .map((element) => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 60), rect: element.getBoundingClientRect().toJSON() }));
  return {
    viewport: [innerWidth, innerHeight],
    pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    overflow,
    tooSmall: controls.filter((element) => {
      const rect = element.getBoundingClientRect();
      return innerWidth <= 390 && (rect.width < 44 || rect.height < 44);
    }).map((element) => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 60), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })),
    titleVisible: document.body.innerText.includes('Module Incident'),
    operationalGuidanceVisible: document.body.innerText.includes('Seuil opérationnel'),
  };
}

await fs.mkdir(evidenceRoot, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const created = [];
const matrix = [];
const consoleErrors = [];
try {
  const page = await browser.newPage();
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await login(page);
  await page.goto(`${origin}/sentinelle/${buildingId}/incident`, { waitUntil: 'networkidle0' });

  for (const [type, expectedProcedure] of cases) {
    const response = await apiCall(page, '/client-portal/incidents/trigger', 'POST', {
      buildingId,
      type,
      description: `[QA-OPERATIONAL-EVENT] ${type}`,
      isExercise: true,
      reason: 'Isolated operational event acceptance',
      triggeredBy: 'Browser supplied spoof must be ignored',
    });
    if (response.status !== 201) throw new Error(`TRIGGER_FAILED:${type}:${response.status}:${JSON.stringify(response.payload)}`);
    const incident = response.payload?.incident;
    if (!incident || incident.type !== type || incident.procedureCode !== expectedProcedure) throw new Error(`PROCEDURE_MISMATCH:${type}`);
    if (incident.triggeredBy === 'Browser supplied spoof must be ignored') throw new Error(`AUTHOR_SPOOF_ACCEPTED:${type}`);
    if (!Array.isArray(incident.procedureSnapshot) || incident.procedureSnapshot.length === 0) throw new Error(`EMPTY_PROCEDURE:${type}`);
    const provenance = incident.interventionSheet?.provenance;
    if (provenance?.projectId !== projectId || provenance?.documentId !== documentId || provenance?.documentVersion !== 7) throw new Error(`PROVENANCE_MISMATCH:${type}:${JSON.stringify(provenance)}`);
    created.push({ id: incident.id, type, procedureCode: incident.procedureCode, taskCount: response.payload.coordinatorStepsCount, provenance });
  }

  const pcaActivations = await prisma.pcaActivation.count({ where: { incidentEventId: { in: created.map(({ id }) => id) } } });
  if (pcaActivations !== 0) throw new Error('PCA_ACTIVATED_AUTOMATICALLY');
  const auditCount = await prisma.incidentAuditEvent.count({ where: { incidentEventId: { in: created.map(({ id }) => id) }, operation: 'INCIDENT_CREATED' } });
  if (auditCount !== cases.length) throw new Error(`AUDIT_COUNT_MISMATCH:${auditCount}`);

  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.scrollTo(0, 0));
  const openButton = await page.$$('button');
  for (const button of openButton) {
    if ((await button.evaluate((node) => node.textContent || '')).includes('Nouvel incident')) { await button.click(); break; }
  }
  await page.waitForFunction(() => document.body.innerText.includes('Personne coincée dans un ascenseur'));
  const elevatorButton = await page.$$('button');
  for (const button of elevatorButton) {
    if ((await button.evaluate((node) => node.textContent || '')).includes('Personne coincée')) { await button.click(); break; }
  }
  await page.waitForFunction(() => document.body.innerText.includes('Seuil opérationnel'));

  for (const [width, height] of viewports) {
    for (const theme of themes) {
      await page.setViewport({ width, height });
      await page.evaluate(({ ui, selectedTheme }) => {
        localStorage.setItem('coro_ui_mode', ui);
        localStorage.setItem('coro_theme', selectedTheme);
      }, { ui: theme.ui, selectedTheme: theme.theme });
      await page.reload({ waitUntil: 'networkidle0' });
      const buttons = await page.$$('button');
      for (const button of buttons) {
        if ((await button.evaluate((node) => node.textContent || '')).includes('Nouvel incident')) { await button.click(); break; }
      }
      await page.waitForFunction(() => document.body.innerText.includes('Personne coincée dans un ascenseur'));
      const typeButtons = await page.$$('button');
      for (const button of typeButtons) {
        if ((await button.evaluate((node) => node.textContent || '')).includes('Personne coincée')) { await button.click(); break; }
      }
      const diagnostic = await page.evaluate(geometry);
      const key = `${width}x${height}-${theme.id}`;
      await page.screenshot({ path: `${evidenceRoot}/${key}.png`, fullPage: true });
      matrix.push({ key, pass: !diagnostic.pageOverflow && diagnostic.overflow.length === 0 && diagnostic.titleVisible && diagnostic.operationalGuidanceVisible, diagnostic });
    }
  }

  const beforeReload = await page.evaluate(() => localStorage.getItem('coro_client_token'));
  await page.reload({ waitUntil: 'networkidle0' });
  const afterReload = await page.evaluate(() => localStorage.getItem('coro_client_token'));
  if (!beforeReload || beforeReload !== afterReload) throw new Error('SESSION_NOT_PERSISTED_ON_F5');

  const report = {
    status: matrix.every(({ pass }) => pass) && created.length === cases.length ? 'PASS' : 'FAIL',
    created,
    matrix,
    consoleErrors: consoleErrors.filter((entry) => !entry.includes('favicon')),
    pcaActivations,
    auditCount,
    sessionPersistent: beforeReload === afterReload,
  };
  await fs.writeFile(`${evidenceRoot}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, events: created.length, matrix: `${matrix.filter(({ pass }) => pass).length}/${matrix.length}`, pcaActivations, auditCount, consoleErrors: report.consoleErrors.length }));
  if (report.status !== 'PASS') process.exitCode = 1;
} finally {
  await browser.close();
  await adapter.close();
  await prisma.$disconnect();
}
