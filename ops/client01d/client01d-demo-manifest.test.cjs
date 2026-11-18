const assert = require('node:assert/strict');
const test = require('node:test');
const manifest = require('./client01d-demo-manifest.json');

test('CLIENT-01D preparation is disabled and locked to canonical CORO Demo', () => {
  assert.equal(manifest.enabled, false);
  assert.equal(
    manifest.organizationId,
    '916f54ec-af22-45e0-99db-a369d9630002',
  );
  assert.deepEqual(manifest.requiredEnvironment, {
    status: 'ACTIVE',
    communicationMode: 'SIMULATE',
  });
  assert.equal(manifest.resolveBuildingsFromActiveDemoFixtureRecords, true);
});

test('CLIENT-01D preparation cannot authorize external effects', () => {
  assert.deepEqual(new Set(Object.values(manifest.communications)), new Set(['BLOCK']));
  assert.equal(new Set(manifest.profiles).size, manifest.profiles.length);
  assert.equal(new Set(manifest.datasets).size, manifest.datasets.length);
});
