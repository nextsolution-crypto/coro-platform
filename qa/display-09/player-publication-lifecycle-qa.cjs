const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { mkdir, writeFile } = require('node:fs/promises');
const { chromium } = require('../../coro-client-portal/node_modules/playwright-core');

const PUBLIC_ID = 'BBBBBBBBBBBBBBBBBB';
const TOKEN = 'qa-session-token-with-sufficient-length-0002';
const portalOrigin = process.env.DISPLAY09_PORTAL_ORIGIN || 'http://127.0.0.1:3013';
const evidence = path.resolve(process.env.DISPLAY09_EVIDENCE_DIR || '.inspection-evidence/display09-final-e2e');
let publicationVersion = 1;
let withdrawn = false;
let sessionRevoked = false;
const events = [];

function publication() {
  if (withdrawn) return null;
  return {
    id: `publication-v${publicationVersion}`,
    versionNumber: publicationVersion,
    variantVersion: publicationVersion,
    variantSha256: publicationVersion === 1 ? '1'.repeat(64) : '2'.repeat(64),
    variantMimeType: 'image/svg+xml',
    contentPath: `/display-content/v${publicationVersion}`,
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}

function authorized(request) {
  return request.headers.authorization === `Bearer ${TOKEN}` && !sessionRevoked;
}

const api = http.createServer((request, response) => {
  events.push({ type: 'REQUEST', method: request.method, url: request.url });
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (request.method === 'OPTIONS') return response.writeHead(204).end();
  if (request.url === `/api/display-public/d/${PUBLIC_ID}`) {
    return sendJson(response, 200, {
      available: true,
      activationRequired: true,
      location: { label: 'Corridor Est', floor: 'Étage 3' },
      capability: 'WEB_VIEW_ONLY',
      emergencyEligible: false,
    });
  }
  if (request.url === `/api/display-public/d/${PUBLIC_ID}/activate` && request.method === 'POST') {
    sessionRevoked = false;
    events.push({ type: 'ACTIVATED' });
    return sendJson(response, 200, { token: TOKEN });
  }
  if (request.url === `/api/display-public/d/${PUBLIC_ID}/manifest`) {
    if (!authorized(request)) return sendJson(response, 401, { message: 'revoked' });
    events.push({ type: 'MANIFEST', version: publicationVersion, withdrawn });
    return sendJson(response, 200, {
      capability: 'WEB_VIEW_ONLY', emergencyEligible: false, pollingSeconds: 15, publication: publication(),
    });
  }
  if (request.url?.startsWith('/api/display-content/')) {
    if (!authorized(request)) return sendJson(response, 401, { message: 'revoked' });
    const version = request.url.endsWith('v2') ? 2 : 1;
    events.push({ type: 'CONTENT', version });
    const color = version === 1 ? '#164e63' : '#166534';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="1100"><rect width="100%" height="100%" fill="${color}"/><text x="850" y="540" text-anchor="middle" fill="white" font-size="96">TOUR PRÉMONT — PLAN V${version} — DÉMO</text></svg>`;
    response.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
    return response.end(svg);
  }
  if (request.url === `/api/display-public/d/${PUBLIC_ID}/confirm` && request.method === 'POST') {
    if (!authorized(request)) return sendJson(response, 401, { message: 'revoked' });
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    return request.on('end', () => {
      const confirmation = JSON.parse(body);
      events.push({ type: 'CONFIRMED', version: confirmation.version, publicationId: confirmation.publicationId });
      sendJson(response, 200, { accepted: true });
    });
  }
  return sendJson(response, 404, { message: 'not found' });
});

async function eventually(assertion, timeout = 20_000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try { return await assertion(); } catch (error) { lastError = error; await new Promise((resolve) => setTimeout(resolve, 250)); }
  }
  throw lastError;
}

async function main() {
  await mkdir(evidence, { recursive: true });
  // Bind both localhost address families because Next's local API default may
  // resolve to either 127.0.0.1 or ::1 on the QA host.
  await new Promise((resolve, reject) => { api.once('error', reject); api.listen(3002, resolve); });
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${portalOrigin}/d/${PUBLIC_ID}`, { waitUntil: 'networkidle' });
    try {
      await page.getByRole('heading', { name: 'Activer cet affichage' }).waitFor();
    } catch (error) {
      throw new Error(`Activation screen was not displayed; events=${JSON.stringify(events)}; browserErrors=${JSON.stringify(errors)}; body=${(await page.locator('body').innerText()).slice(0, 500)}`, { cause: error });
    }
    await page.getByRole('textbox').fill('123456');
    await page.getByRole('button', { name: /Activer/ }).click();
    try {
      await page.getByAltText('Plan d’évacuation approuvé').waitFor();
    } catch (error) {
      throw new Error(`V1 was not displayed; events=${JSON.stringify(events)}; browserErrors=${JSON.stringify(errors)}; body=${(await page.locator('body').innerText()).slice(0, 500)}`, { cause: error });
    }
    await eventually(() => assert.equal(events.filter((event) => event.type === 'CONFIRMED' && event.version === 1).length, 1));
    await page.screenshot({ path: path.join(evidence, '01-v1-desktop.png'), fullPage: true });
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    assert.equal(events.filter((event) => event.type === 'CONTENT' && event.version === 1).length, 1, 'V1 content must not loop');

    publicationVersion = 2;
    await eventually(() => assert.equal(events.filter((event) => event.type === 'CONFIRMED' && event.version === 2).length, 1), 20_000);
    assert.equal(events.filter((event) => event.type === 'CONTENT' && event.version === 2).length, 1, 'V2 content must be fetched once');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(evidence, '02-v2-mobile.png'), fullPage: true });

    await page.reload({ waitUntil: 'networkidle' });
    await page.getByAltText('Plan d’évacuation approuvé').waitFor();
    await page.screenshot({ path: path.join(evidence, '03-v2-after-f5.png'), fullPage: true });

    withdrawn = true;
    await page.waitForTimeout(16_000);
    await page.getByText('Aucun plan approuvé publié pour cet emplacement.').waitFor();
    await page.screenshot({ path: path.join(evidence, '04-publication-withdrawn.png'), fullPage: true });

    withdrawn = false;
    await page.waitForTimeout(16_000);
    await page.getByAltText('Plan d’évacuation approuvé').waitFor();
    sessionRevoked = true;
    await page.waitForTimeout(16_000);
    await page.getByRole('heading', { name: 'Activer cet affichage' }).waitFor();
    await page.getByRole('alert').filter({ hasText: 'Activation ou session refusée.' }).waitFor();
    await page.screenshot({ path: path.join(evidence, '05-session-revoked.png'), fullPage: true });

    assert.equal(await page.evaluate((key) => localStorage.getItem(key), `coro_display_web_${PUBLIC_ID}`), null);
    assert.equal(events.filter((event) => event.type === 'CONFIRMED' && event.version === 1).length, 1);
    assert.ok(events.filter((event) => event.type === 'CONFIRMED' && event.version === 2).length >= 2, 'V2 confirmed after sync and F5');
    const unexpectedErrors = errors.filter(
      (message) => !message.includes('status of 401 (Unauthorized)'),
    );
    assert.equal(
      unexpectedErrors.length,
      0,
      `browser errors: ${unexpectedErrors.join(' | ')}`,
    );
    const report = {
      result: 'PASS',
      source: 'synthetic isolated HTTP provider',
      v1: 'DISPLAYED_AND_CONFIRMED_ONCE',
      v2: 'AUTO_SYNCED_DISPLAYED_CONFIRMED_AND_PERSISTED_AFTER_F5',
      withdrawal: 'OLD_CONTENT_REMOVED',
      revocation: 'SESSION_CLEARED_AND_REACTIVATION_REQUIRED',
      capability: 'WEB_VIEW_ONLY',
      emergencyEligible: false,
      screenshots: 5,
      browser: 'Chromium/Chrome headless',
      safari: 'NOT_VERIFIED',
      events,
    };
    await writeFile(path.join(evidence, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => api.close(resolve));
  }
}

main().catch((error) => { api.close(); console.error(error); process.exitCode = 1; });
