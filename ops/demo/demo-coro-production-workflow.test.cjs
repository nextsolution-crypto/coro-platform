const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflow = fs.readFileSync(
  path.join(__dirname, '..', '..', '.github', 'workflows', 'production-demo-coro-fixtures.yml'),
  'utf8',
);
const fixtureAuthority = fs.readFileSync(
  path.join(__dirname, 'demo-coro-fixtures.cjs'),
  'utf8',
);

test('production fixture workflow is fixed, locked, backed up, and tenant-scoped', () => {
  assert.match(workflow, /options: \[dry-run, prepare, verify, reset\]/);
  assert.match(workflow, /flock -n 9/);
  assert.match(workflow, /coro-db-backup\.service/);
  assert.match(workflow, /CORO_DEMO_FIXTURES_RUN=true/);
  assert.match(workflow, /demo-coro-fixture-manifest\.json/);
  assert.doesNotMatch(workflow, /organization[_-]?id.*inputs/i);
  assert.doesNotMatch(workflow, /docker system prune|docker volume prune/);
});

test('fixture authority resolves locked dependencies in the production backend image', () => {
  assert.match(fixtureAuthority, /require\(`\/app\/node_modules\/\$\{name\}`\)/);
  assert.match(fixtureAuthority, /loadRuntimeDependency\('bcryptjs'\)/);
  assert.match(fixtureAuthority, /loadRuntimeDependency\('@prisma\/client'\)/);
});
