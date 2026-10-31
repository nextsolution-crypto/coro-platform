#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(
  process.env.CORO_QA_BACKEND_PACKAGE ||
    new URL('../../../coro-backend/package.json', import.meta.url),
);
const puppeteer = require('puppeteer');
const organizationOrigin = process.env.CORO_QA_FRONTEND_URL || 'http://127.0.0.1:3371';
const portalOrigin = process.env.CORO_QA_PORTAL_URL || 'http://127.0.0.1:3372';
const evidenceDir =
  process.env.CORO_QA_MAP_EVIDENCE ||
  'D:\\CORO-QA\\tracking\\organization-map\\browser';
const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1440 },
];
const themes = [
  { name: 'classic', ui: 'legacy', preference: 'LIGHT' },
  { name: 'glass-light', ui: 'glass', preference: 'LIGHT' },
  { name: 'glass-dark', ui: 'glass', preference: 'DARK' },
];
const xssName = '<img src=x onerror="window.__coroMapXss=1"> & "Étage"';
const organizationUser = {
  id: '70000000-0000-4000-8000-000000000001',
  email: 'map-admin@global-e2e.test',
  firstName: 'Carte',
  lastName: 'Organisation',
  role: 'ADMIN',
  organizationId: '10000000-0000-4000-8000-000000000001',
};
const portalUser = {
  id: '71000000-0000-4000-8000-000000000001',
  email: 'map-corporate@global-e2e.test',
  firstName: 'Carte',
  lastName: 'Portail',
  role: 'CLIENT_CORPORATE',
  clientId: '30000000-0000-4000-8000-000000000001',
  clientName: 'Client synthétique',
  organizationId: '10000000-0000-4000-8000-000000000001',
  populationPermissions: [],
  operationalReviewPermissions: [],
  correctiveActionPermissions: [],
};
const project = {
  id: '50000000-0000-4000-8000-000000000001',
  name: 'Plan synthétique',
  documentType: 'PCA',
  year: 2026,
  status: 'VALIDATED',
  updatedAt: '2026-10-01T00:00:00.000Z',
};
const buildings = [
  {
    id: '40000000-0000-4000-8000-000000000001',
    name: xssName,
    address: '100, rue QA',
    city: 'Montréal',
    province: 'QC',
    latitude: 45.5317,
    longitude: -73.5973,
    client: { id: '30000000-0000-4000-8000-000000000001', name: 'Client <b>synthétique</b>' },
    projectCount: 1,
    validatedCount: 1,
    activeCount: 0,
    projects: [project],
  },
  {
    id: '40000000-0000-4000-8000-000000000002',
    name: 'Même position — deuxième bâtiment',
    address: '102, rue QA',
    city: 'Montréal',
    province: 'QC',
    latitude: 45.5017,
    longitude: -73.5673,
    client: { id: '30000000-0000-4000-8000-000000000001', name: 'Client synthétique' },
    projectCount: 0,
    validatedCount: 0,
    activeCount: 0,
    projects: [],
  },
  {
    id: '40000000-0000-4000-8000-000000000005',
    name: 'MÃªme position â€” troisiÃ¨me bÃ¢timent',
    address: '104, rue QA',
    city: 'MontrÃ©al',
    province: 'QC',
    latitude: 45.5017,
    longitude: -73.5673,
    client: { id: '30000000-0000-4000-8000-000000000001', name: 'Client synthÃ©tique' },
    projectCount: 0,
    validatedCount: 0,
    activeCount: 0,
    projects: [],
  },
  {
    id: '40000000-0000-4000-8000-000000000003',
    name: 'Coordonnées zéro valides',
    address: '0, rue QA',
    city: 'Null Island',
    province: 'QC',
    latitude: 0,
    longitude: 0,
    client: { id: '30000000-0000-4000-8000-000000000002', name: 'Client B' },
    projectCount: 0,
    validatedCount: 0,
    activeCount: 0,
    projects: [],
  },
  {
    id: '40000000-0000-4000-8000-000000000004',
    name: 'Coordonnées invalides',
    latitude: 91,
    longitude: -181,
    client: { id: '30000000-0000-4000-8000-000000000002', name: 'Client B' },
    projects: [],
  },
];
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL8WQAAAABJRU5ErkJggg==',
  'base64',
);

