#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const api = String(process.env.CORO_QA_BACKEND_URL || '').replace(/\/$/, '');
const sessionCheckpoint = process.env.CORO_QA_SESSION_CHECKPOINT;
const evidenceDir = process.env.CORO_QA_PERFORMANCE_EVIDENCE;
const actorFile = process.env.CORO_QA_ACTOR_FILE;
if (!/^http:\/\/127\.0\.0\.1:\d+\/api$/.test(api) || !sessionCheckpoint || !evidenceDir || !actorFile) throw new Error('Isolated QA runtime required.');
const sessions = JSON.parse(await readFile(sessionCheckpoint, 'utf8'));
const ids = JSON.parse(await readFile(actorFile, 'utf8'));
const report = { candidate: process.env.CORO_QA_COMMIT_SHA, executedAt: new Date().toISOString(), checks: [] };
const check = (id, pass, detail) => { report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail }); if (!pass) throw new Error(`${id}: ${detail}`); };
async function call(method, route, token, body) { const response = await fetch(`${api}${route}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) }); const text = await response.text(); let data=text; try { data=JSON.parse(text); } catch {} return { status: response.status, data }; }

const admin = sessions.admin.access_token; const advisor = sessions.advisor.access_token; const employee = sessions.employee.access_token;
let deactivated = false;
try {
  const off = await call('PUT', `/users/organization/${ids.advisorA}/active`, admin, { isActive: false, reason: 'Rendement audit inactive-user scope probe' });
  check('advisor-deactivated-canonically', off.status === 200, `HTTP ${off.status}`); deactivated = true;
  const denied = await call('GET', '/rendement/operational?from=2026-10-01&to=2026-10-31', advisor);
  check('inactive-session-denied', [401, 403].includes(denied.status), `HTTP ${denied.status}`);
  const operational = await call('GET', '/rendement/operational?from=2026-10-01&to=2026-10-31', admin);
  const inactiveRow = operational.data?.advisors?.find((row) => row.userId === ids.advisorA);
  check('inactive-history-still-aggregated', operational.status === 200 && inactiveRow?.hours === 8, `HTTP ${operational.status}; hours=${inactiveRow?.hours}`);
  const financial = await call('GET', `/rendement/financial?organizationId=${ids.orgA}`, employee);
  const mandate = financial.data?.mandates?.find((row) => row.mandateId === ids.mandateA);
  check('inactive-history-still-costed', financial.status === 200 && mandate?.knownLaborCost === '640.00', `HTTP ${financial.status}; cost=${mandate?.knownLaborCost}`);
} finally {
  if (deactivated) {
    const on = await call('PUT', `/users/organization/${ids.advisorA}/active`, admin, { isActive: true, reason: 'Rendement audit synthetic cleanup' });
    check('advisor-reactivated-cleanup', on.status === 200, `HTTP ${on.status}`);
    const stale = await call('GET', '/rendement/operational?from=2026-10-01&to=2026-10-31', advisor);
    check('old-session-remains-revoked', [401, 403].includes(stale.status), `HTTP ${stale.status}`);
  }
}
report.pass = report.checks.every((row) => row.status === 'PASS');
await mkdir(evidenceDir, { recursive: true }); await writeFile(join(evidenceDir, 'performance-inactive-acceptance.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
