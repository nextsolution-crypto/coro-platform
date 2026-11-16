'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const { ORGANIZATION_ID, LOCATION_CODE, run } = require('./display09-published-location.cjs');

test('resolves exactly one active published Tour Prémont location in a read-only transaction', async () => {
  const calls = [];
  const tx = {
    $executeRawUnsafe: async (sql) => calls.push(sql),
    $queryRawUnsafe: async () => [{ transaction_read_only: 'on' }],
    displayLocation: {
      findMany: async (query) => {
        assert.equal(query.where.organizationId, ORGANIZATION_ID);
        assert.equal(query.where.code, LOCATION_CODE);
        return [{
          id: 'location-1', publicDisplayId: 'ABCDEFGHIJKLMNOP', status: 'ACTIVE',
          building: { name: 'Tour Prémont', isActive: true },
          planPublications: [{ id: 'publication-1', versionNumber: 1, status: 'PUBLISHED' }],
        }];
      },
    },
  };
  const prisma = { $transaction: async (fn, options) => { assert.equal(options.timeout, 60_000); return fn(tx); } };
  const result = await run(prisma);
  assert.equal(result.execution, 'PASS');
  assert.equal(result.playerPath, '/d/ABCDEFGHIJKLMNOP');
  assert.deepEqual(calls, ['SET TRANSACTION READ ONLY']);
});

test('fails closed for ambiguity or a missing published V1', async () => {
  for (const records of [[], [
    { id: 'location-1', publicDisplayId: 'ABCDEFGHIJKLMNOP', status: 'ACTIVE', building: { name: 'Tour Prémont', isActive: true }, planPublications: [] },
  ]]) {
    const tx = {
      $executeRawUnsafe: async () => undefined,
      $queryRawUnsafe: async () => [{ transaction_read_only: 'on' }],
      displayLocation: { findMany: async () => records },
    };
    const result = await run({ $transaction: async (fn) => fn(tx) });
    assert.equal(result.execution, 'FAILED');
  }
});

test('refuses when PostgreSQL does not confirm read-only mode', async () => {
  const tx = {
    $executeRawUnsafe: async () => undefined,
    $queryRawUnsafe: async () => [{ transaction_read_only: 'off' }],
  };
  await assert.rejects(() => run({ $transaction: async (fn) => fn(tx) }), /READ_ONLY_TRANSACTION_NOT_CONFIRMED/);
});

test('the protected workflow invokes only the pinned read-only inventory', () => {
  const workflow = fs.readFileSync(
    require.resolve('../../.github/workflows/production-demo-coro-readiness.yml'),
    'utf8',
  );
  assert.match(workflow, /RESOLVE_DISPLAY09_PUBLISHED_LOCATION_READ_ONLY/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /DISPLAY09_PUBLISHED_LOCATION_RUN=true/);
  assert.match(workflow, /display09-published-location\.cjs/);
  assert.doesNotMatch(workflow, /display09-published-location[\s\S]{0,2000}(INSERT|UPDATE|DELETE)/i);
});
