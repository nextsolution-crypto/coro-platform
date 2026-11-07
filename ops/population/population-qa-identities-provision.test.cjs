'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHash } = require('node:crypto');
const { APPROVAL, IDENTITIES, TARGET, assertAuthority, assertFoundation, exactExisting, resolveCompiledModule } = require('./population-qa-identities-provision.cjs');

const hashes = IDENTITIES.map(({ email }) => createHash('sha256').update(email).digest('hex')).join(',');
const env = { CORO_POPULATION_QA_IDENTITIES_RUN: 'true', CORO_POPULATION_QA_IDENTITIES_APPROVAL: APPROVAL, POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'false', POPULATION_CONTROLLED_LIVE_TEST_STOP: 'true', DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST: hashes };

test('requires exact authority, STOP and both hashed aliases', () => {
  assert.doesNotThrow(() => assertAuthority(env));
  assert.throws(() => assertAuthority({ ...env, POPULATION_CONTROLLED_LIVE_TEST_STOP: 'false' }));
  assert.throws(() => assertAuthority({ ...env, DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST: hashes.split(',')[0] }));
});

test('pins canonical active foundation', () => {
  const state = { organization: { id: TARGET.organizationId, name: TARGET.organizationName, isActive: true }, client: { id: TARGET.clientId, organizationId: TARGET.organizationId, name: TARGET.clientName, isActive: true }, building: { id: TARGET.buildingId, organizationId: TARGET.organizationId, clientId: TARGET.clientId, name: TARGET.buildingName, isActive: true }, actor: { organizationId: TARGET.organizationId, role: 'ADMIN', isActive: true } };
  assert.doesNotThrow(() => assertFoundation(state));
  assert.throws(() => assertFoundation({ ...state, building: { ...state.building, clientId: 'other' } }));
});

test('accepts only an exact idempotent existing state', () => {
  const users = IDENTITIES.map((identity) => ({ id: identity.id, email: identity.email, organizationId: TARGET.organizationId, clientId: TARGET.clientId, role: identity.role, buildingIds: [TARGET.buildingId], populationPermissions: identity.permissions }));
  const events = IDENTITIES.map((identity) => ({ idempotencyKey: identity.eventKey, clientUserId: identity.id }));
  assert.equal(exactExisting(users, [], events), true);
  assert.throws(() => exactExisting(users, [{ id: 'collision' }], events));
  assert.throws(() => exactExisting([{ ...users[0], buildingIds: [] }, users[1]], [], events));
});

test('source has fixed recipients and no alert transport', () => {
  const source = require('node:fs').readFileSync(require.resolve('./population-qa-identities-provision.cjs'), 'utf8');
  assert.equal((source.match(/demo-sp-preparer@getcoro\.io/g) || []).length, 1);
  assert.equal((source.match(/demo-sp-approver@getcoro\.io/g) || []).length, 1);
  assert.doesNotMatch(source, /sendSms|POPULATION_CONTROLLED_LIVE_TEST_ENABLED\s*=\s*['"]true|smtp\/email/);
});

test('resolves exactly one compiled runtime module and rejects ambiguity', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coro-qa-module-'));
  try {
    fs.mkdirSync(path.join(root, 'nested'));
    fs.writeFileSync(path.join(root, 'nested', 'service.js'), 'module.exports={}');
    assert.equal(resolveCompiledModule(root, 'service.js'), path.join(root, 'nested', 'service.js'));
    fs.writeFileSync(path.join(root, 'service.js'), 'module.exports={}');
    assert.throws(() => resolveCompiledModule(root, 'service.js'), /AMBIGUOUS/);
    assert.throws(() => resolveCompiledModule(root, 'missing.js'), /MISSING/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
