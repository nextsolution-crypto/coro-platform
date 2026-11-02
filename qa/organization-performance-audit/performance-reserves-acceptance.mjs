#!/usr/bin/env node
import { readFile, readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const api = String(process.env.CORO_QA_BACKEND_URL || '').replace(/\/$/, '');
const actorFile = process.env.CORO_QA_ACTOR_FILE;
const mfaDir = process.env.CORO_QA_MFA_DIR;
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
const evidenceDir = process.env.CORO_QA_PERFORMANCE_EVIDENCE;
const sessionCheckpoint = process.env.CORO_QA_SESSION_CHECKPOINT;
if (!/^http:\/\/127\.0\.0\.1:\d+\/api$/.test(api)) throw new Error('Loopback QA API required.');
if (!actorFile || !mfaDir || !password || !evidenceDir || !sessionCheckpoint) throw new Error('QA runtime configuration incomplete.');

const ids = JSON.parse(await readFile(actorFile, 'utf8'));
const report = { candidate: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), checks: [], measurements: {}, observations: [] };
const check = (id, pass, detail) => { report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail }); };
const observe = (id, detail) => report.observations.push({ id, detail });

async function call(method, route, token, body) {
  const started = performance.now();
  const response = await fetch(`${api}${route}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text(); let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data, retryAfter: response.headers.get('retry-after'), elapsedMs: Math.round((performance.now() - started) * 10) / 10, bytes: Buffer.byteLength(text) };
}
async function latestCode(email, after) {
  const files = await Promise.all((await readdir(mfaDir)).map(async (name) => ({ name, at: (await stat(join(mfaDir, name))).mtimeMs })));
  for (const file of files.sort((a, b) => b.at - a.at)) {
    if (file.at < after - 2000) break;
    const message = JSON.parse(await readFile(join(mfaDir, file.name), 'utf8'));
    if (String(message.to).toLowerCase() === email) return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error(`MFA capture missing for ${email}`);
}
async function login(email) {
  const started = Date.now(); const first = await call('POST', '/auth/login', null, { email, password });
  if (first.status === 429) throw new Error(`THROTTLED retry-after=${first.retryAfter || 'not-supplied'}`);
  if (first.status >= 300 || first.data?.mfaRequired !== true) throw new Error(`MFA_REQUIRED_FAILED ${email} HTTP ${first.status}`);
  const verified = await call('POST', '/auth/verify-mfa', null, { email, code: await latestCode(email, started) });
  if (verified.status >= 300 || !verified.data?.access_token) throw new Error(`MFA_VERIFY_FAILED ${email} HTTP ${verified.status}`);
  check(`mfa-${email}`, true, 'local MFA verified');
  return verified.data;
}
let saved = {};
try { saved = JSON.parse(await readFile(sessionCheckpoint, 'utf8')); } catch {}
async function session(name, email) {
  const candidate = saved[name];
  if (candidate?.access_token) {
    const me = await call('GET', '/users/me', candidate.access_token);
    if (me.status === 200 && String(me.data?.email || '').toLowerCase() === email) {
      check(`session-${name}`, true, 'existing session reused');
      return candidate;
    }
  }
  return login(email);
}

const founder = await session('founder', 'founder@global-e2e.test');
const employee = await session('employee', 'employee-org@global-e2e.test');
const admin = await session('admin', 'customer-admin-a@global-e2e.test');
const advisor = await session('advisor', 'advisor-a@global-e2e.test');
saved = { founder, employee, admin, advisor };
await writeFile(sessionCheckpoint, JSON.stringify(saved));

const beforeAsOf = await call('GET', `/rendement/financial?organizationId=${ids.orgA}&asOf=2026-10-30`, employee.access_token);
const beforeMandate = beforeAsOf.data?.mandates?.find((row) => row.mandateId === ids.mandateA);
check('asof-baseline-readable', beforeAsOf.status === 200 && beforeMandate, `HTTP ${beforeAsOf.status}`);

const adminRates = await call('GET', `/advisor-cost-rates?organizationId=${ids.orgA}&userId=${ids.adminA}`, employee.access_token);
let adminRate = Array.isArray(adminRates.data) && adminRates.data.find((row) => row.status === 'APPROVED' && row.currency === 'CAD' && String(row.effectiveFrom).startsWith('2026-10-01'));
if (!adminRate) {
  const draft = await call('POST', '/advisor-cost-rates', founder.access_token, { organizationId: ids.orgA, userId: ids.adminA, currency: 'CAD', hourlyCost: '50.00', effectiveFrom: '2026-10-01' });
  check('admin-rate-draft', draft.status === 201, `HTTP ${draft.status}`);
  const submitted = await call('POST', `/advisor-cost-rates/${draft.data.id}/submit`, founder.access_token, { lockVersion: draft.data.lockVersion, reason: 'Rendement reserve qualification' });
  check('admin-rate-submitted', submitted.status === 201, `HTTP ${submitted.status}`);
  const approved = await call('POST', `/advisor-cost-rates/${draft.data.id}/approve`, employee.access_token, { lockVersion: submitted.data.lockVersion, reason: 'Independent QA approval' });
  check('admin-rate-approved', approved.status === 201, `HTTP ${approved.status}`);
  adminRate = approved.data;
} else check('admin-rate-reused', true, 'existing approved synthetic rate');

const asOfTask = await call('POST', `/projects/${ids.projectA}/tasks`, admin.access_token, { taskTitle: 'AsOf late-record probe', categoryName: 'QA', assigneeId: ids.adminA });
check('asof-task-created', asOfTask.status === 201, `HTTP ${asOfTask.status}`);
const lateEntry = await call('POST', `/projects/${ids.projectA}/tasks/${asOfTask.data.id}/time`, admin.access_token, { date: '2026-10-20', heures: '2', note: 'Created after baseline for same asOf' });
check('asof-late-entry-created-canonically', lateEntry.status === 201, `HTTP ${lateEntry.status}`);
const afterAsOf = await call('GET', `/rendement/financial?organizationId=${ids.orgA}&asOf=2026-10-30`, employee.access_token);
const afterMandate = afterAsOf.data?.mandates?.find((row) => row.mandateId === ids.mandateA);
check('asof-same-cutoff-changed', afterAsOf.status === 200 && afterMandate?.totalTimeEntries === beforeMandate.totalTimeEntries + 1 && afterMandate?.knownLaborCost !== beforeMandate.knownLaborCost, `before=${beforeMandate.totalTimeEntries}/${beforeMandate.knownLaborCost}; after=${afterMandate?.totalTimeEntries}/${afterMandate?.knownLaborCost}`);
observe('asof-semantics', 'asOf is a work-date upper bound; later-created or later-corrected records with an earlier work date change the same asOf result. Current sold values and current governed rate rows are read at query time.');

const advisorFiltered = await call('GET', `/rendement/financial?organizationId=${ids.orgA}&userId=${ids.advisorA}&asOf=2026-10-30`, employee.access_token);
const filteredMandate = advisorFiltered.data?.mandates?.find((row) => row.mandateId === ids.mandateA);
check('advisor-filter-selects-participated-mandate', advisorFiltered.status === 200 && filteredMandate, `HTTP ${advisorFiltered.status}`);
check('advisor-filter-includes-other-labor', filteredMandate?.totalTimeEntries === afterMandate?.totalTimeEntries && filteredMandate?.knownLaborCost === afterMandate?.knownLaborCost, `filtered=${filteredMandate?.totalTimeEntries}/${filteredMandate?.knownLaborCost}; all=${afterMandate?.totalTimeEntries}/${afterMandate?.knownLaborCost}`);
observe('advisor-filter-semantics', 'userId selects mandates with at least one entry by that advisor; all labor entries in each selected mandate remain in cost and margin calculations.');

const volumeProject = await call('GET', `/projects/${ids.projectA}`, advisor.access_token);
check('volume-project-reused', volumeProject.status === 200 && volumeProject.data?.id === ids.projectA && volumeProject.data?.status !== 'ARCHIVED', `HTTP ${volumeProject.status}`);
let tasks = await call('GET', `/projects/${volumeProject.data.id}/tasks`, advisor.access_token);
let volumeTask = Array.isArray(tasks.data) && tasks.data.find((row) => row.taskTitle === 'Volume 1001 entries');
if (!volumeTask) {
  const createdTask = await call('POST', `/projects/${volumeProject.data.id}/tasks`, advisor.access_token, { taskTitle: 'Volume 1001 entries', categoryName: 'QA', assigneeId: ids.advisorA });
  check('volume-task-created', createdTask.status === 201, `HTTP ${createdTask.status}`);
  volumeTask = createdTask.data;
}
let sheet = await call('GET', `/projects/${volumeProject.data.id}/timesheet?from=2027-01-01&to=2027-01-31`, advisor.access_token);
const existingVolume = Array.isArray(sheet.data?.entries) ? sheet.data.entries.filter((row) => row.note === 'Rendement volume 1001').length : 0;
const missing = Math.max(0, 1001 - existingVolume);
const creationStarted = performance.now();
for (let offset = 0; offset < missing; offset += 20) {
  const batch = Array.from({ length: Math.min(20, missing - offset) }, () => call('POST', `/projects/${volumeProject.data.id}/tasks/${volumeTask.id}/time`, advisor.access_token, { date: '2027-01-15', heures: '0.1', note: 'Rendement volume 1001' }));
  const results = await Promise.all(batch);
  if (results.some((row) => row.status !== 201)) throw new Error(`VOLUME_CREATE_FAILED ${results.find((row) => row.status !== 201)?.status}`);
}
report.measurements.volumeCreationMs = Math.round((performance.now() - creationStarted) * 10) / 10;
sheet = await call('GET', `/projects/${volumeProject.data.id}/timesheet?from=2027-01-01&to=2027-01-31`, advisor.access_token);
const volumeRows = Array.isArray(sheet.data?.entries) ? sheet.data.entries.filter((row) => row.note === 'Rendement volume 1001') : [];
check('volume-timesheet-exhaustive', sheet.status === 200 && volumeRows.length === 1001, `rows=${volumeRows.length}; elapsedMs=${sheet.elapsedMs}; bytes=${sheet.bytes}`);
const operationalVolume = await call('GET', `/rendement/operational?from=2027-01-01&to=2027-01-31&userId=${ids.advisorA}`, admin.access_token);
const volumeAdvisor = operationalVolume.data?.advisors?.find((row) => row.userId === ids.advisorA);
check('volume-aggregation-exhaustive', operationalVolume.status === 200 && Math.abs(Number(volumeAdvisor?.hours) - 100.1) < 0.000001, `hours=${volumeAdvisor?.hours}; elapsedMs=${operationalVolume.elapsedMs}; bytes=${operationalVolume.bytes}`);
report.measurements.volume = { requestedEntries: 1001, timesheetRows: volumeRows.length, expectedHours: 100.1, actualHours: volumeAdvisor?.hours, creationMs: report.measurements.volumeCreationMs, timesheetReadMs: sheet.elapsedMs, timesheetBytes: sheet.bytes, operationalReadMs: operationalVolume.elapsedMs, operationalBytes: operationalVolume.bytes };

const beforeArchive = await call('GET', `/projects/${volumeProject.data.id}`, advisor.access_token);
check('archive-project-readable-before', beforeArchive.status === 200, `HTTP ${beforeArchive.status}`);
if (beforeArchive.data?.status !== 'ARCHIVED') {
  const archived = await call('PUT', `/projects/${volumeProject.data.id}`, advisor.access_token, { status: 'ARCHIVED', expectedUpdatedAt: beforeArchive.data.updatedAt });
  check('project-archived-canonically', archived.status === 200 && archived.data?.status === 'ARCHIVED', `HTTP ${archived.status}`);
}
const directArchived = await call('GET', `/projects/${volumeProject.data.id}`, advisor.access_token);
check('archived-direct-read-preserved', directArchived.status === 200 && directArchived.data?.status === 'ARCHIVED', `HTTP ${directArchived.status}`);
const listArchived = await call('GET', '/projects', advisor.access_token);
check('archived-list-read-preserved', listArchived.status === 200 && listArchived.data?.some((row) => row.id === volumeProject.data.id && row.status === 'ARCHIVED'), `HTTP ${listArchived.status}`);
const archivedOperational = await call('GET', `/rendement/operational?from=2027-01-01&to=2027-01-31&userId=${ids.advisorA}`, admin.access_token);
const archivedRow = archivedOperational.data?.advisors?.find((row) => row.userId === ids.advisorA);
check('archived-history-in-operational', archivedOperational.status === 200 && Math.abs(Number(archivedRow?.hours) - 100.1) < 0.000001, `hours=${archivedRow?.hours}`);
const archivedFinancial = await call('GET', `/rendement/financial?organizationId=${ids.orgA}`, employee.access_token);
check('archived-mandate-in-financial', archivedFinancial.status === 200 && archivedFinancial.data?.mandates?.some((row) => row.projectId === volumeProject.data.id), `HTTP ${archivedFinancial.status}`);
const forbiddenTask = await call('POST', `/projects/${volumeProject.data.id}/tasks`, advisor.access_token, { taskTitle: 'Must not be written after archive', categoryName: 'QA', assigneeId: ids.advisorA });
check('archived-new-task-refused', [403, 409].includes(forbiddenTask.status), `HTTP ${forbiddenTask.status}`);
const forbiddenTime = await call('POST', `/projects/${volumeProject.data.id}/tasks/${volumeTask.id}/time`, advisor.access_token, { date: '2027-02-01', heures: '1', note: 'Must not be written after archive' });
check('archived-new-time-refused', [403, 409].includes(forbiddenTime.status), `HTTP ${forbiddenTime.status}`);
if (forbiddenTask.status === 201 || forbiddenTime.status === 201) observe('archive-write-defect', `Archived project accepted new writes: task HTTP ${forbiddenTask.status}; time HTTP ${forbiddenTime.status}.`);

report.pass = report.checks.every((row) => row.status === 'PASS');
await mkdir(evidenceDir, { recursive: true });
await writeFile(join(evidenceDir, 'performance-reserves-acceptance.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, checks: report.checks, measurements: report.measurements, observations: report.observations }, null, 2));
if (!report.pass) process.exitCode = 1;
