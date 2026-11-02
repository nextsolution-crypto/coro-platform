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
const report = { candidate: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), checks: [], observations: [] };
const check = (id, pass, detail) => { report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail }); if (!pass) throw new Error(`${id}: ${detail}`); };
const observe = (id, detail) => report.observations.push({ id, detail });

async function call(method, route, token, body) {
  const response = await fetch(`${api}${route}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text(); let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data, retryAfter: response.headers.get('retry-after') };
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
  check(`mfa-required-${email}`, first.status < 300 && first.data?.mfaRequired === true, `HTTP ${first.status}`);
  const verified = await call('POST', '/auth/verify-mfa', null, { email, code: await latestCode(email, started) });
  check(`mfa-verified-${email}`, verified.status < 300 && Boolean(verified.data?.access_token), `HTTP ${verified.status}`);
  return verified.data;
}

async function reusableSession(name, email, saved) {
  const candidate = saved?.[name];
  if (!candidate?.access_token || !candidate?.user) return null;
  const me = await call('GET', '/users/me', candidate.access_token);
  if (me.status !== 200 || String(me.data?.email || '').toLowerCase() !== email) return null;
  report.checks.push({ id: `session-reused-${name}`, status: 'PASS', detail: 'existing QA session remained valid' });
  return candidate;
}

let savedSessions = {};
try { savedSessions = JSON.parse(await readFile(sessionCheckpoint, 'utf8')); } catch {}
async function session(name, email) {
  return (await reusableSession(name, email, savedSessions)) || login(email);
}

try {
  const founder = await session('founder', 'founder@global-e2e.test');
  const employee = await session('employee', 'employee-org@global-e2e.test');
  const adminA = await session('admin', 'customer-admin-a@global-e2e.test');
  const adminB = await session('adminB', 'customer-admin-b@global-e2e.test');
  const advisor = await session('advisor', 'advisor-a@global-e2e.test');
  savedSessions = { founder, employee, admin: adminA, adminB, advisor };
  await writeFile(sessionCheckpoint, JSON.stringify(savedSessions));

  const currentAuthority = await call('GET', '/admin/v1/platform-authority/me', founder.access_token);
  if (currentAuthority.status === 200 && currentAuthority.data?.authorityStatus === 'ACTIVE') {
    check('authority-active', true, 'existing isolated authority reused');
  } else {
    const draft = await call('POST', '/admin/v1/platform-authority/draft', founder.access_token, { operatorOrganizationId: ids.operator, founderUserId: ids.founder, reason: 'Rendement audit isolated authority' });
    check('authority-draft', draft.status === 201 && draft.data.status === 'DRAFT', `HTTP ${draft.status}`);
    const active = await call('POST', '/admin/v1/platform-authority/activate', founder.access_token, { lockVersion: draft.data.lockVersion, reason: 'Rendement audit isolated activation' });
    check('authority-active', active.status === 201 && active.data.status === 'ACTIVE', `HTTP ${active.status}`);
  }
  const grantList = await call('GET', '/admin/v1/platform-authority/grants', founder.access_token);
  check('grant-list-readable', grantList.status === 200 && Array.isArray(grantList.data), `HTTP ${grantList.status}`);
  for (const permission of ['FINANCIAL_ADVISOR_COST_MANAGE', 'FINANCIAL_RENDEMENT_READ', 'FINANCIAL_SALE_VALIDATE']) {
    const existing = grantList.data.find((row) => row.userId === ids.employeeOrg && row.permission === permission && row.scope === 'ORGANIZATION' && row.targetOrganizationId === ids.orgA && row.status === 'ACTIVE');
    if (existing) {
      check(`grant-${permission}`, true, 'existing active governed grant reused');
      continue;
    }
    const grant = await call('POST', '/admin/v1/platform-authority/grants', founder.access_token, { userId: ids.employeeOrg, permission, scope: 'ORGANIZATION', targetOrganizationId: ids.orgA, reason: `Rendement audit ${permission}` });
    check(`grant-${permission}`, grant.status === 201, `HTTP ${grant.status}`);
  }
  const rateList = await call('GET', `/advisor-cost-rates?organizationId=${ids.orgA}&userId=${ids.advisorA}`, employee.access_token);
  const existingRate = Array.isArray(rateList.data) && rateList.data.find((row) => row.currency === 'CAD' && row.status === 'APPROVED' && String(row.effectiveFrom).startsWith('2026-10-01'));
  if (existingRate) {
    check('rate-approved-four-eyes', true, 'existing governed approved rate reused');
  } else {
    const rate = await call('POST', '/advisor-cost-rates', founder.access_token, { organizationId: ids.orgA, userId: ids.advisorA, currency: 'CAD', hourlyCost: '80.00', effectiveFrom: '2026-10-01' });
    check('rate-draft', rate.status === 201, `HTTP ${rate.status}`);
    const submitted = await call('POST', `/advisor-cost-rates/${rate.data.id}/submit`, founder.access_token, { lockVersion: rate.data.lockVersion, reason: 'Synthetic rate review' });
    check('rate-submitted', submitted.status === 201, `HTTP ${submitted.status}`);
    const approved = await call('POST', `/advisor-cost-rates/${rate.data.id}/approve`, employee.access_token, { lockVersion: submitted.data.lockVersion, reason: 'Independent synthetic approval' });
    check('rate-approved-four-eyes', approved.status === 201, `HTTP ${approved.status}`);
  }

  const task = await call('POST', `/projects/${ids.projectA}/tasks`, advisor.access_token, { taskTitle: 'Rendement synthetic task 98eed', categoryName: 'QA', assigneeId: ids.advisorA });
  check('task-created', task.status === 201, `HTTP ${task.status}`);
  for (const item of [{ date: '2026-10-15', heures: '5.5' }, { date: '2026-10-31', heures: '2.5' }]) {
    const entry = await call('POST', `/projects/${ids.projectA}/tasks/${task.data.id}/time`, advisor.access_token, { ...item, note: 'Rendement audit synthetic entry' });
    check(`task-time-${item.date}`, entry.status === 201, `HTTP ${entry.status}`);
  }
  const catalog = await call('GET', '/timelog/catalog', advisor.access_token);
  check('timelog-catalog', catalog.status === 200 && Array.isArray(catalog.data) && catalog.data.length > 0, `HTTP ${catalog.status}`);
  const timelog = await call('POST', '/timelog/me', advisor.access_token, { date: '2026-10-15', heures: 99, category: catalog.data[0].key, note: 'Independent Timelog source probe', clientRequestId: '9a000000-0000-4000-8000-000000000001' });
  check('timelog-created-through-api', [200, 201].includes(timelog.status), `HTTP ${timelog.status}`);

  const mandateState = await call('GET', `/projects/${ids.projectA}/mandate`, adminA.access_token);
  check('mandate-state-readable', mandateState.status === 200 && Number.isInteger(mandateState.data?.financialLockVersion), `HTTP ${mandateState.status}`);
  const sale = await call('PUT', `/rendement/financial/mandates/${ids.mandateA}/sale`, founder.access_token, { soldAmount: '1000.00', soldCurrency: 'CAD', soldAt: '2026-10-31', reason: 'Synthetic governed sale for audit', lockVersion: mandateState.data.financialLockVersion });
  check('sale-validated', sale.status === 200, `HTTP ${sale.status}`);
  const operationalAdvisor = await call('GET', '/rendement/operational?from=2026-10-01&to=2026-10-31', advisor.access_token);
  check('advisor-operational-scope', operationalAdvisor.status === 200 && operationalAdvisor.data.advisors.length === 1 && operationalAdvisor.data.advisors[0].userId === ids.advisorA, `HTTP ${operationalAdvisor.status}`);
  check('task-time-sum-excludes-timelog', operationalAdvisor.data.advisors[0].hours === 8, `hours=${operationalAdvisor.data.advisors[0].hours}`);
  const operationalAdmin = await call('GET', '/rendement/operational?from=2026-10-01&to=2026-10-31', adminA.access_token);
  check('admin-operational-own-tenant', operationalAdmin.status === 200 && operationalAdmin.data.advisors.some((row) => row.userId === ids.advisorA), `HTTP ${operationalAdmin.status}`);
  const otherTenant = await call('GET', '/rendement/operational?from=2026-10-01&to=2026-10-31', adminB.access_token);
  check('other-tenant-no-leak', otherTenant.status === 200 && !otherTenant.data.advisors.some((row) => row.userId === ids.advisorA), `HTTP ${otherTenant.status}`);
  const financial = await call('GET', `/rendement/financial?organizationId=${ids.orgA}`, employee.access_token);
  const mandate = financial.data.mandates?.find((row) => row.mandateId === ids.mandateA);
  check('financial-authorized', financial.status === 200 && mandate, `HTTP ${financial.status}`);
  check('financial-formula', mandate.knownLaborCost === '640.00' && mandate.contributionMargin === '360.00' && mandate.contributionMarginPercent === '36.00', JSON.stringify(mandate));
  check('financial-entry-count', mandate.totalTimeEntries === 2 && mandate.coveredTimeEntries === 2, `${mandate.coveredTimeEntries}/${mandate.totalTimeEntries}`);
  for (const [id, token] of [['admin-denied', adminA.access_token], ['operator-denied', advisor.access_token]]) {
    const denied = await call('GET', `/rendement/financial?organizationId=${ids.orgA}`, token);
    check(id, denied.status === 403, `HTTP ${denied.status}`);
  }
  const cross = await call('GET', `/rendement/financial?organizationId=${ids.orgB}`, employee.access_token);
  check('delegated-cross-tenant-denied', cross.status === 403, `HTTP ${cross.status}`);
  const anonymous = await call('GET', '/rendement/operational?from=2026-10-01&to=2026-10-31');
  check('anonymous-denied', anonymous.status === 401, `HTTP ${anonymous.status}`);
  const invalid = await call('GET', '/rendement/operational?from=2026-10-31&to=2026-10-01', advisor.access_token);
  check('invalid-period-denied', invalid.status === 400, `HTTP ${invalid.status}`);
} finally {}

report.pass = report.checks.every((row) => row.status === 'PASS');
await mkdir(evidenceDir, { recursive: true });
await writeFile(join(evidenceDir, 'performance-api-acceptance.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, checks: report.checks, observations: report.observations }, null, 2));