await mkdir(evidenceDir, { recursive: true });
const report = {
  sha: process.env.CORO_QA_COMMIT_SHA || null,
  executedAt: new Date().toISOString(),
  matrix: [],
  checks: [],
  consoleErrors: [],
  limitations: [
    {
      id: 'real-screen-reader',
      status: 'NOT_VERIFIED',
      reason: 'Aucun lecteur d’écran automatisable fiable dans ce runtime.',
    },
  ],
};
const check = (id, pass, detail) =>
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const json = (request, body, origin) =>
  request.respond({
    status: 200,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': 'authorization,content-type',
    },
    body: JSON.stringify(body),
  });

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const targets = [
    {
      name: 'organization',
      origin: organizationOrigin,
      path: '/buildings/map',
      tokenKey: 'coro_token',
      userKey: 'coro_user',
      user: organizationUser,
    },
    {
      name: 'portal',
      origin: portalOrigin,
      path: '/map',
      tokenKey: 'coro_client_token',
      userKey: 'coro_client_user',
      user: portalUser,
    },
  ].filter(
    (target) =>
      !process.env.CORO_QA_MAP_TARGET ||
      process.env.CORO_QA_MAP_TARGET === target.name,
  );
try {
  for (const target of targets) {
    console.log(`MAP_BROWSER_TARGET_START: ${target.name}`);
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setBypassServiceWorker(true);
    let unpkgRequests = 0;
    page.on('console', (event) => {
      if (event.type() === 'error') {
        report.consoleErrors.push(
          `${target.name}: ${event.text()} (${event.location().url || 'unknown source'})`,
        );
      }
    });
    page.on('pageerror', (error) => report.consoleErrors.push(`${target.name}: ${error.message}`));
    page.on('requestfailed', (request) => {
      if (request.url().includes('/api/')) {
        console.log(
          `MAP_BROWSER_API_FAILED: ${request.method()} ${request.url()} ${request.failure()?.errorText}`,
        );
      }
    });
    await page.evaluateOnNewDocument(({ tokenKey, userKey, user }) => {
      window.__coroMapXss = 0;
      localStorage.setItem(tokenKey, 'synthetic-map-token');
      localStorage.setItem(userKey, JSON.stringify(user));
      sessionStorage.setItem(tokenKey, 'synthetic-map-token');
      sessionStorage.setItem(userKey, JSON.stringify(user));
    }, target);
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      const url = request.url();
      if (url.includes('unpkg.com')) {
        unpkgRequests += 1;
        return await request.abort('blockedbyclient');
      }
      if (url.startsWith('https://tile.openstreetmap.org/')) {
        return await request.respond({ status: 200, contentType: 'image/png', body: transparentPng });
      }
      const parsed = new URL(url);
      if (request.method() === 'OPTIONS') {
        return await request.respond({
          status: 204,
          headers: {
            'access-control-allow-origin': target.origin,
            'access-control-allow-headers': 'authorization,content-type',
            'access-control-allow-methods': 'GET,OPTIONS',
          },
        });
      }
      if (parsed.pathname.endsWith('/api/users/me')) {
        return await json(request, organizationUser, target.origin);
      }
      if (parsed.pathname.endsWith('/api/admin/v1/platform-authority/me')) {
        return await json(request, { isPlatformAuthority: false, grants: [] }, target.origin);
      }
      if (
        parsed.pathname.endsWith('/api/projects/upcoming-updates') ||
        parsed.pathname.endsWith('/api/projects/pending-approval')
      ) {
        return await json(request, [], target.origin);
      }
      if (parsed.pathname.endsWith('/api/notifications/unread-count')) {
        return await json(request, { count: 0 }, target.origin);
      }
      if (parsed.pathname.endsWith('/api/client-auth/me')) {
        return await json(request, portalUser, target.origin);
      }
      if (parsed.pathname.endsWith('/api/client-portal/network/access')) {
        return await json(request, { enabled: false }, target.origin);
      }
      if (parsed.pathname.endsWith('/api/client-portal/notifications')) {
        return await json(request, [], target.origin);
      }
      if (parsed.pathname.endsWith('/api/buildings')) return await json(request, buildings, target.origin);
      if (parsed.pathname.endsWith('/api/client-portal/buildings')) {
        return await json(
          request,
          buildings.map(({ client: _client, validatedCount: _validated, ...building }) => building),
          target.origin,
        );
      }
      if (parsed.pathname.includes('/api/client-portal/')) return await json(request, [], target.origin);
      return await request.continue();
    });

    for (const viewport of viewports) {
      for (const theme of themes) {
        await page.setViewport(viewport);
        await page.evaluateOnNewDocument(({ ui, preference }) => {
          localStorage.setItem('coro-ui-generation', ui);
          localStorage.setItem('coro-theme-preference', preference);
          localStorage.setItem('coro-glass-beta', 'production-preview');
        }, theme);
        await page.goto(`${target.origin}${target.path}`, {
          waitUntil: 'networkidle0',
          timeout: 60_000,
        });
        try {
          await page.waitForSelector('.leaflet-marker-icon', { timeout: 20_000 });
        } catch (error) {
          const diagnostic = await page.evaluate(() => ({
            url: location.href,
            text: document.body.innerText.slice(0, 2_000),
            html: document.body.innerHTML.slice(0, 2_000),
          }));
          throw new Error(
            `Map marker readiness failed for ${target.name}: ${JSON.stringify({ diagnostic, consoleErrors: report.consoleErrors })}`,
            { cause: error },
          );
        }
        const xssTooltipText = await page.evaluate(async (expectedXssText) => {
          for (const marker of document.querySelectorAll('.leaflet-marker-icon')) {
            marker.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            await new Promise((resolve) => setTimeout(resolve, 10));
            const text = document.querySelector('.leaflet-tooltip')?.textContent || '';
            if (text.includes(expectedXssText)) return text;
          }
          return '';
        }, xssName);
        const state = await page.evaluate((expectedXssText) => {
          const controls = [...document.querySelectorAll('main button, main a, main select')]
            .map((node) => ({ node, box: node.getBoundingClientRect() }))
            .filter(
              ({ box }) =>
                box.width > 0 &&
                box.height > 0 &&
                box.right > 0 &&
                box.left < innerWidth,
            );
          const outsideControls = controls
            .filter(({ node, box }) => {
              if (!(box.left < -1 || box.right > innerWidth + 1)) return false;
              let ancestor = node.parentElement;
              while (ancestor) {
                const style = getComputedStyle(ancestor);
                if (
                  ancestor.scrollWidth > ancestor.clientWidth + 1 &&
                  ['auto', 'scroll'].includes(style.overflowX)
                ) {
                  return false;
                }
                ancestor = ancestor.parentElement;
              }
              return true;
            })
            .map(({ node, box }) => ({
              tag: node.tagName,
              text: node.textContent?.trim().slice(0, 80) || '',
              aria: node.getAttribute('aria-label'),
              left: Math.round(box.left),
              right: Math.round(box.right),
            }));
          const listButtons = [...document.querySelectorAll('[aria-label="Liste des bâtiments autorisés"] button')];
          return {
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
            controlsOutside: outsideControls.length,
            outsideControls,
            markerCount: document.querySelectorAll('.leaflet-marker-icon').length,
            attribution: document.body.innerText.includes('OpenStreetMap contributors'),
            xssExecuted: window.__coroMapXss === 1,
            tooltipText: document.querySelector('.leaflet-tooltip')?.textContent || '',
            xssTextVisible: document.body.innerText.includes(expectedXssText),
            listButtonCount: listButtons.length,
          };
        }, xssName);
        state.tooltipText = xssTooltipText;
        const id = `${target.name}-${viewport.width}x${viewport.height}-${theme.name}`;
        const pass =
          !state.overflow &&
          state.controlsOutside === 0 &&
          state.markerCount === 4 &&
          state.attribution &&
          !state.xssExecuted &&
          state.tooltipText.includes(xssName) &&
          state.listButtonCount === buildings.length;
        report.matrix.push({ id, status: pass ? 'PASS' : 'FAIL', ...state });
        await page.screenshot({ path: path.join(evidenceDir, `${id}.png`), fullPage: true });
      }
    }

    await page.reload({ waitUntil: 'networkidle0' });
    check(
      `${target.name}-f5-session`,
      await page.evaluate((key) => Boolean(localStorage.getItem(key)), target.tokenKey),
      'La session synthétique survit à F5.',
    );
    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    const zoomOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    check(`${target.name}-zoom-200`, !zoomOverflow, `overflow=${zoomOverflow}`);
    check(`${target.name}-no-unpkg`, unpkgRequests === 0, `requests=${unpkgRequests}`);
    await context.close();
    console.log(`MAP_BROWSER_TARGET_COMPLETE: ${target.name}`);
  }
} finally {
  await browser.close();
}

check(
  'matrix-24-of-24',
  report.matrix.length === targets.length * 12 &&
    report.matrix.every((row) => row.status === 'PASS'),
  `${report.matrix.filter((row) => row.status === 'PASS').length}/${targets.length * 12}`,
);
check(
  'no-critical-console-errors',
  report.consoleErrors.length === 0,
  JSON.stringify(report.consoleErrors),
);
report.pass =
  report.matrix.every((row) => row.status === 'PASS') &&
  report.checks.every((row) => row.status === 'PASS');
await writeFile(
  path.join(evidenceDir, 'organization-map-browser.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    { pass: report.pass, matrix: report.matrix, checks: report.checks, limitations: report.limitations },
    null,
    2,
  ),
);
if (!report.pass) process.exitCode = 1;
