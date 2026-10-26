#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const dependencyRoot = resolve(process.env.CORO_QA_DEPENDENCY_ROOT || 'coro-backend');
const require = createRequire(join(dependencyRoot, 'package.json'));
const puppeteer = require('puppeteer');
const portal = (process.env.CORO_QA_PORTAL_URL || 'http://127.0.0.1:3317').replace(/\/$/, '');
const output = resolve(process.env.CORO_QA_BROWSER_EVIDENCE || join('qa', 'client-acceptance', 'evidence', 'building-card-layout'));

const buildings = Array.from({ length: 7 }, (_, index) => ({
  id: `synthetic-building-${index + 1}`,
  name: index === 0 ? 'Édifice synthétique au nom volontairement très long pour vérifier le retour du texte' : `Édifice synthétique ${index + 1}`,
  address: `${1000 + index}, boulevard de démonstration avec une adresse volontairement longue`,
  city: 'Montréal',
  province: 'Québec',
  photoBase64: index === 0 ? 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="900" height="320"%3E%3Crect width="100%25" height="100%25" fill="%23d6eaf8"/%3E%3C/svg%3E' : null,
  projectCount: index + 1,
  validatedCount: index,
  activeCount: 1,
  responsableFirstName: 'Responsable',
  responsableLastName: 'Synthétique',
  responsableTitre: 'Gestionnaire de démonstration',
}));

const readiness = buildings.map((building) => ({ buildingId: building.id, status: 'READY', readinessIndex: 92 }));
const user = { id: 'synthetic-user', email: 'layout@example.test', firstName: 'QA', lastName: 'Layout', role: 'CLIENT_MANAGER', clientId: 'synthetic-client', clientName: 'Organisation synthétique', organizationId: 'synthetic-organization' };
const viewports = [320, 390, 768, 1440, 2560];
const routes = ['/dashboard', '/buildings'];

await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-web-security'] });
const results = [];
try {
  const page = await browser.newPage();
  await page.setBypassServiceWorker(true);
  const browserErrors = [];
  const apiRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.setRequestInterception(true);
  const handleRequest = (request) => {
    const url = request.url();
    if (!url.includes('/api/')) return request.continue();
    apiRequests.push(`${request.method()} ${url}`);
    const corsHeaders = { 'access-control-allow-origin': portal, 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,OPTIONS' };
    if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers: corsHeaders });
    let body = {};
    if (url.endsWith('/client-auth/me')) body = user;
    else if (url.endsWith('/client-portal/notifications')) body = [];
    else if (url.endsWith('/client-portal/network/access')) body = { enabled: false };
    else if (url.endsWith('/client-portal/dashboard')) body = { stats: { total: 28, validated: 20, inProgress: 8 }, upcomingActivities: [] };
    else if (url.endsWith('/client-portal/buildings-readiness')) body = readiness;
    else if (url.endsWith('/client-portal/buildings')) body = buildings;
    request.respond({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(body) });
  };
  page.on('request', handleRequest);
  await page.goto(`${portal}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((value) => {
    localStorage.setItem('coro_client_token', 'synthetic-layout-token');
    localStorage.setItem('coro_client_user', JSON.stringify(value));
  }, user);

  for (const width of viewports) {
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    for (const route of routes) {
      const routePage = route === '/dashboard' ? page : await browser.newPage();
      if (routePage !== page) {
        await routePage.setBypassServiceWorker(true);
        routePage.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
        routePage.on('pageerror', (error) => browserErrors.push(error.message));
        await routePage.setRequestInterception(true);
        routePage.on('request', handleRequest);
        await routePage.setViewport({ width, height: 900, deviceScaleFactor: 1 });
        await routePage.goto(`${portal}/login`, { waitUntil: 'domcontentloaded' });
      }
      await routePage.evaluate((value) => {
        localStorage.setItem('coro_client_token', 'synthetic-layout-token');
        localStorage.setItem('coro_client_user', JSON.stringify(value));
      }, user);
      await routePage.goto(`${portal}${route}`, { waitUntil: 'networkidle2' });
      try {
        await routePage.waitForFunction(() => document.body.innerText.includes('Édifice synthétique'), { timeout: 10000 });
      } catch (error) {
        throw new Error(`Building cards did not render on ${route} at ${width}px: ${await routePage.evaluate(() => document.body.innerText)}; API requests: ${apiRequests.join(' | ')}; browser errors: ${browserErrors.join(' | ')}`, { cause: error });
      }
      const geometry = await routePage.evaluate(() => {
        const cards = [...document.querySelectorAll('div')].filter((element) => getComputedStyle(element).maxWidth === '445px');
        const boxes = cards.map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { left: rect.left, right: rect.right, width: rect.width, borderBox: style.boxSizing, overflowX: element.scrollWidth > element.clientWidth + 1 };
        });
        const root = document.documentElement;
        return { boxes, globalOverflow: root.scrollWidth > root.clientWidth + 1 };
      });
      const maxWidth = Math.max(...geometry.boxes.map((box) => box.width));
      const pass = geometry.boxes.length === buildings.length
        && maxWidth <= 445.01
        && geometry.boxes.every((box) => box.left >= -0.01 && box.right <= width + 0.01 && box.borderBox === 'border-box' && !box.overflowX)
        && !geometry.globalOverflow;
      const id = `${route.slice(1)}-${width}`;
      await routePage.screenshot({ path: join(output, `${id}.png`), fullPage: true });
      results.push({ id, status: pass ? 'PASS' : 'FAIL', viewportWidth: width, cardCount: geometry.boxes.length, cardWidths: geometry.boxes.map((box) => box.width), maxWidth, globalOverflow: geometry.globalOverflow });
      if (routePage !== page) await routePage.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(join(output, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
if (results.some((result) => result.status !== 'PASS')) process.exitCode = 1;
else process.stdout.write(`${JSON.stringify({ execution: 'PASS', output, results })}\n`);
