'use strict';

const { PrismaClient } = require('../../coro-backend/node_modules/@prisma/client');
const { dryRun, manifest, prepare, provision, reset, verify } = require('./demo-coro-fixtures.cjs');

const QA_OTHER_ORGANIZATION_ID = 'd3ffffff-0000-4000-8000-000000000001';
const QA_EXISTING_CLIENT_ID = 'd3ffffff-0000-4000-8000-000000000002';
const QA_EXISTING_BUILDING_ID = 'd3ffffff-0000-4000-8000-000000000003';
const QA_REFERENCE_USER_ID = 'd3ffffff-0000-4000-8000-000000000004';
const QA_EXISTING_PROJECT_IDS = [
  'd3ffffff-0000-4000-8000-000000000005',
  'd3ffffff-0000-4000-8000-000000000006',
];

function assertQaDatabase() {
  const url = process.env.DATABASE_URL || '';
  if (process.env.CORO_DEMO_QA_ACCEPTANCE !== 'true' || !url.includes('coro_demo_qa')) {
    throw new Error('QA_DATABASE_GUARD_FAILED');
  }
}

async function seedBaseline(prisma) {
  await prisma.organization.upsert({
    where: { id: manifest.target.organizationId },
    create: { id: manifest.target.organizationId, name: manifest.target.organizationName },
    update: { name: manifest.target.organizationName, isInternal: false, isActive: true },
  });
  await prisma.organization.upsert({
    where: { id: QA_OTHER_ORGANIZATION_ID },
    create: { id: QA_OTHER_ORGANIZATION_ID, name: 'Autre tenant QA' },
    update: {},
  });
  await prisma.user.upsert({
    where: { email: manifest.target.referenceEmail },
    create: {
      id: QA_REFERENCE_USER_ID,
      email: manifest.target.referenceEmail,
      password: 'qa-not-authenticatable',
      firstName: 'Démo',
      lastName: 'CORO',
      role: 'ADMIN',
      organizationId: manifest.target.organizationId,
    },
    update: { organizationId: manifest.target.organizationId, role: 'ADMIN', isActive: true },
  });
  await prisma.client.upsert({
    where: { id: QA_EXISTING_CLIENT_ID },
    create: {
      id: QA_EXISTING_CLIENT_ID,
      organizationId: manifest.target.organizationId,
      name: 'Groupe Immobilier Prémont',
      regulatoryRequirements: [],
    },
    update: {},
  });
  await prisma.building.upsert({
    where: { id: QA_EXISTING_BUILDING_ID },
    create: {
      id: QA_EXISTING_BUILDING_ID,
      organizationId: manifest.target.organizationId,
      clientId: QA_EXISTING_CLIENT_ID,
      name: 'Tour Prémont QA existante',
      address: 'Adresse QA préexistante',
      city: 'Montréal',
      province: 'QC',
    },
    update: {},
  });
  for (const [index, name] of ['PMU — Tour Prémont 2026', 'PCA — Tour Prémont 2026'].entries()) {
    await prisma.project.upsert({
      where: { id: QA_EXISTING_PROJECT_IDS[index] },
      create: {
        id: QA_EXISTING_PROJECT_IDS[index],
        organizationId: manifest.target.organizationId,
        clientId: QA_EXISTING_CLIENT_ID,
        buildingId: QA_EXISTING_BUILDING_ID,
        userId: QA_REFERENCE_USER_ID,
        name,
        documentType: index === 0 ? 'PMU' : 'PCA',
        status: 'IN_PROGRESS',
        year: 2026,
      },
      update: {},
    });
  }
}

