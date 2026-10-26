'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { assertApproval, assertTarget } = require('./client-email-qa-finalize.cjs');
test('requires exact approval', () => {
  assert.throws(() => assertApproval({}), /approval/);
  assert.doesNotThrow(() => assertApproval({ CLIENT_EMAIL_QA_FINALIZE_RUN: 'true', CLIENT_EMAIL_QA_FINALIZE_APPROVAL: 'FINALIZE_CLIENT_EMAIL_QA_2026_10_26' }));
});
test('accepts only the exact scoped QA identity', () => {
  const user = { id:'7a366320-0505-4280-a915-e3e784d22407', organizationId:'00000000-0000-4000-8000-00000000e101', clientId:'00000000-0000-4000-8000-00000000e102', role:'CLIENT_MANAGER', buildingIds:['00000000-0000-4000-8000-00000000e103'] };
  assert.doesNotThrow(() => assertTarget(user));
  assert.throws(() => assertTarget({ ...user, buildingIds:['other'] }), /mismatch/);
});
test('uses the canonical Prisma delegates and user foreign keys', () => {
  const source = fs.readFileSync(require.resolve('./client-email-qa-finalize.cjs'), 'utf8');
  assert.match(source, /tx\.magicLink\.updateMany\(\{ where: \{ userId: USER_ID/);
  assert.match(source, /tx\.clientTrustedDevice\.deleteMany\(\{ where: \{ userId: USER_ID/);
  assert.doesNotMatch(source, /clientMagicLink|clientTrustedDevice\.deleteMany\(\{ where: \{ clientUserId/);
});
