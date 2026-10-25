import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(
  process.env.CORO_QA_BACKEND_PACKAGE ||
    new URL('../../coro-backend/package.json', import.meta.url),
);
const puppeteer = require('puppeteer');
const portalOrigin = process.env.CORO_QA_PORTAL_ORIGIN || 'http://127.0.0.1:3367';
const evidenceDir = process.env.CORO_QA_EVIDENCE_DIR || path.resolve('qa-evidence', 'map-real-network');
const buildingId = '40000000-0000-4000-8000-000000000001';
const projectId = '50000000-0000-4000-8000-000000000001';
const user = {
  id: '70000000-0000-4000-8000-000000000001',
  email: 'map-manager@global-e2e.test',
  firstName: 'Carte',
  lastName: 'Synthétique',
  role: 'CLIENT_MANAGER',
  clientId: '30000000-0000-4000-8000-000000000001',
  clientName: 'Client synthétique A',
  organizationId: '10000000-0000-4000-8000-000000000001',
  populationPermissions: [],
  operationalReviewPermissions: [],
  correctiveActionPermissions: [],
};

await mkdir(evidenceDir, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
const tileResponses = [];
const failures = [];
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('response', (response) => {
  if (response.url().startsWith('https://tile.openstreetmap.org/')) {
    tileResponses.push({ url: response.url(), status: response.status(), contentType: response.headers()['content-type'] });
  }
});
page.on('requestfailed', (request) => failures.push({ url: request.url(), error: request.failure()?.errorText }));
await page.setRequestInterception(true);
page.on('request', async (request) => {
  const url = request.url();
  const parsed = new URL(url);
  if (!['localhost', '127.0.0.1'].includes(parsed.hostname) || !parsed.pathname.startsWith('/api/')) return request.continue();
  const route = parsed.pathname.slice('/api'.length);
  const headers = {
    'access-control-allow-origin': portalOrigin,
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-methods': 'GET,OPTIONS',
  };
  if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
  const json = (body) => request.respond({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(body) });
  if (route === '/client-auth/me') return json(user);
  if (route === '/client-portal/network/access') return json({ enabled: false });
  if (route === '/client-portal/notifications') return json([]);
  if (route === '/client-portal/buildings') return json([{
    id: buildingId,
    name: 'Édifice synthétique Montréal',
    address: '100, rue QA',
    city: 'Montréal',
    province: 'QC',
    latitude: 45.5017,
    longitude: -73.5673,
    projectCount: 1,
    activeCount: 0,
    projects: [{ id: projectId, name: 'Plan synthétique', documentType: 'PCA', year: 2026, status: 'VALIDATED', updatedAt: new Date().toISOString() }],
  }]);
  return json([]);
});
await page.evaluateOnNewDocument((actor) => {
  localStorage.setItem('coro_client_token', 'synthetic-map-token');
  localStorage.setItem('coro_client_user', JSON.stringify(actor));
}, user);

let result;
try {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${portalOrigin}/map`, { waitUntil: 'networkidle2', timeout: 60_000 });
  await page.waitForSelector('.leaflet-marker-icon', { timeout: 30_000 });
  await page.waitForFunction(() => document.querySelectorAll('.leaflet-tile-loaded').length > 0, { timeout: 30_000 });
  await page.click('.leaflet-marker-icon');
  await page.waitForFunction(() => document.body.innerText.includes('Édifice synthétique Montréal'));
  const attribution = await page.evaluate(() => document.body.innerText.includes('OpenStreetMap contributors'));
  const unpkgRequests = [...tileResponses, ...failures].filter((entry) => entry.url.includes('unpkg.com'));
  const geometry = await page.evaluate(() => ({
    viewport: { width: window.innerWidth, height: window.innerHeight },
    globalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    map: (() => { const r = document.querySelector('.leaflet-container')?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null; })(),
  }));
  await page.screenshot({ path: path.join(evidenceDir, 'map-real-network.png'), fullPage: true });
  result = {
    status: tileResponses.some((entry) => entry.status === 200) && attribution && unpkgRequests.length === 0 && !geometry.globalOverflow ? 'PASS' : 'FAIL',
    portalOrigin,
    library: 'leaflet@1.9.4 bundled locally',
    tileResponses,
    attribution,
    unpkgRequestCount: unpkgRequests.length,
    geometry,
    failedRequests: failures,
    consoleErrors,
    testedAt: new Date().toISOString(),
  };
} catch (error) {
  await page.screenshot({ path: path.join(evidenceDir, 'map-real-network-failure.png'), fullPage: true });
  result = {
    status: 'FAIL',
    error: error instanceof Error ? error.message : String(error),
    currentUrl: page.url(),
    bodyText: await page.evaluate(() => document.body.innerText.slice(0, 4000)),
    tileResponses,
    failedRequests: failures,
    consoleErrors,
    testedAt: new Date().toISOString(),
  };
} finally {
  await browser.close();
}
await writeFile(path.join(evidenceDir, 'map-real-network.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(`CLIENT_MAP_REAL_NETWORK_${result.status}: ${result.tileResponses.length} tile response(s)`);
if (result.status !== 'PASS') process.exitCode = 1;
