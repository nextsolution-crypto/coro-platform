import { PrismaClient } from '@prisma/client';
import { classifyHistoricalActivities, HistoricalActivity } from './mandate-service-classifier';

const prisma = new PrismaClient();
const countState = () => Promise.all([
  prisma.projectMandateService.count(), prisma.projectActivity.count(), prisma.projectTaskList.count(),
  prisma.projectTask.count(), prisma.booking.count(), prisma.auditLog.count(),
]);

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname) && url.pathname.slice(1) === 'coro_booking_dev';
  if (!local && !process.argv.includes('--allow-remote-read-only')) {
    throw new Error('Remote classification requires --allow-remote-read-only');
  }
  const before = await countState();
  const activities = await prisma.projectActivity.findMany({
    where: { sourceMandate: true },
    orderBy: [{ organizationId: 'asc' }, { projectId: 'asc' }, { activityTypeId: 'asc' }, { createdAt: 'asc' }],
    include: {
      project: { select: { name: true, organizationId: true, mandate: { select: { id: true,
        services: { select: { id: true, activityTypeId: true, commercialStatus: true } } } } } },
      activityType: { select: { nameFR: true, organizationId: true } },
      mandateService: { select: { id: true, projectId: true, organizationId: true, activityTypeId: true } },
      bookings: { select: { id: true } }, taskLists: { select: { id: true } },
      tasks: { select: { id: true, timeEntries: { select: { heures: true } } } },
      exerciseReport: { select: { id: true } },
    },
  });
  const input: HistoricalActivity[] = activities.map(activity => ({
    id: activity.id, organizationId: activity.organizationId, projectId: activity.projectId,
    projectOrganizationId: activity.project.organizationId, projectName: activity.project.name,
    projectMandateId: activity.project.mandate?.id ?? null, activityTypeId: activity.activityTypeId,
    activityTypeName: activity.activityType?.nameFR ?? null,
    activityTypeOrganizationId: activity.activityType?.organizationId ?? null,
    activityTypeExists: activity.activityTypeId === null ? false : activity.activityType !== null,
    sourceMandate: activity.sourceMandate, status: activity.status, scheduledDate: activity.scheduledDate,
    createdAt: activity.createdAt, isRecurring: activity.isRecurring, mandateServiceId: activity.mandateServiceId,
    linkedServiceConsistent: !activity.mandateServiceId || Boolean(activity.mandateService
      && activity.mandateService.projectId === activity.projectId
      && activity.mandateService.organizationId === activity.organizationId
      && activity.mandateService.activityTypeId === activity.activityTypeId),
    bookingCount: activity.bookings.length, taskListCount: activity.taskLists.length,
    taskCount: activity.tasks.length,
    timeEntryCount: activity.tasks.reduce((sum, task) => sum + task.timeEntries.length, 0),
    timeHours: activity.tasks.reduce((sum, task) => sum + task.timeEntries.reduce((total, entry) => total + entry.heures, 0), 0),
    hasExerciseReport: Boolean(activity.exerciseReport), existingServices: activity.project.mandate?.services ?? [],
  }));
  const groups = classifyHistoricalActivities(input);
  const summary = { SAFE_AUTO: 0, AMBIGUOUS: 0, NO_ACTION: 0, DATA_INTEGRITY_ERROR: 0 };
  groups.forEach(group => summary[group.classification]++);
  const reasonCodes: Record<string, number> = {};
  groups.flatMap(group => group.reasonCodes).forEach(reason => reasonCodes[reason] = (reasonCodes[reason] ?? 0) + 1);
  const after = await countState();
  if (before.some((value, index) => value !== after[index])) throw new Error('Read-only invariant violated');
  const report = { summary, reasonCodes, countsBefore: before, countsAfter: after,
    ...(process.argv.includes('--summary-only') ? {} : { groups }) };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().finally(() => prisma.$disconnect()).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
