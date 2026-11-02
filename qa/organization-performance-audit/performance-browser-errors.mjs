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
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(frontend || '')) throw new Error('Loopback QA frontend required.');

const report = { candidate: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), checks: [] };
const check = (id, pass, detail) => report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
await mkdir(evidenceDir, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--no-proxy-server'] });
try {
  const page = await browser.newPage();
  await page.goto(frontend, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ access_token, user }) => { localStorage.setItem('coro_token', access_token); localStorage.setItem('coro_user', JSON.stringify(user)); }, sessions.admin);
  await page.setRequestInterception(true);
  let injected = false;
  const intercept = (request) => {
    if (!injected && request.url().includes('/api/rendement/operational')) {
      injected = true;
      void request.respond({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic QA outage' }) });
    } else void request.continue();
  };
  page.on('request', intercept);
  await page.goto(`${frontend}/profile/rendement`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[role="alert"]', { timeout: 10000 });
  const failed = await page.evaluate(() => document.body.innerText);
  check('503-visible-no-false-success', injected && /rendement op.rationnel ne peut pas .tre charg./i.test(failed), 'synthetic 503 produces the visible error state');
  await page.screenshot({ path: join(evidenceDir, 'operational-503.png'), fullPage: true });
  page.off('request', intercept);
  await page.setRequestInterception(false);
  await page.reload({ waitUntil: 'networkidle0' });
  const recovered = await page.evaluate(() => ({ text: document.body.innerText, alerts: document.querySelectorAll('[role="alert"]').length }));
  check('503-recovery', recovered.alerts === 0 && /Aucune heure saisie|Heures saisies/i.test(recovered.text), 'normal API response replaces the error without a false success');
  await page.screenshot({ path: join(evidenceDir, 'operational-503-recovered.png'), fullPage: true });
} finally { await browser.close(); }
report.pass = report.checks.every((row) => row.status === 'PASS');
await writeFile(join(evidenceDir, 'performance-browser-errors.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
