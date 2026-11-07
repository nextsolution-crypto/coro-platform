const assert = require('node:assert/strict');
const test = require('node:test');
const { APPROVAL, TARGETS, assertAuthority, hash, updateContent } = require('./population-qa-invitation-allowlist.cjs');

const oldA = '1'.repeat(64);
const oldB = '2'.repeat(64);

test('requires explicit authority', () => {
  assert.throws(() => assertAuthority({}), /AUTHORITY_REQUIRED/);
  assert.doesNotThrow(() => assertAuthority({ CORO_POPULATION_QA_ALLOWLIST_RUN: 'true', CORO_POPULATION_QA_ALLOWLIST_APPROVAL: APPROVAL }));
});

test('preserves authorized entries and appends exactly the two fixed targets', () => {
  const result = updateContent(`A=1\nDEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST=${oldA},${oldB}\nB=2\n`);
  assert.match(result.content, new RegExp(`${oldA},${oldB},${hash(TARGETS[0])},${hash(TARGETS[1])}`));
  assert.deepEqual(result.evidence, { schemaVersion: 1, execution: 'PASS', previousCount: 2, addedCount: 2, finalCount: 4, exactTargetsPresent: true });
});

test('is idempotent', () => {
  const first = updateContent(`DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST=${oldA},${oldB}\n`);
  const second = updateContent(first.content);
  assert.equal(second.content, first.content);
  assert.equal(second.evidence.addedCount, 0);
});

test('rejects malformed, duplicate and unexpected cardinality configurations', () => {
  assert.throws(() => updateContent('DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST=bad\n'), /EXISTING_VALUE_INVALID/);
  assert.throws(() => updateContent(`DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST=${oldA}\nDEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST=${oldB}\n`), /DUPLICATE_KEY/);
  assert.throws(() => updateContent('A=1\n'), /FINAL_CARDINALITY_INVALID/);
  assert.throws(() => updateContent(`DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST=${oldA},${oldB},${'3'.repeat(64)}\n`), /FINAL_CARDINALITY_INVALID/);
});

test('sanitized evidence contains no address or hash', () => {
  const result = updateContent(`DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST=${oldA},${oldB}\n`);
  const evidence = JSON.stringify(result.evidence);
  assert.ok(TARGETS.every((value) => !evidence.includes(value)));
  assert.ok([oldA, oldB, ...TARGETS.map(hash)].every((value) => !evidence.includes(value)));
});
