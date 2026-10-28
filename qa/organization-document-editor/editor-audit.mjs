#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const apiOrigin = (process.env.CORO_QA_BACKEND_URL || 'http://127.0.0.1:3170/api').replace(/\/$/, '');
const appOrigin = (process.env.CORO_QA_FRONTEND_URL || 'http://127.0.0.1:3171').replace(/\/$/, '');
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
const mfaDirectory = process.env.CORO_QA_MFA_DIR;
const evidenceDirectory = process.env.CORO_QA_EVIDENCE;
const databaseUrl = process.env.DATABASE_URL;
const testedCommit = process.env.CORO_QA_TESTED_COMMIT;
if (!password || !mfaDirectory || !evidenceDirectory || !databaseUrl || !testedCommit) {
  throw new Error('QA configuration incomplete');
}
if (!/127\.0\.0\.1:55474\/coro_qa_global_e2e$/.test(databaseUrl)) {
  throw new Error('Refusing non-disposable database');
}

await mkdir(evidenceDirectory, { recursive: true });
const backendRequire = createRequire(resolve('coro-backend/package.json'));
const { PrismaClient } = backendRequire('@prisma/client');
const puppeteer = backendRequire('puppeteer');
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

const ids = {
  project: '50000000-0000-4000-8000-000000000001',
  archivedProject: '50000000-0000-4000-8000-000000000002',
};
const report = {
  generatedAt: new Date().toISOString(),
  testedCommit,
  environment: { apiOrigin, appOrigin, database: 'PostgreSQL 16 disposable', network: 'deny-by-default' },
  checks: [],
  browser: [],
};

