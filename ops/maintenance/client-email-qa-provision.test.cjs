'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { assertApproval, assertFoundation } = require('./client-email-qa-provision.cjs');

const foundation = {
  organization: { isActive: true, name: 'CORO QA Production Email Acceptance' },
  client: { isActive: true, organizationId: '00000000-0000-4000-8000-00000000e101', name: 'Client QA — courriels transactionnels' },
  building: { isActive: true, organizationId: '00000000-0000-4000-8000-00000000e101', clientId: '00000000-0000-4000-8000-00000000e102', name: 'Bâtiment QA — courriels transactionnels' },
  existing: null,
};

test('requires exact two-part approval', () => {
  assert.throws(() => assertApproval({}), /approval/);
  assert.doesNotThrow(() => assertApproval({ CLIENT_EMAIL_QA_PROVISION_RUN: 'true', CLIENT_EMAIL_QA_PROVISION_APPROVAL: 'PROVISION_CLIENT_EMAIL_QA_MANAGER_2026_10_26' }));
});
test('accepts only the exact isolated QA foundation', () => {
  assert.doesNotThrow(() => assertFoundation(foundation));
  assert.throws(() => assertFoundation({ ...foundation, existing: { id: 'collision' } }), /already assigned/);
  assert.throws(() => assertFoundation({ ...foundation, building: { ...foundation.building, clientId: 'other' } }), /building mismatch/);
});
