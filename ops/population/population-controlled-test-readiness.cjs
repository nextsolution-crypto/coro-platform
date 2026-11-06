'use strict';

const crypto = require('node:crypto');

const TARGET_ORGANIZATION_ID = '916f54ec-af22-45e0-99db-a369d9630002';
const TARGET_CLIENT_ID = 'd3000001-0000-4000-8000-000000000002';
const TARGET_ACTOR_EMAIL = 'demo@getcoro.io';
const TARGET_BUILDING_ID = '6a1b6f2e-38b2-5f41-a740-48252fd11224';
const TARGET_PUBLIC_SLUG = 'coro-sp-ops-04b-test';
const TARGET_ENVIRONMENT = 'CORO_DEMO_SP_OPS_04B';
const APPROVED_SMS_SENDER = '+18335886812';
const APPROVED_EMAIL_SENDER = 'info@getcoro.io';
const SMS_MESSAGE =
  'EXERCICE / TEST CORO — AUCUNE URGENCE RÉELLE\nEssai technique Sentinelle Population pour un événement fictif. Aucune action requise.';
const EMAIL_MESSAGE =
  'EXERCICE / TEST CORO — AUCUNE URGENCE RÉELLE\n\nCeci est un essai technique de Sentinelle Population concernant un événement industriel fictif.\n\nAucune action n’est requise.\n\nCe message permet de vérifier le fonctionnement des notifications et leur traçabilité dans CORO.';
const CANDIDATE_ACCOUNTS = Object.freeze([
  { label: 'PREPARER_A', email: 'demo-client@getcoro.io' },
  { label: 'APPROVER_B', email: 'demo-clientcorp@getcoro.io' },
]);

