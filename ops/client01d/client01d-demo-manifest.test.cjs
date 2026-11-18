const assert = require('node:assert/strict');
const test = require('node:test');
const manifest = require('./client01d-demo-manifest.json');

test('CLIENT-01D preparation is disabled and locked to canonical CORO Demo', () => {
  assert.equal(manifest.schemaVersion, 2);
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

test('CORO Demo Report declares six site capabilities and six distinct least-privilege profiles', () => {
  assert.deepEqual(manifest.features, [
    'INCIDENT_REPORTS', 'OPERATIONAL_LOG', 'OPERATIONAL_SHIFTS',
    'OPERATIONAL_DIRECTIVES', 'OPERATIONAL_FOLLOWUPS', 'SECURITY_WORKSTATION',
  ]);
  assert.equal(manifest.profiles.length, 6);
  assert.equal(new Set(manifest.profiles).size, 6);
  assert.deepEqual(manifest.profilePermissions.UNAUTHORIZED_USER, []);
  assert.ok(manifest.profilePermissions.REPORT_REVIEWER.includes('INCIDENT_REPORT_APPROVE'));
  assert.ok(!manifest.profilePermissions.SECURITY_AGENT_A.includes('INCIDENT_REPORT_APPROVE'));
  assert.ok(!manifest.profilePermissions.SECURITY_AGENT_B.includes('INCIDENT_REPORT_APPROVE'));
});

test('CLIENT-01D preparation cannot authorize external effects', () => {
  assert.deepEqual(new Set(Object.values(manifest.communications)), new Set(['BLOCK']));
  assert.equal(new Set(manifest.profiles).size, manifest.profiles.length);
  assert.equal(new Set(manifest.datasets).size, manifest.datasets.length);
});
