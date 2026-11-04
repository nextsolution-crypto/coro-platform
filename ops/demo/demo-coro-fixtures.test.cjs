'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertManifest,
  assertTarget,
  fingerprint,
  manifest,
  run,
} = require('./demo-coro-fixtures.cjs');

function validTarget() {
  return {
    id: 'reference-user',
    organizationId: manifest.target.organizationId,
    role: 'ADMIN',
    isActive: true,
    organization: {
      name: manifest.target.organizationName,
      isActive: true,
      isInternal: false,
    },
  };
}

test('manifest is locked to the canonical tenant and has unique fixture ids', () => {
  assert.doesNotThrow(assertManifest);
  assert.equal(manifest.target.organizationId, '916f54ec-af22-45e0-99db-a369d9630002');
  assert.equal(manifest.target.referenceEmail, 'demo@getcoro.io');
});

test('target verification accepts the one canonical internal identity', async () => {
  const tx = {
    user: { findUnique: async () => validTarget() },
    clientUser: { findUnique: async () => null },
  };
  assert.deepEqual(await assertTarget(tx), validTarget());
});

test('target verification refuses an identity collision without mutation', async () => {
  const tx = {
    user: { findUnique: async () => validTarget() },
    clientUser: { findUnique: async () => ({ id: 'collision' }) },
  };
  await assert.rejects(assertTarget(tx), /TARGET_NOT_VERIFIED_NO_WRITES/);
});

test('target verification refuses a different organization', async () => {
  const tx = {
    user: {
      findUnique: async () => ({
        ...validTarget(),
        organizationId: '00000000-0000-4000-8000-000000000000',
      }),
    },
    clientUser: { findUnique: async () => null },
  };
  await assert.rejects(assertTarget(tx), /TARGET_NOT_VERIFIED_NO_WRITES/);
});

test('unknown commands are rejected before database access', async () => {
  await assert.rejects(run({}, 'purge-all'), /UNKNOWN_DEMO_FIXTURE_COMMAND/);
});

test('fingerprints are stable and do not expose their input', () => {
  const value = fingerprint(manifest.target.referenceEmail);
  assert.equal(value.length, 64);
  assert.equal(value.includes(manifest.target.referenceEmail), false);
});
