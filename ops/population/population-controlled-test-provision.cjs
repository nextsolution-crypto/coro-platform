'use strict';

const TARGET_ORGANIZATION_ID = '916f54ec-af22-45e0-99db-a369d9630002';
const TARGET_CLIENT_ID = 'd3000001-0000-4000-8000-000000000002';
const TARGET_ACTOR_EMAIL = 'demo@getcoro.io';
const TARGET_BUILDING_ID = '6a1b6f2e-38b2-5f41-a740-48252fd11224';
const TARGET_PUBLIC_SLUG = 'coro-sp-ops-04b-test';
const TARGET_ENVIRONMENT = 'CORO_DEMO_SP_OPS_04B';

async function provision(prisma, setupControlledTest, environment = process.env) {
  if (environment.POPULATION_CONTROLLED_LIVE_TEST_ENABLED === 'true') {
    throw new Error('CONTROLLED_LIVE_MUST_REMAIN_DISABLED');
  }
  if (environment.POPULATION_CONTROLLED_LIVE_TEST_STOP !== 'true') {
    throw new Error('CONTROLLED_TEST_STOP_MUST_REMAIN_ACTIVE');
  }

  const actor = await prisma.user.findUnique({
    where: { email: TARGET_ACTOR_EMAIL },
    select: { id: true, organizationId: true, role: true, isActive: true },
  });
  if (
    !actor ||
    !actor.isActive ||
    actor.organizationId !== TARGET_ORGANIZATION_ID ||
    !['ADMIN', 'SUPER_ADMIN'].includes(actor.role)
  ) {
    throw new Error('CONTROLLED_TEST_ADMIN_NOT_ELIGIBLE');
  }

  const result = await setupControlledTest(prisma, {
    allowSetup: 'true',
    environment: TARGET_ENVIRONMENT,
    organizationId: TARGET_ORGANIZATION_ID,
    clientId: TARGET_CLIENT_ID,
    allowedClientId: TARGET_CLIENT_ID,
    buildingId: TARGET_BUILDING_ID,
    publicSlug: TARGET_PUBLIC_SLUG,
    actorUserId: actor.id,
    dryRun: 'false',
  });
  const program = await prisma.populationProgram.findUnique({
    where: { id: result.programId },
    select: {
      status: true,
      deliveryMode: true,
      governanceMode: true,
      registrationEnabled: true,
      smsEnabled: true,
      emailEnabled: true,
      _count: { select: { subscribers: true } },
    },
  });
  if (
    !program ||
    program.status !== 'CONFIGURING' ||
    program.deliveryMode !== 'SANDBOX' ||
    program.governanceMode !== 'DUAL_CONTROL' ||
    program.registrationEnabled ||
    program.smsEnabled ||
    program.emailEnabled ||
    program._count.subscribers !== 0
  ) {
    throw new Error('CONTROLLED_TEST_POSTCONDITION_FAILED');
  }
  return {
    schemaVersion: 1,
    execution: 'PASS',
    provisioned: true,
    organizationId: result.organizationId,
    clientId: result.clientId,
    buildingId: result.buildingId,
    facilityProfileId: result.facilityProfileId,
    scenarioId: result.scenarioId,
    zoneId: result.zoneId,
    programId: result.programId,
    publicSlug: result.publicSlug,
    status: program.status,
    deliveryMode: program.deliveryMode,
    governanceMode: program.governanceMode,
    registrationEnabled: program.registrationEnabled,
    smsEnabled: program.smsEnabled,
    emailEnabled: program.emailEnabled,
    subscriberCount: program._count.subscribers,
    controlledLiveEnabled: false,
    stopActive: true,
  };
}

async function main() {
  if (process.env.CORO_POPULATION_CONTROLLED_TEST_PROVISION_RUN !== 'true') {
    throw new Error('EXPLICIT_PROVISION_SWITCH_REQUIRED');
  }
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const { setupPopulationControlledTest } = require(
    '/app/dist/src/admin/population-controlled-test-setup.js'
  );
  const prisma = new PrismaClient();
  try {
    process.stdout.write(`${JSON.stringify(await provision(prisma, setupPopulationControlledTest))}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { provision };

if (require.main === module || process.env.CORO_POPULATION_CONTROLLED_TEST_PROVISION_RUN === 'true') {
  main().catch(() => {
    process.stdout.write('{"schemaVersion":1,"execution":"FAILED"}\n');
    process.exitCode = 1;
  });
}
