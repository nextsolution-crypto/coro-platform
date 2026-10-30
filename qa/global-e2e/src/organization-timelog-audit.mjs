import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const controller = await readFile(resolve(root, 'coro-backend/src/timelog/timelog.controller.ts'), 'utf8');
const service = await readFile(resolve(root, 'coro-backend/src/timelog/timelog.service.ts'), 'utf8');
const page = await readFile(resolve(root, 'coro-frontend/app/timelog/page.tsx'), 'utf8');
const capacity = await readFile(resolve(root, 'coro-backend/src/mandate/capacity.service.ts'), 'utf8');
const rendement = await readFile(resolve(root, 'coro-backend/src/mandate/rendement-financial.service.ts'), 'utf8');

const checks = [];
const check = (id, description, fn) => {
  try { fn(); checks.push({ id, status: 'PASS', description }); }
  catch (error) { checks.push({ id, status: 'FAIL', description, observed: error.message }); }
};

check('MAP-01', 'All Timelog routes require JWT and organization-status guards', () => {
  assert.match(controller, /UseGuards\(AuthGuard\('jwt'\), OrganizationStatusGuard\)/);
});
check('AUTH-01', 'Personal mutations derive user and organization from the authenticated actor', () => {
  assert.match(controller, /addEntry\(req\.user\.userId, req\.user\.organizationId, dto\)/);
  assert.match(service, /where: \{ id: entryId, userId, organizationId \}/);
});
check('AUTH-02', 'Team view is restricted to tenant administrators', () => {
  assert.match(controller, /getTeamTimelog[\s\S]*?requireTenantAdmin\(req\.user\)/);
});
check('VALID-01', 'Server validates Timelog request DTOs and numeric bounds', () => {
  assert.doesNotMatch(controller, /@Body\(\) dto: any/);
  assert.match(controller, /CreateTimelogEntryDto/);
});
check('VALID-02', 'Server verifies a submitted category belongs to the effective catalog', () => {
  const addEntry = service.slice(service.indexOf('async addEntry'), service.indexOf('async updateEntry'));
  assert.match(addEntry, /timelogCategory\.findFirst|timelogCategory\.findUnique/);
});
check('DATE-01', 'Date-only work dates have an explicit timezone-safe parsing policy', () => {
  assert.match(service, /parseCivilDate\(dto\.date\)/);
  assert.doesNotMatch(service, /new Date\(dto\.date\)/);
});
check('CONC-01', 'Entry updates use an explicit optimistic-concurrency token', () => {
  assert.match(service, /lockVersion: dto\.lockVersion/);
  assert.match(service, /lockVersion: \{ increment: 1 \}/);
});
check('ERROR-01', 'The page exposes load and mutation failures to the user', () => {
  assert.match(page, /setError|role=["']alert["']|aria-live/);
});
check('MODEL-01', 'General Timelog hours are explicitly non-billable', () => {
  assert.match(service, /isBillable: false/);
});
check('MODEL-02', 'Capacity consumes general Timelog entries', () => {
  assert.match(capacity, /timelogEntry\.findMany/);
  assert.match(capacity, /heuresTimelogTotal/);
});
check('MODEL-03', 'Financial Rendement does not consume general TimelogEntry rows', () => {
  assert.doesNotMatch(rendement, /timelogEntry|TimelogEntry/);
});
check('FEATURE-01', 'No timer authority is advertised by the current Timelog page', () => {
  assert.doesNotMatch(page, /startTimer|stopTimer|pauseTimer|timerId/);
});

const report = {
  generatedAt: new Date().toISOString(),
  scope: 'organization-timelog-static-characterization',
  checks,
  summary: {
    pass: checks.filter(item => item.status === 'PASS').length,
    fail: checks.filter(item => item.status === 'FAIL').length,
  },
};
const output = process.env.CORO_TIMELOG_AUDIT_OUTPUT
  ? resolve(process.env.CORO_TIMELOG_AUDIT_OUTPUT)
  : resolve(root, 'qa/global-e2e/.evidence/organization-timelog-audit.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.summary.fail ? 1 : 0;
