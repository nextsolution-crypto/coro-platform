#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const requireFromBackend = createRequire(new URL('../../coro-backend/package.json', import.meta.url));
const puppeteer = requireFromBackend('puppeteer');
const api = String(process.env.CORO_QA_BACKEND_URL || '').replace(/\/$/, '');
const frontend = String(process.env.CORO_QA_FRONTEND_URL || '').replace(/\/$/, '');
const actorFile = process.env.CORO_QA_ACTOR_FILE;
const mfaDir = process.env.CORO_QA_MFA_DIR;
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
const outputDirectory = process.env.CORO_QA_COMMERCIAL_BROWSER_EVIDENCE;
if (!api.startsWith('http://127.0.0.1:') || !frontend.startsWith('http://127.0.0.1:') || !actorFile || !mfaDir || !password || !outputDirectory?.startsWith('D:\\CORO-QA\\')) {
  throw new Error('Fail-closed local browser runtime configuration required.');
}
const ids = JSON.parse(await readFile(actorFile, 'utf8'));
const viewports = [[1440, 900], [1920, 1080], [390, 844], [430, 932]];
const themes = [
  { id: 'classic', ui: 'legacy', preference: 'LIGHT', expectedUi: 'legacy', expectedTheme: 'light' },
  { id: 'glass-light', ui: 'glass', preference: 'LIGHT', expectedUi: 'glass', expectedTheme: 'light' },
  { id: 'glass-dark', ui: 'glass', preference: 'DARK', expectedUi: 'glass', expectedTheme: 'dark' },
];

async function call(route, body) {
  const response = await fetch(`${api}${route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
async function latestCode(email, after) {
  const entries = await Promise.all((await readdir(mfaDir)).map(async (name) => ({ name, time: (await stat(join(mfaDir, name))).mtimeMs })));
  for (const entry of entries.sort((a, b) => b.time - a.time)) {
    if (entry.time < after - 2000) break;
    const message = JSON.parse(await readFile(join(mfaDir, entry.name), 'utf8'));
    if (String(message.to).toLowerCase() === email) return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error('Protected MFA capture unavailable.');
}
async function authenticate() {
  const email = 'employee-org@global-e2e.test';
  const started = Date.now();
  const first = await call('/auth/login', { email, password });
  if (first.status >= 300 || !first.data?.mfaRequired) throw new Error(`Authentication preflight failed: ${first.status}`);
  const verified = await call('/auth/verify-mfa', { email, code: await latestCode(email, started) });
  if (verified.status >= 300 || !verified.data?.access_token) throw new Error(`MFA verification failed: ${verified.status}`);
  return { token: verified.data.access_token, user: verified.data.user };
}
function measure() {
  const visible = (element) => {
    const style = getComputedStyle(element); const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const elements = [...document.querySelectorAll('main,header,nav,section,article,form,table,button,a,dl,ul,li')].filter(visible);
  const boxes = elements.map((element) => {
    const rect = element.getBoundingClientRect();
    const intersectsViewport = rect.right > 0 && rect.left < innerWidth && rect.bottom > 0;
    let ancestor = element.parentElement; let containedScroll = false;
    while (ancestor) {
      const overflow = getComputedStyle(ancestor).overflowX;
      if (overflow === 'auto' || overflow === 'scroll') { containedScroll = true; break; }
      ancestor = ancestor.parentElement;
    }
    return { tag: element.tagName, role: element.getAttribute('role'), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      width: rect.width, height: rect.height, intersectsViewport, containedScroll,
      viewportOverflow: intersectsViewport && (rect.left < -1 || rect.right > innerWidth + 1) };
  });
  const buttons = boxes.filter((box) => box.tag === 'BUTTON' && box.intersectsViewport);
  return {
    viewport: { width: innerWidth, height: innerHeight },
    ui: document.documentElement.getAttribute('data-ui'), theme: document.documentElement.getAttribute('data-theme'),
    globalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    overflowFailures: boxes.filter((box) => box.viewportOverflow && !box.containedScroll),
    containedOverflows: boxes.filter((box) => box.viewportOverflow && box.containedScroll),
    undersizedButtons: buttons.filter((box) => box.height < 43),
    heading: document.querySelector('main h1')?.textContent?.trim() || '',
    alert: document.querySelector('[role="alert"]')?.textContent?.trim() || '',
  };
}

await mkdir(outputDirectory, { recursive: true });
const auth = await authenticate();
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.createBrowserContext();
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (entry) => { if (entry.type() === 'error' && !/favicon|404/i.test(entry.text())) consoleErrors.push(entry.text()); });
page.on('pageerror', (error) => consoleErrors.push(error.message));
const results = [];
try {
  await page.goto(frontend, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user }) => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('coro_token', token); localStorage.setItem('coro_user', JSON.stringify(user));
  }, auth);
  const routes = [
    { id: 'subscriptions', path: `/admin/commercial/subscriptions/${ids.orgA}`, heading: 'Subscriptions' },
    { id: 'billing', path: `/admin/commercial/billing/${ids.orgA}`, heading: 'Invoices and payments' },
    { id: 'organization-360', path: `/admin/organizations/${ids.orgA}?tab=commercial`, heading: '' },
  ];
  for (const [width, height] of viewports) for (const selected of themes) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.evaluate(({ ui, preference }) => { localStorage.setItem('coro-ui-generation', ui); localStorage.setItem('coro-theme-preference', preference); }, selected);
    const pages = [];
    for (const route of routes) {
      await page.goto(`${frontend}${route.path}`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('main', { timeout: 15000 });
      const geometry = await page.evaluate(measure);
      const contentPass = !geometry.alert && (!route.heading || geometry.heading === route.heading);
      pages.push({ id: route.id, contentPass, geometry });
    }
    await page.reload({ waitUntil: 'networkidle2' });
    const sessionPersistent = await page.evaluate(() => Boolean(localStorage.getItem('coro_token')) && Boolean(document.querySelector('main')));
    const id = `${width}x${height}-${selected.id}`;
    await page.screenshot({ path: join(outputDirectory, `${id}.png`), fullPage: true });
    const pass = pages.every(({ contentPass, geometry }) => contentPass && geometry.viewport.width === width && geometry.viewport.height === height &&
      geometry.ui === selected.expectedUi && geometry.theme === selected.expectedTheme && !geometry.globalOverflow &&
      geometry.overflowFailures.length === 0 && (width > 430 || geometry.undersizedButtons.length === 0)) && sessionPersistent;
    results.push({ id, status: pass ? 'PASS' : 'FAIL', pages, sessionPersistent });
  }
} finally { await context.close(); await browser.close(); }
const report = { executedAt: new Date().toISOString(), authenticatedMfa: true, status: results.every((item) => item.status === 'PASS') && consoleErrors.length === 0 ? 'PASS' : 'FAIL', results, criticalConsoleErrors: [...new Set(consoleErrors)] };
await writeFile(join(outputDirectory, 'browser-matrix.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, combinations: results.length, passed: results.filter((item) => item.status === 'PASS').length, criticalConsoleErrors: report.criticalConsoleErrors }, null, 2));
if (report.status !== 'PASS') process.exitCode = 1;
