'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  TARGET_BUILDING_ID,
  TARGET_CLIENT_ID,
  TARGET_ORGANIZATION_ID,
  runReadOnly,
  runtimeBudgetStatus,
  runtimeSafetyStatus,
} = require('./population-controlled-test-readiness.cjs');

function databaseFixture() {
  const statements = [];
  const tx = {
    $executeRawUnsafe: async (statement) => statements.push(statement),
    organization: {
      findUnique: async () => ({
        id: TARGET_ORGANIZATION_ID,
        name: 'CORO Demo',
        isActive: true,
        isInternal: false,
      }),
    },
    client: {
      findUnique: async () => ({
        id: TARGET_CLIENT_ID,
        name: 'Ateliers Demo',
        organizationId: TARGET_ORGANIZATION_ID,
        isActive: true,
      }),
    },
    user: {
      findUnique: async () => ({
        id: 'actor-private-id',
        organizationId: TARGET_ORGANIZATION_ID,
        role: 'ADMIN',
        isActive: true,
      }),
    },
    populationProgram: { findMany: async () => [] },
    clientUser: {
      findUnique: async ({ where }) => ({
        isActive: true,
        role: where.email.includes('clientcorp')
          ? 'CLIENT_CORPORATE'
          : 'CLIENT_MANAGER',
        organizationId: TARGET_ORGANIZATION_ID,
        clientId: TARGET_CLIENT_ID,
        populationPermissions: where.email.includes('clientcorp')
          ? ['POPULATION_APPROVE']
          : ['POPULATION_PREPARE'],
        buildingIds: [TARGET_BUILDING_ID],
      }),
    },
  };
  return {
    statements,
    prisma: { $transaction: async (callback) => callback(tx) },
  };
}

test('executes the real setup dry-run inside a read-only transaction', async () => {
  const fixture = databaseFixture();
  let setupInput;
  const result = await runReadOnly(
    fixture.prisma,
    async (_tx, input) => {
      setupInput = input;
      return {
        buildingId: TARGET_BUILDING_ID,
        facilityProfileId: 'profile-id',
        scenarioId: 'scenario-id',
        zoneId: 'zone-id',
        programId: 'program-id',
        publicSlug: 'coro-sp-ops-04b-test',
        programStatus: 'CONFIGURING',
        deliveryMode: 'SANDBOX',
        governanceMode: 'DUAL_CONTROL',
        subscriberCount: 0,
      };
    },
    {
      POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS: '100',
      POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT: '75000',
      POPULATION_CONTROLLED_LIVE_TEST_EMAIL_CAD_MICROS_PER_MESSAGE: '1000',
    },
    {
      estimateSmsSegments: () => ({ encoding: 'UCS_2', units: 132, segments: 2 }),
      estimateControlledCampaignCost: () => ({
        smsSegments: 2,
        emailMessages: 1,
        estimatedCadMicros: 151000,
        budgetCadMicros: 1000000,
      }),
    },
  );

  assert.deepEqual(fixture.statements, ['SET TRANSACTION READ ONLY']);
  assert.equal(setupInput.dryRun, 'true');
  assert.equal(setupInput.clientId, TARGET_CLIENT_ID);
  assert.equal(result.readOnly, true);
  assert.equal(result.collisionCheck, 'PASS');
  assert.equal(result.governanceReady, true);
  assert.equal(result.budget.complete, true);
  assert.equal(result.budget.calculation, 'PASS');
  assert.equal(result.budget.smsEncoding, 'UCS_2');
  assert.equal(JSON.stringify(result).includes('actor-private-id'), false);
  assert.equal(JSON.stringify(result).includes('@getcoro.io'), false);
});

test('reports safe runtime state without returning configured values', () => {
  const status = runtimeSafetyStatus({
    BREVO_API_KEY: 'private',
    BREVO_SMS_SENDER: '+18335886812',
    BREVO_SENDER_EMAIL: 'info@getcoro.io',
    POPULATION_BREVO_WEBHOOK_SECRET: 'private-email-secret',
    POPULATION_BREVO_SMS_WEBHOOK_SECRET: 'private-sms-secret',
    POPULATION_BREVO_EMAIL_SENDER_VERIFIED: 'true',
    POPULATION_SMS_TFN_APPROVED: 'true',
    POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'false',
    POPULATION_CONTROLLED_LIVE_TEST_STOP: 'true',
  });
  assert.equal(status.brevoApiKey, 'SET');
  assert.equal(status.smsSender, 'MATCH');
  assert.equal(status.emailSender, 'MATCH');
  assert.equal(status.controlledLiveEnabled, false);
  assert.equal(status.stopActive, true);
  assert.equal(JSON.stringify(status).includes('private'), false);

  const forbiddenEvidence =
    /@getcoro\.io|password|secret|token|access[_-]?key|private[_-]?key|actor-private-id/i;
  const sanitizedEvidence = JSON.stringify({
    schemaVersion: 1,
    execution: 'PASS',
    readOnly: true,
    collisionCheck: 'PASS',
    runtimeSafety: status,
  });

  assert.equal(status.emailWebhookCredentialPresence, 'SET');
  assert.equal(status.smsWebhookCredentialPresence, 'SET');
  assert.equal(forbiddenEvidence.test(sanitizedEvidence), false);
  assert.equal(
    forbiddenEvidence.test(
      JSON.stringify({ runtimeSafety: status, leakedValue: 'private-secret' }),
    ),
    true,
  );
});

test('reports incomplete budget configuration without exposing values', () => {
  assert.deepEqual(runtimeBudgetStatus({}), {
    presence: {
      POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS: 'UNSET',
      POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT:
        'UNSET',
      POPULATION_CONTROLLED_LIVE_TEST_EMAIL_CAD_MICROS_PER_MESSAGE: 'UNSET',
    },
    complete: false,
  });
});

test('production workflow exposes no provisioning or free-form command input', () => {
  const workflow = fs.readFileSync(
    path.resolve(
      __dirname,
      '../../.github/workflows/production-population-controlled-test-readiness.yml',
    ),
    'utf8',
  );
  assert.match(workflow, /workflow_dispatch:\s*\n\s*\npermissions:/);
  assert.match(workflow, /coro-production-deployment\.lock/);
  assert.match(workflow, /population-controlled-test-readiness\.cjs/);
  assert.doesNotMatch(workflow, /DRY_RUN=false/);
  assert.doesNotMatch(workflow, /admin:population-controlled-test-setup/);
  assert.doesNotMatch(workflow, /inputs:/);
});
