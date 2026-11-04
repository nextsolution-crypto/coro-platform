'use strict';

const crypto = require('node:crypto');
const manifest = require('./demo-coro-fixture-manifest.json');

const COMMANDS = new Set(['dry-run', 'provision', 'verify', 'prepare', 'reset']);

function fingerprint(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function assertManifest() {
  if (manifest.target.organizationId !== '916f54ec-af22-45e0-99db-a369d9630002') {
    throw new Error('UNEXPECTED_TARGET_ORGANIZATION');
  }
  if (manifest.target.referenceEmail !== 'demo@getcoro.io') {
    throw new Error('UNEXPECTED_REFERENCE_IDENTITY');
  }
  const ids = [
    ...manifest.clients,
    ...manifest.buildings,
    ...manifest.projects,
    ...manifest.mandates,
    ...manifest.activities,
    ...manifest.tasks,
    ...manifest.timeEntries,
  ].map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_FIXTURE_ID');
}

async function assertTarget(tx) {
  const identity = await tx.user.findUnique({
    where: { email: manifest.target.referenceEmail },
    select: {
      id: true,
      organizationId: true,
      role: true,
      isActive: true,
      organization: { select: { name: true, isActive: true, isInternal: true } },
    },
  });
  const homonym = await tx.clientUser.findUnique({
    where: { email: manifest.target.referenceEmail },
    select: { id: true },
  });
  if (
    !identity || homonym || identity.organizationId !== manifest.target.organizationId ||
    identity.organization.name !== manifest.target.organizationName || identity.role !== 'ADMIN' ||
    !identity.isActive || !identity.organization.isActive || identity.organization.isInternal
  ) throw new Error('TARGET_NOT_VERIFIED_NO_WRITES');
  return identity;
}

async function existingState(tx) {
  const namespace = manifest.fixtureNamespace;
  const records = await tx.demoFixtureRecord.findMany({
    where: { organizationId: manifest.target.organizationId, fixtureNamespace: namespace },
    select: { fixtureKey: true, entityType: true, entityId: true, state: true },
    orderBy: [{ entityType: 'asc' }, { fixtureKey: 'asc' }],
  });
  return {
    namespace,
    expected: {
      clients: manifest.clients.length,
      buildings: manifest.buildings.length,
      projects: manifest.projects.length,
      mandates: manifest.mandates.length,
      activities: manifest.activities.length,
      tasks: manifest.tasks.length,
      timeEntries: manifest.timeEntries.length,
    },
    registered: records.length,
    records,
  };
}

function sanitizedSummary(command, state, extra = {}) {
  return {
    schemaVersion: 1,
    command,
    targetOrganizationFingerprint: fingerprint(manifest.target.organizationId),
    fixtureNamespace: manifest.fixtureNamespace,
    ...state,
    ...extra,
  };
}

async function dryRun(prisma) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    await assertTarget(tx);
    const state = await existingState(tx);
    return sanitizedSummary('dry-run', state, { mutation: false });
  });
}

async function register(tx, fixtureKey, entityType, entityId, baseline) {
  const existing = await tx.demoFixtureRecord.findUnique({
    where: {
      organizationId_fixtureNamespace_fixtureKey: {
        organizationId: manifest.target.organizationId,
        fixtureNamespace: manifest.fixtureNamespace,
        fixtureKey,
      },
    },
  });
  if (existing && (existing.entityType !== entityType || existing.entityId !== entityId)) {
    throw new Error('FIXTURE_REGISTRY_COLLISION');
  }
  return tx.demoFixtureRecord.upsert({
    where: {
      organizationId_fixtureNamespace_fixtureKey: {
        organizationId: manifest.target.organizationId,
        fixtureNamespace: manifest.fixtureNamespace,
        fixtureKey,
      },
    },
    create: {
      organizationId: manifest.target.organizationId,
      fixtureNamespace: manifest.fixtureNamespace,
      fixtureKey,
      entityType,
      entityId,
      baseline,
    },
    update: { state: 'ACTIVE' },
  });
}

