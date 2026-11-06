'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { provision } = require('./population-controlled-test-provision.cjs');

function fixture() {
  const prisma = {
    user: { findUnique: async () => ({ id: 'private-id', organizationId: '916f54ec-af22-45e0-99db-a369d9630002', role: 'ADMIN', isActive: true }) },
    populationProgram: { findUnique: async () => ({ status: 'CONFIGURING', deliveryMode: 'SANDBOX', governanceMode: 'DUAL_CONTROL', registrationEnabled: false, smsEnabled: false, emailEnabled: false, _count: { subscribers: 0 } }) },
  };
  const setup = async (_prisma, input) => ({
    organizationId: input.organizationId, clientId: input.clientId, buildingId: input.buildingId,
    facilityProfileId: 'profile', scenarioId: 'scenario', zoneId: 'zone', programId: 'program', publicSlug: input.publicSlug,
  });
  return { prisma, setup };
}

test('provisions only an inactive empty governed program', async () => {
  const { prisma, setup } = fixture();
  const result = await provision(prisma, setup, {
    POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'false',
    POPULATION_CONTROLLED_LIVE_TEST_STOP: 'true',
  });
  assert.equal(result.execution, 'PASS');
  assert.equal(result.status, 'CONFIGURING');
  assert.equal(result.deliveryMode, 'SANDBOX');
  assert.equal(result.governanceMode, 'DUAL_CONTROL');
  assert.equal(result.subscriberCount, 0);
  assert.equal(result.smsEnabled, false);
  assert.equal(result.emailEnabled, false);
});

test('refuses before setup when LIVE or STOP protection is unsafe', async () => {
  const { prisma, setup } = fixture();
  let calls = 0;
  const counted = async (...args) => { calls += 1; return setup(...args); };
  await assert.rejects(() => provision(prisma, counted, { POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'true', POPULATION_CONTROLLED_LIVE_TEST_STOP: 'true' }));
  await assert.rejects(() => provision(prisma, counted, { POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'false', POPULATION_CONTROLLED_LIVE_TEST_STOP: 'false' }));
  assert.equal(calls, 0);
});