function record(id, expected, observed, status = expected ? 'PASS' : 'FAIL') {
  report.checks.push({ id, status, observed });
}
async function call(route, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${apiOrigin}${route}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data, headers: Object.fromEntries(response.headers) };
}
async function latestCode(email, after) {
  const entries = await Promise.all((await readdir(mfaDirectory)).map(async name => ({ name, time: (await stat(join(mfaDirectory, name))).mtimeMs })));
  for (const entry of entries.sort((a, b) => b.time - a.time)) {
    if (entry.time < after - 2000) break;
    const message = JSON.parse(await readFile(join(mfaDirectory, entry.name), 'utf8'));
    if (String(message.to).toLowerCase() === email) return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error(`MFA capture missing for ${email}`);
}
async function login(email) {
  const after = Date.now();
  const challenge = await call('/auth/login', { method: 'POST', body: { email, password } });
  if (![200, 201].includes(challenge.status) || !challenge.data?.mfaRequired) throw new Error(`Login challenge failed: ${challenge.status}`);
  const verified = await call('/auth/verify-mfa', { method: 'POST', body: { email, code: await latestCode(email, after) } });
  const token = verified.data?.access_token ?? verified.data?.token;
  if (![200, 201].includes(verified.status) || !token) throw new Error(`MFA failed: ${verified.status}`);
  return { token, user: verified.data.user };
}

try {
  const advisor = await login('advisor-a@global-e2e.test');
  const initial = await call(`/generator/document/${ids.project}`, { token: advisor.token });
  const documentId = initial.data?.id;
  const module = initial.data?.content?.modules_fr?.find(item => item.sections?.length);
  const section = module?.sections?.[0];
  if (!documentId || !module || !section) throw new Error('Canonical synthetic document missing');
  const originalContent = String(section.content ?? '');

  await prisma.project.update({ where: { id: ids.project }, data: { status: 'VALIDATED' } });
  const validatedMutation = await call(`/generator/document/${documentId}/module/${module.moduleNumber}/section/${section.id}`, {
    token: advisor.token, method: 'PUT', body: { content: `${originalContent}\nQA validated mutation`, language: 'fr' },
  });
  record('validated-document-server-write-denial', [403, 409, 422].includes(validatedMutation.status), { httpStatus: validatedMutation.status, expected: '403/409/422' });

  const concurrentA = `${originalContent}\nQA concurrent A`;
  const concurrentB = `${originalContent}\nQA concurrent B`;
  const concurrent = await Promise.all([
    call(`/generator/document/${documentId}/module/${module.moduleNumber}/section/${section.id}`, { token: advisor.token, method: 'PUT', body: { content: concurrentA, language: 'fr' } }),
    call(`/generator/document/${documentId}/module/${module.moduleNumber}/section/${section.id}`, { token: advisor.token, method: 'PUT', body: { content: concurrentB, language: 'fr' } }),
  ]);
  const concurrentFinal = await call(`/generator/document/${ids.project}`, { token: advisor.token });
  const concurrentValue = concurrentFinal.data?.content?.modules_fr?.find(item => item.moduleNumber === module.moduleNumber)?.sections?.find(item => item.id === section.id)?.content;
  record('optimistic-concurrency-conflict', concurrent.some(item => item.status === 409), { statuses: concurrent.map(item => item.status), finalWriter: concurrentValue === concurrentA ? 'A' : concurrentValue === concurrentB ? 'B' : 'other' });

  const createdVersion = await call(`/projects/${ids.project}/versions`, { token: advisor.token, method: 'POST', body: { label: 'QA validated project version' } });
  record('validated-version-mutation-denial', [403, 409, 422].includes(createdVersion.status), { httpStatus: createdVersion.status, createdVersionId: createdVersion.data?.id ?? null });
  const versions = await call(`/projects/${ids.project}/versions`, { token: advisor.token });
  record('version-list-minimizes-protected-snapshot', Array.isArray(versions.data) && versions.data.every(item => !Object.hasOwn(item, 'snapshot')), { httpStatus: versions.status, snapshotReturned: Array.isArray(versions.data) && versions.data.some(item => Object.hasOwn(item, 'snapshot')) });

  const archivedDoc = await prisma.document.upsert({
    where: { id: '80000000-0000-4000-8000-000000000002' },
    update: {},
    create: { id: '80000000-0000-4000-8000-000000000002', title: 'Synthetic archived document', projectId: ids.archivedProject, content: { modules_fr: [{ moduleNumber: 1, title: 'Archive', sections: [{ id: '1.1', title: 'Archive', content: 'Archived source' }] }], modules_en: [] } },
  });
  const archivedMutation = await call(`/generator/document/${archivedDoc.id}/module/1/section/1.1`, { token: advisor.token, method: 'PUT', body: { content: 'Archived mutated', language: 'fr' } });
  record('archived-document-server-write-denial', [403, 409, 422].includes(archivedMutation.status), { httpStatus: archivedMutation.status });

  const xssPayload = `<img id="qa-stored-xss" src="x-invalid" onerror="document.documentElement.dataset.qaStoredXss='executed'">`;
  const xssSaved = await call(`/generator/document/${documentId}/module/${module.moduleNumber}/section/${section.id}`, { token: advisor.token, method: 'PUT', body: { content: xssPayload, language: 'fr' } });
  record('stored-markup-accepted-by-api', xssSaved.status === 200, { httpStatus: xssSaved.status }, 'OBSERVED');

  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CORO_QA_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', args: ['--no-sandbox'] });
  try {
    const themes = [
      ['classic', 'legacy', 'LIGHT'],
      ['glass-light', 'glass', 'LIGHT'],
      ['glass-dark', 'glass', 'DARK'],
    ];
    const widths = [390, 768, 1440, 2560];
    for (const [themeName, ui, theme] of themes) {
      for (const width of widths) {
        const page = await browser.newPage();
        const consoleErrors = [];
        page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300)); });
        await page.setViewport({ width, height: width <= 768 ? 844 : 1000, deviceScaleFactor: 1 });
        await page.goto(appOrigin, { waitUntil: 'domcontentloaded' });
        await page.evaluate(({ token, user, ui, theme }) => {
          localStorage.setItem('coro_token', token);
          localStorage.setItem('coro_user', JSON.stringify(user));
          sessionStorage.setItem('coro_token', token);
          sessionStorage.setItem('coro_user', JSON.stringify(user));
          localStorage.setItem('coro-ui-generation', ui);
          localStorage.setItem('coro-theme-preference', theme);
        }, { token: advisor.token, user: advisor.user, ui, theme });
        await page.goto(`${appOrigin}/editor/${ids.project}`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('h1', { timeout: 15000 });
        const geometry = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          xssElement: Boolean(document.querySelector('#qa-stored-xss')),
          xssExecuted: document.documentElement.dataset.qaStoredXss === 'executed',
          theme: document.documentElement.getAttribute('data-theme'),
          ui: document.documentElement.getAttribute('data-ui'),
          textareas: document.querySelectorAll('textarea').length,
          readOnlyBanner: document.body.innerText.includes('Document approuv'),
        }));
        const screenshot = join(evidenceDirectory, `editor-${themeName}-${width}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        report.browser.push({ theme: themeName, width, status: geometry.scrollWidth <= geometry.clientWidth ? 'PASS' : 'FAIL', geometry, consoleErrors });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  const xssObserved = report.browser.some(item => item.geometry.xssElement || item.geometry.xssExecuted);
  record('stored-content-render-safety', !xssObserved, { elementRendered: report.browser.some(item => item.geometry.xssElement), handlerExecuted: report.browser.some(item => item.geometry.xssExecuted) });
  record('browser-matrix-12-of-12', report.browser.length === 12 && report.browser.every(item => item.status === 'PASS'), { passed: report.browser.filter(item => item.status === 'PASS').length, total: report.browser.length });
  record('validated-ui-has-no-edit-controls', report.browser.every(item => item.geometry.textareas === 0), { textareaCounts: [...new Set(report.browser.map(item => item.geometry.textareas))], readOnlyBannerEverywhere: report.browser.every(item => item.geometry.readOnlyBanner) });

  await prisma.project.update({ where: { id: ids.project }, data: { status: 'IN_PROGRESS' } });
  await call(`/generator/document/${documentId}/module/${module.moduleNumber}/section/${section.id}`, { token: advisor.token, method: 'PUT', body: { content: originalContent, language: 'fr' } });
  await prisma.document.update({ where: { id: archivedDoc.id }, data: { content: { modules_fr: [{ moduleNumber: 1, title: 'Archive', sections: [{ id: '1.1', title: 'Archive', content: 'Archived source' }] }], modules_en: [] } } });
  if ([200, 201].includes(createdVersion.status) && createdVersion.data?.id) {
    await call(`/projects/${ids.project}/versions/${createdVersion.data.id}`, { token: advisor.token, method: 'DELETE' });
  }
  report.cleanup = { syntheticDocumentRestored: true, projectStatusRestored: 'IN_PROGRESS', createdVersionRemoved: Boolean(createdVersion.data?.id) };
} finally {
  await prisma.$disconnect();
}

report.summary = Object.fromEntries(['PASS', 'FAIL', 'OBSERVED'].map(status => [status, report.checks.filter(item => item.status === status).length]));
await writeFile(join(evidenceDirectory, 'editor-audit.json'), JSON.stringify(report, null, 2));
console.log(`EDITOR_AUDIT_COMPLETE ${JSON.stringify(report.summary)} browser=${report.browser.filter(item => item.status === 'PASS').length}/${report.browser.length}`);
