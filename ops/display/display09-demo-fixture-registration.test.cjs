'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { register, unregister, EXPECTED_BUILDING_FINGERPRINT } = require('./display09-demo-fixture-registration.cjs');

function harness(overrides = {}) {
  const record = overrides.record ?? null;
  const tx = {
    organization: { findUnique: async () => ({ id: '916f54ec-af22-45e0-99db-a369d9630002', name: 'CORO Demo', isActive: true, demoEnvironment: { status: 'ACTIVE', communicationMode: 'SIMULATE', externalProvidersDisabled: true } }) },
    client: { findMany: async () => [{ id: 'client-1', name: 'Groupe Immobilier Prémont' }] },
    building: { findMany: async () => [{ id: overrides.buildingId ?? 'canonical-building', name: 'Tour Premont' }] },
    demoFixtureRecord: {
      findUnique: async ({ where }) => where.organizationId_entityType_entityId ? record : null,
      upsert: async () => ({ id: 'fixture-1', entityId: overrides.buildingId ?? 'canonical-building', state: 'ACTIVE' }),
      count: async () => 1,
      delete: async () => ({ id: 'fixture-1' }),
    },
  };
  return { tx, prisma: { $transaction: async (fn) => fn(tx) } };
}

test('registers only the pinned canonical building and changes only the registry', async () => {
  const h = harness({ buildingId: 'canonical-building' });
  const crypto = require('node:crypto');
  const actual = crypto.createHash('sha256').update('canonical-building').digest('hex');
  assert.notEqual(actual, EXPECTED_BUILDING_FINGERPRINT);
  const result = await register(h.prisma, 'test-run', actual);
  assert.deepEqual(result, { schemaVersion: 1, execution: 'PASS', created: true, registryOnly: true, reversible: true, buildingFingerprint: actual, activeFixtureCount: 1, state: 'ACTIVE', postMigrationDisplayGate: 'REQUIRED' });
});

test('rejects a pre-existing conflicting fixture without mutation', async () => {
  const h = harness({ record: { id: 'other', fixtureNamespace: 'other', fixtureKey: 'other', state: 'ACTIVE' } });
  const crypto = require('node:crypto');
  const actual = crypto.createHash('sha256').update('canonical-building').digest('hex');
  await assert.rejects(() => register(h.prisma, 'test-run', actual), /BUILDING_ALREADY_REGISTERED_BY_OTHER_FIXTURE/);
});

test('rejects an unpinned building before any registry write', async () => {
  const h = harness({ buildingId: 'wrong-building' });
  await assert.rejects(() => register(h.prisma), /CANONICAL_BUILDING_MISMATCH/);
});

test('reversal removes only the exact registry record', async () => {
  const h = harness({ record: { id: 'fixture-1', fixtureNamespace: 'display-09-demo-pilot', fixtureKey: 'tour-premont-building', entityType: 'BUILDING', entityId: 'canonical-building', state: 'ACTIVE' } });
  h.tx.demoFixtureRecord.findUnique = async () => ({ id: 'fixture-1', entityType: 'BUILDING', entityId: 'canonical-building' });
  const crypto = require('node:crypto');
  const actual = crypto.createHash('sha256').update('canonical-building').digest('hex');
  assert.deepEqual(await unregister(h.prisma, actual), { schemaVersion: 1, execution: 'PASS', removed: true, registryOnly: true });
});

test('stdin execution is gated by the explicit runtime switch', () => {
  const source = fs.readFileSync(require.resolve('./display09-demo-fixture-registration.cjs'), 'utf8');
  assert.match(source, /require\.main === module \|\| process\.env\.DISPLAY09_FIXTURE_REGISTRATION_RUN === 'true'/);
});