async function provision(prisma) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`demo-fixtures:${manifest.target.organizationId}`}, 0))`;
    const identity = await assertTarget(tx);
    await tx.demoEnvironment.upsert({
      where: { organizationId: manifest.target.organizationId },
      create: {
        organizationId: manifest.target.organizationId,
        fixtureNamespace: manifest.fixtureNamespace,
        referenceEmailHash: fingerprint(manifest.target.referenceEmail),
        status: 'ACTIVE',
        communicationMode: 'SIMULATE',
        externalProvidersDisabled: true,
      },
      update: {
        fixtureNamespace: manifest.fixtureNamespace,
        referenceEmailHash: fingerprint(manifest.target.referenceEmail),
        status: 'ACTIVE',
        communicationMode: 'SIMULATE',
        externalProvidersDisabled: true,
        lockVersion: { increment: 1 },
      },
    });
    for (const client of manifest.clients) {
      const row = await tx.client.upsert({
        where: { id: client.id },
        create: {
          id: client.id,
          organizationId: manifest.target.organizationId,
          name: client.name,
          sector: client.sector,
          city: client.city,
          province: client.province,
          contactEmail: `${client.key}@example.invalid`,
          regulatoryRequirements: [],
        },
        update: {},
      });
      if (row.organizationId !== manifest.target.organizationId || row.name !== client.name) throw new Error('FIXTURE_COLLISION_CLIENT');
      await register(tx, client.key, 'Client', row.id, { name: client.name });
    }
    for (const building of manifest.buildings) {
      const client = manifest.clients.find((entry) => entry.key === building.clientKey);
      if (!client) throw new Error('INVALID_BUILDING_CLIENT_REFERENCE');
      const row = await tx.building.upsert({
        where: { id: building.id },
        create: {
          id: building.id,
          organizationId: manifest.target.organizationId,
          clientId: client.id,
          name: building.name,
          address: building.address,
          city: building.city,
          province: building.province,
          postalCode: building.postalCode,
          buildingType: building.buildingType,
          latitude: building.latitude,
          longitude: building.longitude,
          timeZoneVerified: true,
        },
        update: {},
      });
      if (row.organizationId !== manifest.target.organizationId || row.clientId !== client.id || row.name !== building.name) throw new Error('FIXTURE_COLLISION_BUILDING');
      await register(tx, building.key, 'Building', row.id, { name: building.name });
    }
    for (const project of manifest.projects) {
      const building = manifest.buildings.find((entry) => entry.key === project.buildingKey);
      const client = manifest.clients.find((entry) => entry.key === building?.clientKey);
      if (!building || !client) throw new Error('INVALID_PROJECT_REFERENCE');
      const row = await tx.project.upsert({
        where: { id: project.id },
        create: {
          id: project.id,
          organizationId: manifest.target.organizationId,
          clientId: client.id,
          buildingId: building.id,
          userId: identity.id,
          name: project.name,
          documentType: project.documentType,
          status: project.status,
          year: 2026,
          progress: project.progress,
          configData: { demo: true, fixtureNamespace: manifest.fixtureNamespace },
        },
        update: {},
      });
      if (row.organizationId !== manifest.target.organizationId || row.buildingId !== building.id || row.name !== project.name) throw new Error('FIXTURE_COLLISION_PROJECT');
      await register(tx, project.key, 'Project', row.id, { name: project.name, status: project.status, progress: project.progress });
    }
    for (const mandate of manifest.mandates) {
      const project = manifest.projects.find((entry) => entry.key === mandate.projectKey);
      if (!project) throw new Error('INVALID_MANDATE_PROJECT_REFERENCE');
      const row = await tx.projectMandate.upsert({
        where: { projectId: project.id },
        create: {
          id: mandate.id,
          projectId: project.id,
          organizationId: manifest.target.organizationId,
          ownerId: identity.id,
          description: mandate.description,
          montantVendu: mandate.soldAmount,
          tauxHoraire: mandate.hourlyRate,
          heuresBudgetees: mandate.budgetHours,
          typeMandat: 'DEMO',
        },
        update: {},
      });
      if (row.id !== mandate.id || row.organizationId !== manifest.target.organizationId) throw new Error('FIXTURE_COLLISION_MANDATE');
      await register(tx, mandate.key, 'ProjectMandate', row.id, { projectId: project.id });
    }
    for (const activity of manifest.activities) {
      const project = manifest.projects.find((entry) => entry.key === activity.projectKey);
      if (!project) throw new Error('INVALID_ACTIVITY_PROJECT_REFERENCE');
      const row = await tx.projectActivity.upsert({
        where: { id: activity.id },
        create: {
          id: activity.id,
          projectId: project.id,
          organizationId: manifest.target.organizationId,
          type: activity.type,
          label: activity.label,
          duration: activity.duration,
          scheduledDate: new Date(activity.scheduledDate),
          status: activity.status,
          assigneeEmail: manifest.target.referenceEmail,
          clientVisible: true,
          clientBookable: false,
        },
        update: {},
      });
      if (row.projectId !== project.id || row.organizationId !== manifest.target.organizationId) throw new Error('FIXTURE_COLLISION_ACTIVITY');
      await register(tx, activity.key, 'ProjectActivity', row.id, { projectId: project.id });
    }
    for (const task of manifest.tasks) {
      const project = manifest.projects.find((entry) => entry.key === task.projectKey);
      const activity = manifest.activities.find((entry) => entry.key === task.activityKey);
      if (!project || !activity || activity.projectKey !== project.key) throw new Error('INVALID_TASK_REFERENCE');
      const row = await tx.projectTask.upsert({
        where: { id: task.id },
        create: {
          id: task.id,
          projectId: project.id,
          activityId: activity.id,
          organizationId: manifest.target.organizationId,
          categoryName: task.category,
          taskTitle: task.title,
          status: task.status,
          dueDate: new Date(task.dueDate),
          assigneeId: identity.id,
        },
        update: {},
      });
      if (row.projectId !== project.id || row.organizationId !== manifest.target.organizationId) throw new Error('FIXTURE_COLLISION_TASK');
      await register(tx, task.key, 'ProjectTask', row.id, { projectId: project.id });
    }
    for (const entry of manifest.timeEntries) {
      const task = manifest.tasks.find((item) => item.key === entry.taskKey);
      if (!task) throw new Error('INVALID_TIME_ENTRY_TASK_REFERENCE');
      const row = await tx.taskTimeEntry.upsert({
        where: { id: entry.id },
        create: {
          id: entry.id,
          taskId: task.id,
          userId: identity.id,
          organizationId: manifest.target.organizationId,
          date: new Date(entry.date),
          heures: entry.hours,
          note: entry.note,
        },
        update: {},
      });
      if (row.taskId !== task.id || row.organizationId !== manifest.target.organizationId) throw new Error('FIXTURE_COLLISION_TIME_ENTRY');
      await register(tx, entry.key, 'TaskTimeEntry', row.id, { taskId: task.id });
    }
    const state = await existingState(tx);
    return sanitizedSummary('provision', state, { mutation: true });
  }, { timeout: 120000 });
}

async function verify(prisma) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    await assertTarget(tx);
    const environment = await tx.demoEnvironment.findUnique({ where: { organizationId: manifest.target.organizationId } });
    const state = await existingState(tx);
    const expected = manifest.clients.length + manifest.buildings.length + manifest.projects.length +
      manifest.mandates.length + manifest.activities.length + manifest.tasks.length + manifest.timeEntries.length;
    const ready = Boolean(
      environment && environment.status === 'ACTIVE' && environment.communicationMode === 'SIMULATE' &&
      environment.externalProvidersDisabled && state.registered === expected,
    );
    return sanitizedSummary('verify', state, { mutation: false, ready });
  });
}

async function prepare(prisma) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`demo-fixtures:${manifest.target.organizationId}`}, 0))`;
    await assertTarget(tx);
    const environment = await tx.demoEnvironment.update({
      where: { organizationId: manifest.target.organizationId },
      data: { status: 'ACTIVE', communicationMode: 'SIMULATE', externalProvidersDisabled: true, lockVersion: { increment: 1 } },
    });
    return sanitizedSummary('prepare', await existingState(tx), { mutation: true, environmentStatus: environment.status });
  });
}

