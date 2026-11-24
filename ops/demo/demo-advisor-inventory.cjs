'use strict';

/**
 * Inventaire en lecture seule des données de la démo côté conseiller.
 * Sortie : uniquement des nombres, des statuts et des mois (aucun nom,
 * courriel ni texte libre), car les journaux GitHub Actions sont publics.
 */

const TARGET_ORGANIZATION_ID = '916f54ec-af22-45e0-99db-a369d9630002';
const MONTHS = 4;

function loadPrismaClient() {
  for (const candidate of ['/app/node_modules/@prisma/client', '@prisma/client']) {
    try {
      return require(candidate).PrismaClient;
    } catch {
      /* essai suivant */
    }
  }
  throw new Error('PRISMA_CLIENT_UNAVAILABLE');
}

function monthKeys(now = new Date()) {
  const keys = [];
  for (let i = MONTHS - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}

function byMonth(rows, field, keys, valueField) {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  let before = 0;
  let after = 0;
  for (const row of rows) {
    const value = row[field];
    if (!value) continue;
    const key = new Date(value).toISOString().slice(0, 7);
    const amount = valueField ? Number(row[valueField] || 0) : 1;
    if (key in out) out[key] = Math.round((out[key] + amount) * 100) / 100;
    else if (key < keys[0]) before += amount;
    else after += amount;
  }
  return { ...out, before: Math.round(before * 100) / 100, after: Math.round(after * 100) / 100 };
}

function tally(rows, field) {
  const out = {};
  for (const row of rows) {
    const key = String(row[field] ?? 'NULL');
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

async function safe(fn) {
  try {
    return await fn();
  } catch (error) {
    return { unavailable: String(error?.code || error?.name || 'ERROR') };
  }
}

async function inventory(prisma) {
  const organizationId = TARGET_ORGANIZATION_ID;
  const where = { organizationId };
  const keys = monthKeys();
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
  if (!org) throw new Error('DEMO_ORGANIZATION_NOT_FOUND');

  const users = await prisma.user.findMany({ where, select: { id: true, role: true, isActive: true } });
  const userIds = users.map((u) => u.id);
  const projects = await prisma.project.findMany({ where, select: { id: true, status: true, documentType: true, isActive: true, createdAt: true } });
  const result = {
    schemaVersion: 1,
    command: 'inventory',
    months: keys,
    team: {
      users: users.length,
      byRole: tally(users, 'role'),
      active: users.filter((u) => u.isActive).length,
      workSchedules: await safe(() => prisma.userWorkSchedule.count({ where })),
      unavailabilities: await safe(() => prisma.userUnavailability.count({ where })),
      costRates: await safe(async () => tally(await prisma.advisorInternalCostRate.findMany({ where, select: { status: true } }), 'status')),
      advisorsWithCostRate: await safe(async () => new Set((await prisma.advisorInternalCostRate.findMany({ where, select: { userId: true } })).map((r) => r.userId)).size),
    },
    portfolio: {
      clients: await prisma.client.count({ where }),
      buildings: await prisma.building.count({ where }),
      buildingsWithCoordinates: await safe(() => prisma.building.count({ where: { ...where, latitude: { not: null } } })),
      clientUsers: await prisma.clientUser.count({ where }),
      projects: projects.length,
      projectsByStatus: tally(projects, 'status'),
      projectsByType: tally(projects, 'documentType'),
      projectsCreatedByMonth: byMonth(projects, 'createdAt', keys),
      projectTemplates: await safe(() => prisma.projectTemplate.count({ where })),
    },
    mandates: await safe(async () => {
      const rows = await prisma.projectMandate.findMany({ where, select: { typeMandat: true, soldAt: true, soldValidatedAt: true, heuresBudgetees: true, dateLimite: true, ownerId: true } });
      return {
        count: rows.length,
        byType: tally(rows, 'typeMandat'),
        soldValidated: rows.filter((r) => r.soldValidatedAt).length,
        withBudgetHours: rows.filter((r) => r.heuresBudgetees).length,
        withDeadline: rows.filter((r) => r.dateLimite).length,
        withOwner: rows.filter((r) => r.ownerId).length,
        services: await prisma.projectMandateService.count({ where }),
      };
    }),
    tasks: await safe(async () => {
      const rows = await prisma.projectTask.findMany({ where, select: { status: true, dueDate: true, createdAt: true } });
      return {
        count: rows.length,
        byStatus: tally(rows, 'status'),
        overdue: rows.filter((r) => r.dueDate && new Date(r.dueDate) < new Date() && !/DONE|TERMIN|COMPLET/i.test(String(r.status))).length,
        dueByMonth: byMonth(rows, 'dueDate', keys),
        taskLists: await prisma.projectTaskList.count({ where }),
        taskTemplates: await prisma.taskTemplate.count({ where }),
      };
    }),
    time: await safe(async () => {
      const timelog = await prisma.timelogEntry.findMany({ where, select: { date: true, heures: true, isBillable: true, userId: true } });
      const taskTime = await prisma.taskTimeEntry.findMany({ where, select: { date: true, heures: true, userId: true } });
      const closures = await prisma.timePeriodClosure.findMany({ where, select: { period: true, reopenedAt: true } });
      return {
        timelogEntries: timelog.length,
        timelogHoursByMonth: byMonth(timelog, 'date', keys, 'heures'),
        timelogBillableEntries: timelog.filter((r) => r.isBillable).length,
        timelogUsers: new Set(timelog.map((r) => r.userId)).size,
        taskTimeEntries: taskTime.length,
        taskHoursByMonth: byMonth(taskTime, 'date', keys, 'heures'),
        taskTimeUsers: new Set(taskTime.map((r) => r.userId)).size,
        timelogCategories: await prisma.timelogCategory.count({ where }),
        closedPeriods: closures.filter((c) => !c.reopenedAt).map((c) => c.period).sort(),
      };
    }),
    activities: await safe(async () => {
      const rows = await prisma.projectActivity.findMany({ where, select: { status: true, type: true, scheduledDate: true } });
      return {
        count: rows.length,
        byStatus: tally(rows, 'status'),
        byType: tally(rows, 'type'),
        scheduledByMonth: byMonth(rows, 'scheduledDate', keys),
        activityTypes: await prisma.activityType.count({ where }),
      };
    }),
    bookings: await safe(async () => {
      const rows = await prisma.booking.findMany({ where, select: { status: true, requestedDate: true } });
      return { count: rows.length, byStatus: tally(rows, 'status'), requestedByMonth: byMonth(rows, 'requestedDate', keys), assignments: await prisma.bookingAssignment.count({ where: { userId: { in: userIds } } }) };
    }),
    documents: await safe(async () => {
      const files = await prisma.projectFile.findMany({ where, select: { createdAt: true, approvedAt: true, buildingId: true } });
      return {
        projectFiles: files.length,
        approvedFiles: files.filter((f) => f.approvedAt).length,
        buildingFiles: files.filter((f) => f.buildingId).length,
        filesByMonth: byMonth(files, 'createdAt', keys),
        reviewRequests: await prisma.documentReviewRequest.count({ where }),
        pdfExports: await prisma.documentPdfExport.count({ where }),
        reviewObservations: await prisma.reviewObservation.count({ where }),
        projectComments: await prisma.projectComment.count({ where }),
        customProcedures: await prisma.customProcedure.count({ where }),
        knowledgeIngestions: await prisma.projectFileKnowledgeIngestion.count({ where }),
        knowledgeQuestions: await prisma.coroKnowledgeInteraction.count({ where }),
      };
    }),
    operations: await safe(async () => {
      const log = await prisma.operationalLogEntry.findMany({ where, select: { eventAt: true } });
      const shifts = await prisma.operationalShift.findMany({ where, select: { status: true, plannedStartAt: true } });
      return {
        logbookEntries: log.length,
        logbookByMonth: byMonth(log, 'eventAt', keys),
        shifts: shifts.length,
        shiftsByStatus: tally(shifts, 'status'),
        shiftsByMonth: byMonth(shifts, 'plannedStartAt', keys),
        handovers: await prisma.operationalHandover.count({ where }),
        directives: await prisma.operationalDirective.count({ where }),
        followUps: await prisma.operationalFollowUp.count({ where }),
        incidentReports: tally(await prisma.incidentReport.findMany({ where, select: { status: true } }), 'status'),
        logbookAssignments: await prisma.operationalLogBuildingAssignment.count({ where }),
      };
    }),
    emergency: await safe(async () => ({
      incidents: tally(await prisma.incidentEvent.findMany({ where, select: { status: true } }), 'status'),
      evacuations: await prisma.evacuationEvent.count({ where }),
      exerciseReports: tally(await prisma.exerciseReport.findMany({ where, select: { status: true } }), 'status'),
      correctiveActions: tally(await prisma.correctiveAction.findMany({ where, select: { status: true } }), 'status'),
      employees: await prisma.buildingEmployee.count({ where }),
      occupancyRecords: await prisma.occupancyRecord.count({ where }),
      resilienceSnapshots: await prisma.resilienceSnapshot.count({ where }),
      complianceEvidence: await prisma.complianceEvidence.count({ where }),
      displayPublications: await prisma.displayPlanPublication.count({ where }),
      displayLocations: await prisma.displayLocation.count({ where }),
    })),
    engagement: await safe(async () => ({
      notifications: await prisma.notification.count({ where }),
      auditLogs: byMonth(await prisma.auditLog.findMany({ where, select: { createdAt: true } }), 'createdAt', keys),
      supportTickets: await prisma.supportTicket.count({ where }),
      commercialProposals: await prisma.commercialProposal.count({ where }),
      commercialInvoices: await prisma.commercialInvoice.count({ where }),
    })),
  };
  return result;
}

async function main() {
  if (process.env.CORO_DEMO_INVENTORY_RUN !== 'true') throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const PrismaClient = loadPrismaClient();
  const prisma = new PrismaClient();
  try {
    process.stdout.write(`${JSON.stringify(await inventory(prisma))}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { byMonth, monthKeys, tally, inventory, TARGET_ORGANIZATION_ID };

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, command: 'inventory', execution: 'FAILED', reason: String(error.message).slice(0, 120) })}\n`);
    process.exitCode = 1;
  });
}
