const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { mkdir } = require('node:fs/promises');
const { chromium } = require('playwright-core');

const PUBLIC_ID = 'AAAAAAAAAAAAAAAAAA';
const portalOrigin = process.env.DISPLAY09_PORTAL_ORIGIN || 'http://127.0.0.1:3013';
const evidence = path.resolve(__dirname, '../../docs/coro-display/DISPLAY-09/chromium-evidence');

const api = http.createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    return response.end();
  }
  response.setHeader('Content-Type', 'application/json');
  if (request.url === `/api/display-public/d/${PUBLIC_ID}`) {
    return response.end(JSON.stringify({
      available: true,
      activationRequired: true,
      location: { label: 'Corridor Est', floor: 'Étage 3' },
      capability: 'WEB_VIEW_ONLY',
      emergencyEligible: false,
    }));
  }
  if (request.url === `/api/display-public/d/${PUBLIC_ID}/activate` && request.method === 'POST') {
    return response.end(JSON.stringify({ token: 'qa-session-token-with-sufficient-length-0001' }));
  }
  if (request.url === `/api/display-public/d/${PUBLIC_ID}/manifest` && request.headers.authorization?.startsWith('Bearer ')) {
    return response.end(JSON.stringify({
      capability: 'WEB_VIEW_ONLY',
      emergencyEligible: false,
      pollingSeconds: 30,
      publication: null,
    }));
  }
  response.writeHead(401);
  return response.end(JSON.stringify({ message: 'refused' }));
});

async function main() {
  await mkdir(evidence, { recursive: true });
  await new Promise((resolve, reject) => {
    api.once('error', reject);
    api.listen(3002, resolve);
  });
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  try {
    const profiles = [
      ['tablet-landscape', 1280, 800],
      ['tablet-portrait', 800, 1280],
      ['screen-16x9', 1920, 1080],
      ['screen-16x10', 1920, 1200],
      ['screen-17x11', 1700, 1100],
    ];
    for (const [name, width, height] of profiles) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      page.on('requestfailed', (request) => console.error(`request-failed:${request.url()}:${request.failure()?.errorText}`));
      await page.goto(`${portalOrigin}/d/${PUBLIC_ID}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.getByRole('heading', { name: 'Activer cet affichage' }).waitFor();
      assert.equal(await page.getByRole('textbox').getAttribute('maxlength'), '6');
      await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: true });
      await context.close();
    }

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${portalOrigin}/d/${PUBLIC_ID}`, { waitUntil: 'networkidle' });
    await page.getByRole('textbox').fill('123456');
    await page.getByRole('button', { name: /Activer/ }).click();
    await page.getByText('Aucun plan approuvé publié pour cet emplacement.').waitFor();
    await page.getByText('Profil WEB_VIEW_ONLY · urgence réelle non admissible').waitFor();
    await page.screenshot({ path: path.join(evidence, 'activated-view-only.png'), fullPage: true });

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Connexion sécurisée à CORO Display…').waitFor();
    await page.screenshot({ path: path.join(evidence, 'offline-reload-limit.png'), fullPage: true });
    await context.close();

    process.stdout.write(JSON.stringify({
      result: 'PASS',
      profiles: 5,
      activation: 'PASS',
      capability: 'WEB_VIEW_ONLY',
      offlineReload: 'LIMIT_CONFIRMED_NO_PERMANENT_GUARANTEE',
    }));
  } finally {
    await browser.close();
    await new Promise((resolve) => api.close(resolve));
  }
}

main().catch((error) => {
  api.close();
  console.error(error);
  process.exitCode = 1;
});
