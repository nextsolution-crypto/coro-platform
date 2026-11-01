const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const controller = read('coro-backend/src/library/library.controller.ts');
const service = read('coro-backend/src/library/library.service.ts');
const procedures = read('coro-backend/src/procedures/procedures.service.ts');
const customProcedures = read('coro-backend/src/custom-procedures/custom-procedures.service.ts');
const page = read('coro-frontend/app/library/page.tsx');

test('LIB-SEC-01: legacy global library mutations fail closed', () => {
  assert.match(controller, /@Post\('procedures'\)/);
  assert.match(controller, /@Put\('procedures\/:id'\)/);
  assert.match(controller, /throw new ForbiddenException/g);
  assert.doesNotMatch(controller, /libraryService\.createProcedure|libraryService\.updateProcedure/);
});

test('LIB-INT-01: the disconnected legacy persistence path is removed', () => {
  assert.match(service, /getAllProcedures\(\)/);
  assert.doesNotMatch(service, /prisma\.procedure\.create|prisma\.procedure\.update/);
});

test('LIB-SEC-02: project procedure reads apply canonical project scope', () => {
  const start = procedures.indexOf('async findAllForProject');
  const end = procedures.indexOf('async updateForProject', start);
  const body = procedures.slice(start, end);
  assert.match(body, /project\.findFirst/);
  assert.match(body, /projectAccessWhere\(actor\)/);
});

test('LIB-SEC-03: custom procedure operations inherit project authority', () => {
  assert.match(customProcedures, /assertReadableProject/);
  assert.match(customProcedures, /assertMutableProject/);
  assert.match(customProcedures, /projectAccessWhere\(actor\)/);
  assert.match(customProcedures, /mutableProjectAccessWhere\(actor\)/);
  assert.match(customProcedures, /requireOrganizationManager/);
});

test('LIB-UX-01: partial load failures expose an accessible retry state', () => {
  assert.match(page, /Promise\.allSettled/);
  assert.match(page, /setErrors|Réessayer|role=["']alert["']/i);
});

test('LIB-SCOPE-01: public screen is a three-catalog viewer, not a document library', () => {
  for (const endpoint of ['incident-codes', 'roles', 'procedures']) {
    assert.match(page, new RegExp(`/library/${endpoint}`));
  }
  assert.doesNotMatch(page, /download|preview|ProjectFile|Knowledge|attachment|version/i);
});
