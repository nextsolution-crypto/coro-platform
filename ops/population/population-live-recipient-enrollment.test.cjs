'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { APPROVAL, TARGET, assertAuthority, assertFoundation, assertOperator, safeErrorCode } = require('./population-live-recipient-enrollment.cjs');

const safeEnv = { CORO_POPULATION_RECIPIENT_ENROLLMENT: 'true', CORO_POPULATION_RECIPIENT_ENROLLMENT_APPROVAL: APPROVAL, POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'false', POPULATION_CONTROLLED_LIVE_TEST_STOP: 'true' };

test('requires the exact authority and safe controlled-live state', () => {
  assert.doesNotThrow(() => assertAuthority('OPEN', safeEnv));
  assert.throws(() => assertAuthority('OPEN', { ...safeEnv, POPULATION_CONTROLLED_LIVE_TEST_STOP: 'false' }), /SAFETY_STATE/);
  assert.throws(() => assertAuthority('OPEN', { ...safeEnv, POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'true' }), /SAFETY_STATE/);
  assert.throws(() => assertAuthority('OPEN', { ...safeEnv, CORO_POPULATION_RECIPIENT_ENROLLMENT_APPROVAL: 'wrong' }), /APPROVAL/);
});

test('rejects another tenant, client, building or governance mode', () => {
  const environment = { status: 'ACTIVE', communicationMode: 'SIMULATE', externalProvidersDisabled: true };
  const program = { publicSlug: 'coro-sp-ops-04b-test', deliveryMode: 'SANDBOX', governanceMode: 'DUAL_CONTROL', rueFacilityProfile: { buildingId: '6a1b6f2e-38b2-5f41-a740-48252fd11224', building: { clientId: 'd3000001-0000-4000-8000-000000000002', organizationId: '916f54ec-af22-45e0-99db-a369d9630002' } } };
  assert.doesNotThrow(() => assertFoundation(environment, program));
  assert.throws(() => assertFoundation(environment, { ...program, governanceMode: 'STANDARD' }), /GOVERNANCE/);
  assert.throws(() => assertFoundation(environment, { ...program, rueFacilityProfile: { ...program.rueFacilityProfile, building: { ...program.rueFacilityProfile.building, organizationId: 'other' } } }), /SCOPE/);
});

test('requires the exact active internal operator authority', () => {
  const operator = { id: 'operator-1', email: TARGET.operatorEmail, organizationId: TARGET.organizationId, isActive: true, role: 'ADMIN' };
  assert.doesNotThrow(() => assertOperator(operator));
  assert.throws(() => assertOperator({ ...operator, email: 'other@example.test' }), /OPERATOR_INVALID/);
  assert.throws(() => assertOperator({ ...operator, organizationId: 'other' }), /OPERATOR_INVALID/);
  assert.throws(() => assertOperator({ ...operator, isActive: false }), /OPERATOR_INVALID/);
  assert.throws(() => assertOperator({ ...operator, role: 'OPERATOR' }), /OPERATOR_INVALID/);
});

test('only exposes allowlisted error codes', () => {
  assert.equal(safeErrorCode(new Error('QA_PROGRAM_SCOPE_INVALID')), 'QA_PROGRAM_SCOPE_INVALID');
  assert.equal(safeErrorCode(new Error('secret=value@example.test')), 'UNCLASSIFIED_ENROLLMENT_FAILURE');
});