async function main() {
  assertQaDatabase();
  const prisma = new PrismaClient();
  try {
    await seedBaseline(prisma);
    const initial = await dryRun(prisma);
    const collisionProject = manifest.projects[0];
    await prisma.project.create({
      data: {
        id: collisionProject.id,
        organizationId: manifest.target.organizationId,
        clientId: QA_EXISTING_CLIENT_ID,
        buildingId: QA_EXISTING_BUILDING_ID,
        userId: QA_REFERENCE_USER_ID,
        name: 'Collision QA contrôlée',
        documentType: 'PMU',
        status: 'DRAFT',
        year: 2026,
      },
    });
    let interruptedRunRolledBack = false;
    try {
      await provision(prisma);
    } catch (error) {
      const partialClients = await prisma.client.count({
        where: { id: { in: manifest.clients.map((entry) => entry.id) } },
      });
      interruptedRunRolledBack = error.message === 'FIXTURE_COLLISION_PROJECT' && partialClients === 0;
    } finally {
      await prisma.project.delete({ where: { id: collisionProject.id } });
    }
    if (!interruptedRunRolledBack) throw new Error('INTERRUPTED_RUN_NOT_ROLLED_BACK');
    const first = await provision(prisma);
    const second = await provision(prisma);
    const concurrent = await Promise.all([provision(prisma), provision(prisma)]);
    const verified = await verify(prisma);
    const activeRecords = await prisma.demoFixtureRecord.count({
      where: {
        organizationId: manifest.target.organizationId,
        fixtureNamespace: manifest.fixtureNamespace,
        state: 'ACTIVE',
      },
    });
    const expectedRecords = manifest.clients.length + manifest.buildings.length + manifest.projects.length +
      manifest.users.length + manifest.costRates.length +
      manifest.mandates.length + manifest.activities.length + manifest.tasks.length + manifest.timeEntries.length +
      manifest.employees.length + manifest.occupancyRecords.length + manifest.incidents.length + manifest.correctiveActions.length;
    if (!verified.ready || activeRecords !== expectedRecords) throw new Error('IDEMPOTENCY_VERIFICATION_FAILED');

    await prisma.user.update({
      where: { email: manifest.target.referenceEmail },
      data: { organizationId: QA_OTHER_ORGANIZATION_ID },
    });
    let wrongTenantRefused = false;
    try {
      await provision(prisma);
    } catch (error) {
      wrongTenantRefused = error.message === 'TARGET_NOT_VERIFIED_NO_WRITES';
    } finally {
      await prisma.user.update({
        where: { email: manifest.target.referenceEmail },
        data: { organizationId: manifest.target.organizationId },
      });
    }
    if (!wrongTenantRefused) throw new Error('OTHER_TENANT_NOT_REFUSED');

    const resetResult = await reset(prisma);
    const preserved = await prisma.project.count({ where: { id: { in: QA_EXISTING_PROJECT_IDS } } });
    const fixtureProjects = await prisma.project.count({
      where: { id: { in: manifest.projects.map((entry) => entry.id) } },
    });
    const environment = await prisma.demoEnvironment.findUnique({
      where: { organizationId: manifest.target.organizationId },
      select: { status: true, communicationMode: true },
    });
    if (preserved !== 2 || fixtureProjects !== 0 || environment?.status !== 'PAUSED' || environment.communicationMode !== 'BLOCK') {
      throw new Error('TARGETED_RESET_VERIFICATION_FAILED');
    }
    const prepared = await prepare(prisma);
    const preparedEnvironment = await prisma.demoEnvironment.findUnique({
      where: { organizationId: manifest.target.organizationId },
      select: { status: true, communicationMode: true, externalProvidersDisabled: true },
    });
    const preparedProjects = await prisma.project.count({
      where: { id: { in: manifest.projects.map((entry) => entry.id) } },
    });
    if (
      prepared.registered !== expectedRecords ||
      preparedProjects !== manifest.projects.length ||
      preparedEnvironment?.status !== 'ACTIVE' ||
      preparedEnvironment.communicationMode !== 'SIMULATE' ||
      !preparedEnvironment.externalProvidersDisabled
    ) throw new Error('PREPARE_USABILITY_VERIFICATION_FAILED');
    await reset(prisma);
    const finalEnvironment = await prisma.demoEnvironment.findUnique({
      where: { organizationId: manifest.target.organizationId },
      select: { status: true, communicationMode: true, externalProvidersDisabled: true },
    });
    if (finalEnvironment?.status !== 'PAUSED' || finalEnvironment.communicationMode !== 'BLOCK' || !finalEnvironment.externalProvidersDisabled)
      throw new Error('FINAL_RESET_PROTECTION_FAILED');
    process.stdout.write(`${JSON.stringify({
      schemaVersion: 1,
      execution: 'PASS',
      initialRegistered: initial.registered,
      firstRegistered: first.registered,
      secondRegistered: second.registered,
      concurrentRegistered: concurrent.map((entry) => entry.registered),
      expectedRecords,
      wrongTenantRefused,
      interruptedRunRolledBack,
      preexistingProjectsPreserved: preserved,
      fixtureProjectsAfterReset: fixtureProjects,
      environmentAfterReset: environment,
      environmentAfterPrepare: preparedEnvironment,
      preparedProjects,
      finalEnvironmentAfterReset: finalEnvironment,
      resetRegistered: resetResult.registered,
    })}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: 'FAILED', reason: error.message })}\n`);
    process.exitCode = 1;
  });
}

module.exports = { assertQaDatabase, seedBaseline };
