const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const controller = read('coro-backend/src/library/library.controller.ts');
const service = read('coro-backend/src/library/library.service.ts');
const procedures = read('coro-backend/src/procedures/procedures.service.ts');
const page = read('coro-frontend/app/library/page.tsx');

test('LIB-SEC-01: library mutations have no functional permission or actor contract', () => {
  assert.match(controller, /@Post\('procedures'\)/);
  assert.match(controller, /@Put\('procedures\/:id'\)/);
  assert.doesNotMatch(controller, /PermissionsGuard|RequirePermission|@Request\(\)/);
});

test('LIB-INT-01: procedure writes and reads use disconnected authorities', () => {
  assert.match(service, /getAllProcedures\(\)/);
  assert.match(service, /prisma\.procedure\.create/);
  assert.match(service, /prisma\.procedure\.update/);
  const getBody = service.slice(service.indexOf('async getProcedures'), service.indexOf('async createProcedure'));
  assert.doesNotMatch(getBody, /prisma\.procedure/);
});

test('LIB-SEC-02: project procedure reads do not apply canonical project scope', () => {
  const start = procedures.indexOf('async findAllForProject');
  const end = procedures.indexOf('async updateForProject', start);
  const body = procedures.slice(start, end);
  assert.match(body, /project\.findUnique/);
  assert.match(body, /where: \{ id: projectId \}/);
  assert.doesNotMatch(body, /projectAccessWhere|assertMutableProject/);
});

test('LIB-UX-01: load failure is console-only and no retry state is rendered', () => {
  assert.match(page, /catch \(err\) \{ console\.error\(err\); \}/);
  assert.doesNotMatch(page, /setError|retry|Réessayer|role=["']alert["']/i);
});

test('LIB-SCOPE-01: public screen is a three-catalog viewer, not a document library', () => {
  for (const endpoint of ['incident-codes', 'roles', 'procedures']) {
    assert.match(page, new RegExp(`/library/${endpoint}`));
  }
  assert.doesNotMatch(page, /download|preview|ProjectFile|Knowledge|attachment|version/i);
});