async function reset(prisma) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`demo-fixtures:${manifest.target.organizationId}`}, 0))`;
    await assertTarget(tx);
    const records = await tx.demoFixtureRecord.findMany({
      where: { organizationId: manifest.target.organizationId, fixtureNamespace: manifest.fixtureNamespace, state: 'ACTIVE' },
    });
    const owned = (type) => records.filter((record) => record.entityType === type).map((record) => record.entityId);
    const projectIds = owned('Project');
    const buildingIds = owned('Building');
    const clientIds = owned('Client');
    await tx.project.deleteMany({ where: { id: { in: projectIds }, organizationId: manifest.target.organizationId } });
    await tx.building.deleteMany({ where: { id: { in: buildingIds }, organizationId: manifest.target.organizationId, projects: { none: {} } } });
    await tx.client.deleteMany({ where: { id: { in: clientIds }, organizationId: manifest.target.organizationId, buildings: { none: {} }, projects: { none: {} } } });
    const [projectsRemaining, buildingsRemaining, clientsRemaining] = await Promise.all([
      tx.project.count({ where: { id: { in: projectIds }, organizationId: manifest.target.organizationId } }),
      tx.building.count({ where: { id: { in: buildingIds }, organizationId: manifest.target.organizationId } }),
      tx.client.count({ where: { id: { in: clientIds }, organizationId: manifest.target.organizationId } }),
    ]);
    if (projectsRemaining || buildingsRemaining || clientsRemaining) {
      throw new Error('RESET_BLOCKED_BY_DEPENDENCIES');
    }
    await tx.demoFixtureRecord.updateMany({
      where: { organizationId: manifest.target.organizationId, fixtureNamespace: manifest.fixtureNamespace, state: 'ACTIVE' },
      data: { state: 'RETIRED' },
    });
    await tx.demoEnvironment.update({
      where: { organizationId: manifest.target.organizationId },
      data: { status: 'PAUSED', communicationMode: 'BLOCK', lockVersion: { increment: 1 } },
    });
    return sanitizedSummary('reset', await existingState(tx), { mutation: true });
  }, { timeout: 120000 });
}

async function run(prisma, command) {
  assertManifest();
  if (!COMMANDS.has(command)) throw new Error('UNKNOWN_DEMO_FIXTURE_COMMAND');
  return ({ 'dry-run': dryRun, provision, verify, prepare, reset })[command](prisma);
}

async function main() {
  if (process.env.CORO_DEMO_FIXTURES_RUN !== 'true') throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const command = process.argv[2] || 'dry-run';
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  try {
    process.stdout.write(`${JSON.stringify(await run(prisma, command))}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { assertManifest, assertTarget, dryRun, existingState, fingerprint, manifest, provision, reset, run, verify };

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: 'FAILED', reason: error.message })}\n`);
    process.exitCode = 1;
  });
}
