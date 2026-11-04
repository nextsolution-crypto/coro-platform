'use strict';

const crypto = require('node:crypto');
const manifest = require('./demo-coro-fixture-manifest.json');

function loadRuntimeDependency(name) {
  try {
    return require(`../../coro-backend/node_modules/${name}`);
  } catch (localError) {
    try {
      return require(`/app/node_modules/${name}`);
    } catch {
      throw localError;
    }
  }
}

const bcrypt = loadRuntimeDependency('bcryptjs');

function loadPrismaClient() {
  return loadRuntimeDependency('@prisma/client').PrismaClient;
}

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
    ...manifest.users,
    ...manifest.costRates,
    ...manifest.buildings,
    ...manifest.projects,
    ...manifest.mandates,
    ...manifest.activities,
    ...manifest.tasks,
    ...manifest.timeEntries,
    ...manifest.employees,
    ...manifest.occupancyRecords,
    ...manifest.incidents,
    ...manifest.correctiveActions,
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
      users: manifest.users.length,
      costRates: manifest.costRates.length,
      buildings: manifest.buildings.length,
      projects: manifest.projects.length,
      mandates: manifest.mandates.length,
      activities: manifest.activities.length,
      tasks: manifest.tasks.length,
      timeEntries: manifest.timeEntries.length,
      employees: manifest.employees.length,
      occupancyRecords: manifest.occupancyRecords.length,
      incidents: manifest.incidents.length,
      correctiveActions: manifest.correctiveActions.length,
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
    for (const user of manifest.users) {
      const suppliedHash = process.env.CORO_DEMO_SYNTHETIC_PASSWORD_HASH?.trim();
      const password = suppliedHash || await bcrypt.hash(`disabled-${crypto.randomUUID()}`, 10);
      const row = await tx.user.upsert({
        where: { email: user.email },
        create: {
          id: user.id,
          email: user.email,
          password,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: manifest.target.organizationId,
          isActive: true,
        },
        update: {
          ...(suppliedHash ? { password: suppliedHash } : {}),
          isActive: true,
        },
      });
      if (row.id !== user.id || row.organizationId !== manifest.target.organizationId || row.role !== user.role) throw new Error('FIXTURE_COLLISION_USER');
      await register(tx, user.key, 'User', row.id, { role: user.role, syntheticDomain: true });
    }
    for (const rate of manifest.costRates) {
      const advisor = manifest.users.find((entry) => entry.key === rate.userKey);
      if (!advisor) throw new Error('INVALID_COST_RATE_USER_REFERENCE');
      const row = await tx.advisorInternalCostRate.upsert({
        where: { id: rate.id },
        create: {
          id: rate.id,
          organizationId: manifest.target.organizationId,
          userId: advisor.id,
          currency: rate.currency,
          hourlyCost: rate.hourlyCost,
          effectiveFrom: new Date(rate.effectiveFrom),
          status: 'APPROVED',
          proposedByUserId: advisor.id,
          proposedAt: new Date('2026-01-02T14:00:00.000Z'),
          approvedByUserId: identity.id,
          approvedAt: new Date('2026-01-03T14:00:00.000Z'),
        },
        update: {},
      });
      if (row.userId !== advisor.id || row.organizationId !== manifest.target.organizationId || row.currency !== rate.currency || Number(row.hourlyCost) !== rate.hourlyCost) throw new Error('FIXTURE_COLLISION_COST_RATE');
      await register(tx, rate.key, 'AdvisorInternalCostRate', row.id, { hypothesis: 'DEMONSTRATION_ONLY', currency: rate.currency });
    }
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
          userId: manifest.users[0].id,
          name: project.name,
          documentType: project.documentType,
          status: project.status,
          year: 2026,
          progress: project.progress,
          configData: { demo: true, fixtureNamespace: manifest.fixtureNamespace },
        },
        update: { userId: manifest.users[0].id },
      });
      if (row.organizationId !== manifest.target.organizationId || row.buildingId !== building.id || row.name !== project.name) throw new Error('FIXTURE_COLLISION_PROJECT');
      await register(tx, project.key, 'Project', row.id, { name: project.name, status: project.status, progress: project.progress });
    }
    for (const mandate of manifest.mandates) {
      const project = manifest.projects.find((entry) => entry.key === mandate.projectKey);
      if (!project) throw new Error('INVALID_MANDATE_PROJECT_REFERENCE');
      let row = await tx.projectMandate.upsert({
        where: { projectId: project.id },
        create: {
          id: mandate.id,
          projectId: project.id,
          organizationId: manifest.target.organizationId,
          ownerId: manifest.users[0].id,
          description: mandate.description,
          montantVendu: mandate.soldAmount,
          soldAmountDecimal: mandate.soldAmount,
          soldCurrency: 'CAD',
          soldAt: new Date(mandate.soldAt),
          soldValidatedByUserId: identity.id,
          soldValidatedAt: new Date('2026-01-05T14:00:00.000Z'),
          soldValidationReason: 'Hypothèse de démonstration — aucune valeur commerciale officielle',
          tauxHoraire: mandate.hourlyRate,
          heuresBudgetees: mandate.budgetHours,
          typeMandat: 'DEMO',
        },
        update: { ownerId: manifest.users[0].id },
      });
      if (row.soldAmountDecimal === null) {
        row = await tx.projectMandate.update({
          where: { id: row.id },
          data: {
            soldAmountDecimal: mandate.soldAmount,
            soldCurrency: 'CAD',
            soldAt: new Date(mandate.soldAt),
            soldValidatedByUserId: identity.id,
            soldValidatedAt: new Date('2026-01-05T14:00:00.000Z'),
            soldValidationReason: 'Hypothèse de démonstration — aucune valeur commerciale officielle',
            financialLockVersion: { increment: 1 },
          },
        });
      }
      if (row.soldAmountDecimal === null || row.soldCurrency !== 'CAD' || Number(row.soldAmountDecimal) !== mandate.soldAmount) throw new Error('FIXTURE_COLLISION_MANDATE_FINANCIALS');
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
          assigneeId: manifest.users[0].id,
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
          userId: manifest.users[0].id,
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
    for (const employee of manifest.employees) {
      const building = manifest.buildings.find((entry) => entry.key === employee.buildingKey);
      if (!building) throw new Error('INVALID_EMPLOYEE_BUILDING_REFERENCE');
      const row = await tx.buildingEmployee.upsert({
        where: { id: employee.id },
        create: {
          id: employee.id,
          buildingId: building.id,
          organizationId: manifest.target.organizationId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          poste: employee.position,
          email: `${employee.key}@example.invalid`,
          qrToken: crypto.randomUUID(),
          isActive: true,
          smsConsent: false,
        },
        update: {},
      });
      if (row.buildingId !== building.id || row.organizationId !== manifest.target.organizationId) throw new Error('FIXTURE_COLLISION_EMPLOYEE');
      await register(tx, employee.key, 'BuildingEmployee', row.id, { buildingId: building.id });
    }
    for (const occupant of manifest.occupancyRecords) {
      const building = manifest.buildings.find((entry) => entry.key === occupant.buildingKey);
      const employee = occupant.employeeKey
        ? manifest.employees.find((entry) => entry.key === occupant.employeeKey)
        : null;
      if (!building || (occupant.employeeKey && !employee)) throw new Error('INVALID_OCCUPANCY_REFERENCE');
      const row = await tx.occupancyRecord.upsert({
        where: { id: occupant.id },
        create: {
          id: occupant.id,
          buildingId: building.id,
          organizationId: manifest.target.organizationId,
          employeeId: employee?.id ?? null,
          type: occupant.type,
          status: occupant.status,
          firstName: occupant.firstName,
          lastName: occupant.lastName,
          company: 'Organisation fictive',
          floor: occupant.floor,
          checkedInAt: new Date('2026-10-15T13:30:00.000Z'),
          checkedOutAt: occupant.status === 'OUT' ? new Date('2026-10-15T15:00:00.000Z') : null,
        },
        update: {},
      });
      if (row.buildingId !== building.id || row.organizationId !== manifest.target.organizationId) throw new Error('FIXTURE_COLLISION_OCCUPANCY');
      await register(tx, occupant.key, 'OccupancyRecord', row.id, { buildingId: building.id });
    }
    for (const incident of manifest.incidents) {
      const building = manifest.buildings.find((entry) => entry.key === incident.buildingKey);
      if (!building) throw new Error('INVALID_INCIDENT_BUILDING_REFERENCE');
      const row = await tx.incidentEvent.upsert({
        where: { id: incident.id },
        create: {
          id: incident.id,
          buildingId: building.id,
          organizationId: manifest.target.organizationId,
          type: incident.type,
          status: incident.status,
          triggeredAt: new Date(incident.triggeredAt),
          triggeredBy: 'Système de démonstration',
          description: incident.description,
          occupantsSnapshot: { synthetic: true, present: 3, absent: 1 },
          teamSnapshot: { synthetic: true, members: 2 },
          procedureCode: incident.procedureCode,
          publicAccessToken: null,
          resolvedAt: new Date(incident.resolvedAt),
          closingNotes: 'Exercice fictif terminé sans communication externe.',
          rexWentWell: 'Recensement synthétique complété.',
          rexToImprove: 'Clarifier la signalisation fictive.',
          rexRecommendations: 'Répéter le briefing dans le scénario de démonstration.',
          rexCorrectiveActions: 'Deux actions fictives sont suivies.',
          rexCompletedAt: new Date('2026-10-16T14:00:00.000Z'),
          isExercise: true,
          isActive: false,
        },
        update: {},
      });
      if (row.buildingId !== building.id || row.organizationId !== manifest.target.organizationId || row.publicAccessToken) throw new Error('FIXTURE_COLLISION_INCIDENT');
      await register(tx, incident.key, 'IncidentEvent', row.id, { buildingId: building.id, isExercise: true });
    }
    for (const action of manifest.correctiveActions) {
      const incident = manifest.incidents.find((entry) => entry.key === action.incidentKey);
      const building = manifest.buildings.find((entry) => entry.key === action.buildingKey);
      if (!incident || !building) throw new Error('INVALID_CORRECTIVE_ACTION_REFERENCE');
      const row = await tx.correctiveAction.upsert({
        where: { id: action.id },
        create: {
          id: action.id,
          organizationId: manifest.target.organizationId,
          buildingId: building.id,
          incidentId: incident.id,
          category: 'EXERCISES',
          title: action.title,
          description: action.description,
          status: action.status,
          priority: action.priority,
          assignedTo: 'Équipe de démonstration',
          assigneeType: 'USER',
          assigneeId: identity.id,
          assigneeDisplayNameSnapshot: 'Démo CORO',
          createdByType: 'USER',
          createdById: identity.id,
          dueDate: new Date(action.dueDate),
        },
        update: {
          buildingId: building.id,
          incidentId: incident.id,
          category: 'EXERCISES',
          title: action.title,
          description: action.description,
          status: action.status,
          priority: action.priority,
          assignedTo: 'Équipe de démonstration',
          assigneeType: 'USER',
          assigneeId: identity.id,
          assigneeDisplayNameSnapshot: 'Démo CORO',
          updatedByType: 'USER',
          updatedById: identity.id,
          dueDate: new Date(action.dueDate),
        },
      });
      if (row.incidentId !== incident.id || row.organizationId !== manifest.target.organizationId) throw new Error('FIXTURE_COLLISION_CORRECTIVE_ACTION');
      await register(tx, action.key, 'CorrectiveAction', row.id, { incidentId: incident.id });
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
      manifest.users.length + manifest.costRates.length +
      manifest.mandates.length + manifest.activities.length + manifest.tasks.length + manifest.timeEntries.length +
      manifest.employees.length + manifest.occupancyRecords.length + manifest.incidents.length + manifest.correctiveActions.length;
    const ready = Boolean(
      environment && environment.status === 'ACTIVE' && environment.communicationMode === 'SIMULATE' &&
      environment.externalProvidersDisabled && state.registered === expected,
    );
    return sanitizedSummary('verify', state, { mutation: false, ready });
  });
}

