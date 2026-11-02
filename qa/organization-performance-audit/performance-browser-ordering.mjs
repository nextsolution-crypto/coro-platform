#!/usr/bin/env node
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const puppeteer = require('puppeteer');
const frontend = process.env.CORO_QA_FRONTEND_URL;
const evidenceDir = process.env.CORO_QA_PERFORMANCE_BROWSER_EVIDENCE;
const sessions = JSON.parse(await readFile(process.env.CORO_QA_SESSION_CHECKPOINT, 'utf8'));
const ids = JSON.parse(await readFile(process.env.CORO_QA_ACTOR_FILE, 'utf8'));
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(frontend || '')) throw new Error('Loopback QA frontend required.');

const report = { candidate: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), checks: [], interceptedRequests: [] };
const check = (id, pass, detail) => report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const response = (hours, from, to) => JSON.stringify({ period: { from, to, timeZone: 'America/Toronto' }, advisors: [{ userId: ids.advisorA, userName: 'Synthetic advisor-a', hours, activities: [], participatedMandates: [] }] });
const cors = { 'access-control-allow-origin': frontend, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,OPTIONS' };
async function setPeriod(page, from, to) {
  await page.evaluate(({ from, to }) => {
    const values = [from, to];
    document.querySelectorAll('input[type="date"]').forEach((input, index) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, values[index]);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }, { from, to });
}

await mkdir(evidenceDir, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--no-proxy-server'] });
try {
  const page = await browser.newPage();
  await page.goto(frontend, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ access_token, user }) => { localStorage.setItem('coro_token', access_token); localStorage.setItem('coro_user', JSON.stringify(user)); }, sessions.advisor);
  await page.goto(`${frontend}/profile/rendement`, { waitUntil: 'networkidle0' });
  await page.setRequestInterception(true);
  const handler = (request) => {
    const url = new URL(request.url());
    if (!url.pathname.endsWith('/api/rendement/operational')) return void request.continue();
    if (request.method() === 'OPTIONS') return void request.respond({ status: 204, headers: cors, body: '' });
    const from = url.searchParams.get('from'); const to = url.searchParams.get('to');
    report.interceptedRequests.push({ from, to });
    if (from === '2027-03-01' && to === '2027-03-31') return void setTimeout(() => request.respond({ status: 200, contentType: 'application/json', headers: cors, body: response(30, from, to) }), 800);
    if (from === '2027-04-01' && to === '2027-04-30') return void setTimeout(() => request.respond({ status: 200, contentType: 'application/json', headers: cors, body: response(40, from, to) }), 50);
    if (from === '2027-05-01' && to === '2027-05-31') return void request.respond({ status: 200, contentType: 'application/json', headers: cors, body: response(55, from, to) });
    if (from === '2027-06-01' && to === '2027-06-30') return void request.respond({ status: 503, contentType: 'application/json', headers: cors, body: JSON.stringify({ message: 'Synthetic later-selection failure' }) });
    return void request.respond({ status: 200, contentType: 'application/json', headers: cors, body: response(0, from, to) });
  };
  page.on('request', handler);
  await setPeriod(page, '2027-03-01', '2027-03-31');
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 80));
  await setPeriod(page, '2027-04-01', '2027-04-30');
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1200));
  const ordered = await page.evaluate(() => ({ text: document.body.innerText, dates: [...document.querySelectorAll('input[type="date"]')].map((node) => node.value) }));
  const finalRequestsObserved = report.interceptedRequests.some((item) => item.from === '2027-03-01' && item.to === '2027-03-31') && report.interceptedRequests.some((item) => item.from === '2027-04-01' && item.to === '2027-04-30');
  check('latest-selection-wins-out-of-order', finalRequestsObserved && ordered.dates.join('/') === '2027-04-01/2027-04-30' && /40\.0 h/.test(ordered.text) && !/30\.0 h/.test(ordered.text), JSON.stringify({ finalRequestsObserved, dates: ordered.dates, showsLatest: /40\.0 h/.test(ordered.text), showsStale: /30\.0 h/.test(ordered.text) }));
  console.log(JSON.stringify({ phase: 'out-of-order', ordered, interceptedRequests: report.interceptedRequests }));
  await page.screenshot({ path: join(evidenceDir, 'operational-out-of-order-latest.png'), fullPage: true });
  await setPeriod(page, '2027-05-01', '2027-05-31');
  await page.waitForFunction(() => /55\.0 h/.test(document.body.innerText), { timeout: 5000 });
  await setPeriod(page, '2027-06-01', '2027-06-30');
  await page.waitForSelector('[role="alert"]', { timeout: 5000 });
  const failed = await page.evaluate(() => ({ text: document.body.innerText, alerts: [...document.querySelectorAll('[role="alert"]')].map((node) => node.textContent) }));
  check('later-error-hides-stale-data', failed.alerts.length === 1 && !/55\.0 h/.test(failed.text), JSON.stringify({ alerts: failed.alerts.length, staleVisible: /55\.0 h/.test(failed.text) }));
  await page.screenshot({ path: join(evidenceDir, 'operational-later-filter-error.png'), fullPage: true });
  page.off('request', handler);
} finally { await browser.close(); }
report.pass = report.checks.every((row) => row.status === 'PASS');
await writeFile(join(evidenceDir, 'performance-browser-ordering.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
