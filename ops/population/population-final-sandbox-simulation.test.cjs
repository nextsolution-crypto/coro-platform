'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { APPROVAL, TARGET, actor, assertAuthority, assertFoundation } = require('./population-final-sandbox-simulation.cjs');
const env = { CORO_POPULATION_FINAL_SIMULATION: 'true', CORO_POPULATION_FINAL_SIMULATION_APPROVAL: APPROVAL, POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'false', POPULATION_CONTROLLED_LIVE_TEST_STOP: 'true' };
test('requires exact authority with LIVE disabled and STOP active', () => { assert.doesNotThrow(() => assertAuthority(env)); assert.throws(() => assertAuthority({ ...env, POPULATION_CONTROLLED_LIVE_TEST_STOP: 'false' })); assert.throws(() => assertAuthority({ ...env, POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'true' })); });
test('pins active simulated tenant, sandbox dual control and exact actors', () => {
  const program = { id: 'p', publicSlug: TARGET.programSlug, deliveryMode: 'SANDBOX', governanceMode: 'DUAL_CONTROL', rueFacilityProfileId: 'f' };
  const user = (id, role, permissions) => ({ id, isActive: true, organizationId: TARGET.organizationId, clientId: TARGET.clientId, role, buildingIds: [TARGET.buildingId], populationPermissions: permissions });
  const state = { environment: { status: 'ACTIVE', communicationMode: 'SIMULATE', externalProvidersDisabled: true }, program, scenario: { isActive: true, facilityProfileId: 'f' }, preparer: user(TARGET.preparerId, 'CLIENT_MANAGER', ['POPULATION_PREPARE', 'POPULATION_SEND']), approver: user(TARGET.approverId, 'CLIENT_CORPORATE', ['POPULATION_APPROVE']) };
  assert.doesNotThrow(() => assertFoundation(state));
  assert.throws(() => assertFoundation({ ...state, environment: { ...state.environment, communicationMode: 'BLOCK' } }));
  assert.throws(() => assertFoundation({ ...state, program: { ...program, deliveryMode: 'LIVE' } }));
  assert.equal(actor(state.preparer).sub, TARGET.preparerId);
});
test('source cannot activate LIVE or address a routable synthetic email', () => { const source = require('node:fs').readFileSync(require.resolve('./population-final-sandbox-simulation.cjs'), 'utf8'); assert.doesNotMatch(source, /deliveryMode:\s*['"]LIVE|POPULATION_CONTROLLED_LIVE_TEST_ENABLED\s*=\s*['"]true/); assert.match(source, /example\.invalid/); assert.match(source, /DEMO_SIMULATED/); });