function fingerprint(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function summarizeProgram(program) {
  return {
    programFingerprint: fingerprint(program.id),
    buildingFingerprint: fingerprint(program.rueFacilityProfile.building.id),
    status: program.status,
    deliveryMode: program.deliveryMode,
    governanceMode: program.governanceMode,
    registrationEnabled: program.registrationEnabled,
    smsEnabled: program.smsEnabled,
    emailEnabled: program.emailEnabled,
    subscriberCount: program._count.subscribers,
  };
}

function summarizeCandidate(candidate, user) {
  if (!user) {
    return { label: candidate.label, exists: false, eligible: false };
  }
  return {
    label: candidate.label,
    exists: true,
    active: user.isActive === true,
    role: user.role,
    tenantMatches: user.organizationId === TARGET_ORGANIZATION_ID,
    clientMatches: user.clientId === TARGET_CLIENT_ID,
    populationPermissions: [...user.populationPermissions].sort(),
    assignedBuildingCount: user.buildingIds.length,
    targetBuildingAssigned: user.buildingIds.includes(TARGET_BUILDING_ID),
    eligible:
      user.isActive === true &&
      user.organizationId === TARGET_ORGANIZATION_ID &&
      user.clientId === TARGET_CLIENT_ID,
  };
}

function runtimeBudgetStatus(environment) {
  const required = [
    'POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS',
    'POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT',
    'POPULATION_CONTROLLED_LIVE_TEST_EMAIL_CAD_MICROS_PER_MESSAGE',
  ];
  const presence = Object.fromEntries(
    required.map((name) => [name, environment[name]?.trim() ? 'SET' : 'UNSET']),
  );
  return {
    presence,
    complete: required.every((name) => presence[name] === 'SET'),
  };
}

function presence(environment, name) {
  return environment[name]?.trim() ? 'SET' : 'UNSET';
}

function exactMatch(environment, name, expected) {
  const value = environment[name]?.trim();
  return !value ? 'UNSET' : value === expected ? 'MATCH' : 'NO_MATCH';
}

function runtimeSafetyStatus(environment) {
  return {
    brevoApiKey: presence(environment, 'BREVO_API_KEY'),
    smsSender: exactMatch(environment, 'BREVO_SMS_SENDER', APPROVED_SMS_SENDER),
    emailSender: exactMatch(
      environment,
      'BREVO_SENDER_EMAIL',
      APPROVED_EMAIL_SENDER,
    ),
    emailWebhookCredentialPresence: presence(
      environment,
      'POPULATION_BREVO_WEBHOOK_SECRET',
    ),
    smsWebhookCredentialPresence: presence(
      environment,
      'POPULATION_BREVO_SMS_WEBHOOK_SECRET',
    ),
    emailSenderAttested:
      environment.POPULATION_BREVO_EMAIL_SENDER_VERIFIED === 'true',
    smsTfnAttested: environment.POPULATION_SMS_TFN_APPROVED === 'true',
    controlledLiveEnabled:
      environment.POPULATION_CONTROLLED_LIVE_TEST_ENABLED === 'true',
    stopActive: environment.POPULATION_CONTROLLED_LIVE_TEST_STOP === 'true',
    emailDestinationFingerprint: presence(
      environment,
      'POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256',
    ),
    smsDestinationFingerprint: presence(
      environment,
      'POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256',
    ),
  };
}

function calculateMessageBudget(environment, costTools) {
  const budget = runtimeBudgetStatus(environment);
  if (!budget.complete || !costTools) {
    return { ...budget, calculation: 'NOT_VERIFIED' };
  }
  const sms = costTools.estimateSmsSegments(SMS_MESSAGE);
  const estimate = costTools.estimateControlledCampaignCost([
    { channel: 'SMS', messageSnapshot: SMS_MESSAGE },
    { channel: 'EMAIL', messageSnapshot: EMAIL_MESSAGE },
  ]);
  return {
    ...budget,
    calculation: 'PASS',
    smsEncoding: sms.encoding,
    smsUnits: sms.units,
    smsSegments: estimate.smsSegments,
    emailMessages: estimate.emailMessages,
    estimatedCadMicros: estimate.estimatedCadMicros,
    budgetCadMicros: estimate.budgetCadMicros,
  };
}

async function runReadOnly(
  prisma,
  setupControlledTest,
  environment = process.env,
  costTools = null,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');

      const [organization, client, actor, programs, candidates] = await Promise.all([
        tx.organization.findUnique({
          where: { id: TARGET_ORGANIZATION_ID },
          select: { id: true, name: true, isActive: true, isInternal: true },
        }),
        tx.client.findUnique({
          where: { id: TARGET_CLIENT_ID },
          select: { id: true, name: true, organizationId: true, isActive: true },
        }),
        tx.user.findUnique({
          where: { email: TARGET_ACTOR_EMAIL },
          select: { id: true, organizationId: true, role: true, isActive: true },
        }),
        tx.populationProgram.findMany({
          where: {
            rueFacilityProfile: { building: { organizationId: TARGET_ORGANIZATION_ID } },
          },
          select: {
            id: true,
            status: true,
            deliveryMode: true,
            governanceMode: true,
            registrationEnabled: true,
            smsEnabled: true,
            emailEnabled: true,
            rueFacilityProfile: {
              select: { building: { select: { id: true } } },
            },
            _count: { select: { subscribers: true } },
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
        Promise.all(
          CANDIDATE_ACCOUNTS.map((candidate) =>
            tx.clientUser.findUnique({
              where: { email: candidate.email },
              select: {
                isActive: true,
                role: true,
                organizationId: true,
                clientId: true,
                populationPermissions: true,
                buildingIds: true,
              },
            }),
          ),
        ),
      ]);

      if (!organization || !client || !actor) {
        throw new Error('CONTROLLED_TEST_AUTHORITY_NOT_FOUND');
      }

      const dryRun = await setupControlledTest(tx, {
        allowSetup: 'true',
        environment: TARGET_ENVIRONMENT,
        organizationId: TARGET_ORGANIZATION_ID,
        clientId: TARGET_CLIENT_ID,
        allowedClientId: TARGET_CLIENT_ID,
        buildingId: TARGET_BUILDING_ID,
        publicSlug: TARGET_PUBLIC_SLUG,
        actorUserId: actor.id,
        dryRun: 'true',
      });

      const candidateAccounts = CANDIDATE_ACCOUNTS.map((candidate, index) =>
        summarizeCandidate(candidate, candidates[index]),
      );
      const budget = calculateMessageBudget(environment, costTools);

      return {
        schemaVersion: 1,
        execution: 'PASS',
        readOnly: true,
        organization: {
          id: organization.id,
          name: organization.name,
          active: organization.isActive === true,
          internal: organization.isInternal === true,
        },
        client: {
          id: client.id,
          name: client.name,
          active: client.isActive === true,
          tenantMatches: client.organizationId === TARGET_ORGANIZATION_ID,
        },
        actor: {
          active: actor.isActive === true,
          role: actor.role,
          tenantMatches: actor.organizationId === TARGET_ORGANIZATION_ID,
        },
        existingPrograms: programs.map(summarizeProgram),
        existingProgramCount: programs.length,
        plannedResources: {
          buildingId: dryRun.buildingId,
          facilityProfileId: dryRun.facilityProfileId,
          scenarioId: dryRun.scenarioId,
          zoneId: dryRun.zoneId,
          programId: dryRun.programId,
          publicSlug: dryRun.publicSlug,
          status: dryRun.programStatus,
          deliveryMode: dryRun.deliveryMode,
          governanceMode: dryRun.governanceMode,
          subscriberCount: dryRun.subscriberCount,
        },
        collisionCheck: 'PASS',
        candidates: candidateAccounts,
        governanceReady:
          candidateAccounts.some((candidate) =>
            candidate.populationPermissions?.includes('POPULATION_PREPARE'),
          ) &&
          candidateAccounts.some((candidate) =>
            candidate.populationPermissions?.includes('POPULATION_APPROVE'),
          ),
        runtimeSafety: runtimeSafetyStatus(environment),
        budget,
        proposedMessages: {
          sms: SMS_MESSAGE,
          email: EMAIL_MESSAGE,
        },
      };
    },
    { timeout: 60_000 },
  );
}

async function main() {
  if (process.env.CORO_POPULATION_CONTROLLED_TEST_READINESS_RUN !== 'true') {
    throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  }
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const { setupPopulationControlledTest } = require(
    '/app/dist/src/admin/population-controlled-test-setup.js'
  );
  const costTools = require(
    '/app/dist/src/population/population-controlled-test-cost.js'
  );
  const prisma = new PrismaClient();
  try {
    process.stdout.write(
      `${JSON.stringify(await runReadOnly(prisma, setupPopulationControlledTest, process.env, costTools))}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  CANDIDATE_ACCOUNTS,
  EMAIL_MESSAGE,
  SMS_MESSAGE,
  TARGET_BUILDING_ID,
  TARGET_CLIENT_ID,
  TARGET_ENVIRONMENT,
  TARGET_ORGANIZATION_ID,
  TARGET_PUBLIC_SLUG,
  calculateMessageBudget,
  exactMatch,
  fingerprint,
  runReadOnly,
  runtimeBudgetStatus,
  runtimeSafetyStatus,
  summarizeCandidate,
  summarizeProgram,
};

if (
  require.main === module ||
  process.env.CORO_POPULATION_CONTROLLED_TEST_READINESS_RUN === 'true'
) {
  main().catch(() => {
    process.stdout.write(
      '{"schemaVersion":1,"execution":"FAILED","readOnly":true}\n',
    );
    process.exitCode = 1;
  });
}
