import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');
const api = process.env.CORO_QA_BACKEND_URL || 'http://127.0.0.1:3002/api';
const portal = process.env.CORO_QA_PORTAL_URL || 'http://127.0.0.1:3003';
const evidence = process.env.CORO_QA_EVIDENCE_DIR || join(root, 'qa', 'global-e2e', '.evidence', 'sentinelle-presence');
const prisma = new PrismaClient();
const report = { startedAt: new Date().toISOString(), api, portal, scenarios: [], matrix: [] };

async function call(route, options = {}) {
  const response = await fetch(`${api}${route}`, { headers: { 'content-type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(`${route}: ${response.status} ${data.message || ''}`);
  return data;
}

async function issue(displayToken) {
  return call(`/occupancy/presence/challenge/${displayToken}`);
}

async function enterPin(page) {
  for (const digit of ['1', '2', '3', '4']) {
    const buttons = await page.$$('button');
    let clicked = false;
    for (const button of buttons) {
      if ((await button.evaluate((node) => node.textContent?.trim())) === digit) {
        await button.click(); clicked = true; break;
      }
    }
    if (!clicked) throw new Error(`PIN digit ${digit} unavailable`);
  }
  await page.waitForFunction(() => document.body.innerText.includes('Confirmer mon'), { timeout: 10_000 });
}

async function confirm(page) {
  const buttons = await page.$$('button');
  for (const button of buttons) {
    const text = await button.evaluate((node) => node.textContent || '');
    if (text.includes('Confirmer mon')) { await button.click(); return; }
  }
  throw new Error('Confirmation action unavailable');
}

async function openPhone(browser, displayToken) {
  const challenge = await issue(displayToken);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.goto(`${portal}/presence/${challenge.sessionId}?challenge=${encodeURIComponent(challenge.challenge)}`, { waitUntil: 'networkidle0' });
  await enterPin(page);
  return { context, page, sessionId: challenge.sessionId };
}

await mkdir(evidence, { recursive: true });
await prisma.$connect();
let browser;
let ids;
try {
  const suffix = Date.now().toString(36);
  const organization = await prisma.organization.create({ data: { name: `QA Browser Sentinelle ${suffix}` } });
  const client = await prisma.client.create({ data: { name: `QA Browser Client ${suffix}`, organizationId: organization.id, regulatoryRequirements: [] } });
  const building = await prisma.building.create({ data: { name: 'Tour synthétique Sentinelle', address: '100 rue QA', city: 'Québec', province: 'QC', organizationId: organization.id, clientId: client.id } });
  const employee = await prisma.buildingEmployee.create({ data: { buildingId: building.id, organizationId: organization.id, firstName: 'Camille', lastName: 'Synthétique', pin: '1234' } });
  const east = await prisma.presenceKioskDisplay.create({ data: { buildingId: building.id, organizationId: organization.id, label: 'Entrée Est' } });
  const west = await prisma.presenceKioskDisplay.create({ data: { buildingId: building.id, organizationId: organization.id, label: 'Entrée Ouest' } });
  ids = { organizationId: organization.id, clientId: client.id, buildingId: building.id, employeeId: employee.id };

  browser = await puppeteer.launch({ headless: true });
  const [phoneA, phoneB] = await Promise.all([openPhone(browser, east.publicToken), openPhone(browser, west.publicToken)]);
  await Promise.all([confirm(phoneA.page), confirm(phoneB.page)]);
  await Promise.all([
    phoneA.page.waitForFunction(() => document.body.innerText.includes('Arrivée enregistrée')),
    phoneB.page.waitForFunction(() => document.body.innerText.includes('Arrivée enregistrée')),
  ]);
  const openCount = await prisma.occupancyRecord.count({ where: { employeeId: employee.id, status: 'IN' } });
  if (openCount !== 1) throw new Error(`Concurrent arrival created ${openCount} open records`);
  report.scenarios.push({ id: 'parallel-arrival-two-entries', status: 'PASS', openCount });
  await phoneA.context.close(); await phoneB.context.close();

  const viewports = [[1440, 900], [1920, 1080], [390, 844], [430, 932]];
  const themes = [
    { id: 'classic', ui: 'legacy', theme: 'light' },
    { id: 'glass-light', ui: 'glass', theme: 'light' },
    { id: 'glass-dark', ui: 'glass', theme: 'dark' },
  ];
  for (const [width, height] of viewports) {
    for (const theme of themes) {
      const phone = await openPhone(browser, east.publicToken);
      await phone.page.setViewport({ width, height, deviceScaleFactor: 1 });
      const geometry = await phone.page.evaluate(({ ui, theme }) => {
        document.documentElement.setAttribute('data-ui', ui);
        document.documentElement.setAttribute('data-theme', theme);
        const controls = [...document.querySelectorAll('button,input,label,section')];
        const boxes = controls.map((node) => {
          const rect = node.getBoundingClientRect();
          return { tag: node.tagName, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
        });
        return {
          viewport: { width: innerWidth, height: innerHeight },
          documentWidth: document.documentElement.scrollWidth,
          overflow: document.documentElement.scrollWidth > innerWidth,
          inaccessible: boxes.filter((box) => box.left < -1 || box.right > innerWidth + 1 || box.width < 1 || box.height < 1),
          boxes,
        };
      }, theme);
      if (geometry.overflow || geometry.inaccessible.length) throw new Error(`Geometry failure ${width}x${height} ${theme.id}`);
      const name = `${width}x${height}-${theme.id}`;
      await phone.page.screenshot({ path: join(evidence, `${name}.png`), fullPage: true });
      report.matrix.push({ name, status: 'PASS', geometry });
      await phone.context.close();
    }
  }
  report.finishedAt = new Date().toISOString();
  report.status = report.matrix.length === 12 ? 'PASS' : 'FAIL';
} finally {
  if (browser) await browser.close();
  if (ids) {
    await prisma.presenceSession.deleteMany({ where: { organizationId: ids.organizationId } });
    await prisma.presenceDeviceSession.deleteMany({ where: { organizationId: ids.organizationId } });
    await prisma.occupancyRecord.deleteMany({ where: { organizationId: ids.organizationId } });
    await prisma.presenceKioskDisplay.deleteMany({ where: { organizationId: ids.organizationId } });
    await prisma.buildingEmployee.deleteMany({ where: { organizationId: ids.organizationId } });
    await prisma.building.deleteMany({ where: { organizationId: ids.organizationId } });
    await prisma.client.deleteMany({ where: { organizationId: ids.organizationId } });
    await prisma.organization.delete({ where: { id: ids.organizationId } });
  }
  await prisma.$disconnect();
  await writeFile(join(evidence, 'report.json'), JSON.stringify(report, null, 2));
}

console.log(JSON.stringify({ status: report.status, matrix: report.matrix.length, evidence }, null, 2));
