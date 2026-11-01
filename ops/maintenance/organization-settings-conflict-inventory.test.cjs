'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { runReadOnly, summarize } = require('./organization-settings-conflict-inventory.cjs');

test('reports only grouped decision metadata and never setting values', () => {
  const report = summarize([
    { organizationId: 'o1', field: 'timezone', values: ['America/Toronto', 'UTC'], resolvedAt: null },
    { organizationId: 'o2', field: 'timezone', values: ['secret-zone'], resolvedAt: new Date() },
  ]);
  assert.deepEqual(report.totals, { conflicts: 2, resolved: 1, unresolved: 1, organizationsAffected: 2 });
  assert.equal(report.fields.timezone.unresolved, 1);
  assert.equal(report.containsSettingsValues, false);
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes('America/Toronto'), false);
  assert.equal(serialized.includes('secret-zone'), false);
});
test('uses a read-only transaction', async () => {
  let statement = '';
  const prisma = { $transaction: async (fn) => fn({ $executeRawUnsafe: async (sql) => { statement = sql; }, organizationSettingsConflict: { findMany: async () => [] } }) };
  const report = await runReadOnly(prisma);
  assert.equal(statement, 'SET TRANSACTION READ ONLY');
  assert.equal(report.decision, 'NO_UNRESOLVED_DECISION');
});
test('supports the explicit stdin execution switch used by the governed workflow', () => {
  const source = fs.readFileSync(require.resolve('./organization-settings-conflict-inventory.cjs'), 'utf8');
  assert.match(source, /require\.main === module \|\| process\.env\.CORO_SETTINGS_CONFLICT_INVENTORY_RUN === 'true'/);
});
