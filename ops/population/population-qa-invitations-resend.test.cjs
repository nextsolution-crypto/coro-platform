'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHash } = require('node:crypto');
const { APPROVAL, IDENTITIES, assertAuthority, assertExactState } = require('./population-qa-invitations-resend.cjs');
const { TARGET } = require('./population-qa-identities-provision.cjs');
const hashes = IDENTITIES.map(({ email }) => createHash('sha256').update(email).digest('hex')).join(',');
const env = { CORO_POPULATION_QA_INVITATIONS_RESEND: 'true', CORO_POPULATION_QA_INVITATIONS_RESEND_APPROVAL: APPROVAL, POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'false', POPULATION_CONTROLLED_LIVE_TEST_STOP: 'true', DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST: hashes };

test('requires exact one-time authority, STOP and both allowlisted aliases', () => {
  assert.doesNotThrow(() => assertAuthority(env));
  assert.throws(() => assertAuthority({ ...env, POPULATION_CONTROLLED_LIVE_TEST_STOP: 'false' }));
  assert.throws(() => assertAuthority({ ...env, DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST: hashes.split(',')[0] }));
});
test('requires exact active identities and reconciled v1 invitations', () => {
  const users = IDENTITIES.map((i) => ({ id: i.id, email: i.email, isActive: true, organizationId: TARGET.organizationId, clientId: TARGET.clientId, role: i.role, buildingIds: [TARGET.buildingId], populationPermissions: i.permissions }));
  const previous = IDENTITIES.map((i) => ({ idempotencyKey: i.previousEventKey, clientUserId: i.id, status: 'DELIVERED' }));
  assert.doesNotThrow(() => assertExactState(users, previous, []));
  assert.throws(() => assertExactState(users, [{ ...previous[0], status: 'FAILED' }, previous[1]], []));
  assert.throws(() => assertExactState(users, previous, [{ idempotencyKey: IDENTITIES[0].eventKey, clientUserId: 'wrong' }]));
});
test('source pins exactly two aliases, v2 keys and no SMS or live activation', () => {
  const source = require('node:fs').readFileSync(require.resolve('./population-qa-invitations-resend.cjs'), 'utf8');
  assert.match(source, /replace\(\/-v1\$\/, '-v2'\)/);
  assert.doesNotMatch(source, /sendSms|POPULATION_CONTROLLED_LIVE_TEST_ENABLED\s*=\s*['"]true/);
  assert.match(source, /CONTROLLED_QA_RESEND_FAILED_NO_RETRY/);
});