async function prepare(prisma) {
  const provisioned = await provision(prisma);
  const verified = await verify(prisma);
  if (!verified.ready) throw new Error('PREPARE_VERIFICATION_FAILED');
  return sanitizedSummary('prepare', {
    namespace: provisioned.namespace,
    expected: provisioned.expected,
    registered: provisioned.registered,
    records: provisioned.records,
  }, {
    mutation: true,
    environmentStatus: 'ACTIVE',
    communicationMode: 'SIMULATE',
    externalProvidersDisabled: true,
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
    const correctiveActionIds = owned('CorrectiveAction');
    const incidentIds = owned('IncidentEvent');
    const occupancyIds = owned('OccupancyRecord');
    const employeeIds = owned('BuildingEmployee');
    const userIds = owned('User');
    const neutralizedActions = await tx.correctiveAction.updateMany({
      where: { id: { in: correctiveActionIds }, organizationId: manifest.target.organizationId, status: { not: 'CLOSED' } },
      data: {
        status: 'CANCELLED',
        assignedTo: null,
        assigneeType: null,
        assigneeId: null,
        updatedByType: 'SYSTEM',
        updatedById: 'demo-reset',
      },
    });
    if (neutralizedActions.count !== correctiveActionIds.length) throw new Error(`RESET_ACTION_NEUTRALIZE_MISMATCH:${neutralizedActions.count}:${correctiveActionIds.length}`);
    await tx.incidentEvent.deleteMany({ where: { id: { in: incidentIds }, organizationId: manifest.target.organizationId } });
    await tx.occupancyRecord.deleteMany({ where: { id: { in: occupancyIds }, organizationId: manifest.target.organizationId } });
    await tx.buildingEmployee.deleteMany({ where: { id: { in: employeeIds }, organizationId: manifest.target.organizationId } });
    await tx.project.deleteMany({ where: { id: { in: projectIds }, organizationId: manifest.target.organizationId } });
    await tx.building.deleteMany({ where: { id: { in: buildingIds }, organizationId: manifest.target.organizationId, projects: { none: {} } } });
    await tx.client.deleteMany({ where: { id: { in: clientIds }, organizationId: manifest.target.organizationId, buildings: { none: {} }, projects: { none: {} } } });
    await tx.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await tx.trustedDevice.deleteMany({ where: { userId: { in: userIds } } });
    await tx.platformMfaChallenge.deleteMany({ where: { userId: { in: userIds } } });
    await tx.user.updateMany({ where: { id: { in: userIds }, organizationId: manifest.target.organizationId }, data: { isActive: false } });
    const [projectsRemaining, buildingsRemaining, clientsRemaining, activeActionsRemaining, incidentsRemaining, occupancyRemaining, employeesRemaining] = await Promise.all([
      tx.project.count({ where: { id: { in: projectIds }, organizationId: manifest.target.organizationId } }),
      tx.building.count({ where: { id: { in: buildingIds }, organizationId: manifest.target.organizationId } }),
      tx.client.count({ where: { id: { in: clientIds }, organizationId: manifest.target.organizationId } }),
      tx.correctiveAction.count({ where: { id: { in: correctiveActionIds }, organizationId: manifest.target.organizationId, status: { not: 'CANCELLED' } } }),
      tx.incidentEvent.count({ where: { id: { in: incidentIds }, organizationId: manifest.target.organizationId } }),
      tx.occupancyRecord.count({ where: { id: { in: occupancyIds }, organizationId: manifest.target.organizationId } }),
      tx.buildingEmployee.count({ where: { id: { in: employeeIds }, organizationId: manifest.target.organizationId } }),
    ]);
    if (projectsRemaining || buildingsRemaining || clientsRemaining || activeActionsRemaining || incidentsRemaining || occupancyRemaining || employeesRemaining) {
      throw new Error(`RESET_BLOCKED_BY_DEPENDENCIES:${JSON.stringify({ projectsRemaining, buildingsRemaining, clientsRemaining, activeActionsRemaining, incidentsRemaining, occupancyRemaining, employeesRemaining })}`);
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
  const PrismaClient = loadPrismaClient();
  const prisma = new PrismaClient();
  try {
    process.stdout.write(`${JSON.stringify(await run(prisma, command))}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { assertManifest, assertTarget, dryRun, existingState, fingerprint, manifest, prepare, provision, reset, run, verify };

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: 'FAILED', reason: error.message })}\n`);
    process.exitCode = 1;
  });
}
