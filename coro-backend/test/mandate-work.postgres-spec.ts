import { NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ActivityTypesService } from '../src/activity-types/activity-types.service';
import { MandateService } from '../src/mandate/mandate.service';
import { CapacityService } from '../src/mandate/capacity.service';
import { createBookingFixture } from './booking-postgres-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Mandate consolidated work 2D-D on PostgreSQL', () => {
  const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : new PrismaClient();
  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('classifies current, historical, direct, transversal and legacy work exactly once with canonical Booking data', async () => {
    const fixture = await createBookingFixture(prisma, true);
    await prisma.projectMandate.create({ data: { projectId: fixture.project.id, organizationId: fixture.org.id, heuresBudgetees: 80 } });
    const type = await prisma.activityType.create({ data: { code: `gate-2dd-${suffix}`, nameFR: `Gate 2DD ${suffix}`, isSystem: true } });
    const [current, historical, legacy] = await Promise.all([
      prisma.taskList.create({ data: { name: `Current ${suffix}`, organizationId: null } }),
      prisma.taskList.create({ data: { name: `Historical ${suffix}`, organizationId: null } }),
      prisma.taskList.create({ data: { name: `Legacy ${suffix}`, organizationId: fixture.org.id } }),
    ]);
    const policy = await prisma.activityTypeTaskListPolicy.create({ data: {
      activityTypeId: type.id, organizationId: null, mode: 'REPLACE',
      associations: { create: { taskListId: current.id, displayOrder: 10 } },
    } });
    expect(policy.id).toBeTruthy();
    const [activityA, activityB] = await Promise.all([
      prisma.projectActivity.create({ data: { projectId: fixture.project.id, organizationId: fixture.org.id,
        type: type.code, activityTypeId: type.id, label: 'Activity A', duration: '2h', status: 'a_faire' } }),
      prisma.projectActivity.create({ data: { projectId: fixture.project.id, organizationId: fixture.org.id,
        type: 'legacy', activityTypeId: null, label: 'Activity B', duration: '', status: 'annule' } }),
    ]);
    const [currentInstance, historicalInstance, legacyInstance] = await Promise.all([
      prisma.projectTaskList.create({ data: { projectId: fixture.project.id, organizationId: fixture.org.id,
        activityId: activityA.id, taskListId: current.id, customName: 'Current', instantiationSource: 'ACTIVITY_TYPE_CONFIG' } }),
      prisma.projectTaskList.create({ data: { projectId: fixture.project.id, organizationId: fixture.org.id,
        activityId: activityA.id, taskListId: historical.id, customName: 'Historical', instantiationSource: 'ACTIVITY_TYPE_CONFIG' } }),
      prisma.projectTaskList.create({ data: { projectId: fixture.project.id, organizationId: fixture.org.id,
        taskListId: legacy.id, customName: 'Legacy list' } }),
    ]);
    const createTask = (name: string, activityId: string | null, projectTaskListId: string | null, status = 'a_faire') =>
      prisma.projectTask.create({ data: { projectId: fixture.project.id, organizationId: fixture.org.id,
        activityId, projectTaskListId, categoryName: 'Gate', taskTitle: `${name} ${suffix}`, status } });
    const [currentTask, historicalTask, directTask, transversalTask, legacyTask] = await Promise.all([
      createTask('Current task', activityA.id, currentInstance.id, 'fait'),
      createTask('Historical task', activityA.id, historicalInstance.id),
      createTask('Direct task', activityA.id, null),
      createTask('Transversal task', null, null),
      createTask('Legacy task', null, legacyInstance.id),
    ]);
    await Promise.all([
      prisma.taskTimeEntry.create({ data: { taskId: currentTask.id, userId: fixture.owner.id,
        organizationId: fixture.org.id, date: new Date(), heures: 30 } }),
      prisma.taskTimeEntry.create({ data: { taskId: transversalTask.id, userId: fixture.owner.id,
        organizationId: fixture.org.id, date: new Date(), heures: 17 } }),
      prisma.projectTaskAssignee.create({ data: { taskId: historicalTask.id, userId: fixture.colleague.id } }),
    ]);
    const booking = await fixture.createBooking({ activityId: activityA.id, status: 'CONFIRMEE', duration: 720 });
    await fixture.createBooking({ activityId: activityA.id, status: 'ANNULEE', duration: 600 });
    await prisma.bookingAssignment.create({ data: { bookingId: booking.id, userId: fixture.owner.id,
      role: 'LEAD', status: 'ACCEPTED', assignedByUserId: fixture.admin.id } });

    const service = new MandateService(prisma as never, new ActivityTypesService(prisma as never));
    const actor = { userId: fixture.admin.id, organizationId: fixture.org.id, role: 'ADMIN' };
    const result: any = await service.getWork(fixture.project.id, actor);
    expect(result.activities).toHaveLength(2);
    const projectedA = result.activities.find((activity: any) => activity.id === activityA.id);
    const projectedB = result.activities.find((activity: any) => activity.id === activityB.id);
    expect(projectedA).toMatchObject({ planningStatus: 'CONFIRMED', lead: { status: 'ACCEPTED' },
      taskCount: 3, completedTaskCount: 1, actualHours: 30 });
    expect(projectedA.checklists).toEqual([
      expect.objectContaining({ taskListId: current.id, isCurrentlyApplicable: true }),
      expect.objectContaining({ taskListId: historical.id, isCurrentlyApplicable: false }),
    ]);
    expect(projectedA.directTasks.map((task: any) => task.id)).toEqual([directTask.id]);
    expect(projectedB).toMatchObject({ status: 'annule', canonicalTypeMissing: true });
    expect(result.transversal.tasks.map((task: any) => task.id)).toEqual([transversalTask.id]);
    expect(result.legacyLists[0].tasks.map((task: any) => task.id)).toEqual([legacyTask.id]);
    expect(result.summary).toEqual({ budgetHours: 80, actualHours: 47, plannedHours: 12,
      budgetRemainingHours: 33, unplannedRemainingHours: 21 });
    const capacity = await new CapacityService(prisma as never).getCapacityPlanning(fixture.org.id);
    const ownerCapacity = capacity.find(item => item.userId === fixture.owner.id)!;
    expect(ownerCapacity.chargeDetails.filter(item => item.source === 'BOOKING'))
      .toEqual([expect.objectContaining({ bookingId: booking.id, durationHours: 12, category: 'CONFIRMED' })]);
    const rendement: any = await service.getRendement(fixture.org.id, fixture.owner.id);
    expect(rendement.conseillers).toEqual([expect.objectContaining({ userId: fixture.owner.id, heuresTotal: 47 })]);
    expect(result.classification).toEqual({ activityTaskCount: 3, legacyTaskCount: 1, transversalTaskCount: 1, totalTaskCount: 5 });

    const ids = [
      ...result.activities.flatMap((activity: any) => [
        ...activity.checklists.flatMap((list: any) => list.tasks.map((task: any) => task.id)),
        ...activity.linkedExistingLists.flatMap((list: any) => list.tasks.map((task: any) => task.id)),
        ...activity.directTasks.map((task: any) => task.id),
      ]),
      ...result.transversal.tasks.map((task: any) => task.id),
      ...result.legacyLists.flatMap((list: any) => list.tasks.map((task: any) => task.id)),
    ];
    expect(ids).toHaveLength(5); expect(new Set(ids).size).toBe(5);
    expect(new Set(ids)).toEqual(new Set([currentTask.id, historicalTask.id, directTask.id, transversalTask.id, legacyTask.id]));
    await expect(service.getWork(fixture.project.id, {
      userId: fixture.outsider!.id, organizationId: fixture.otherOrg!.id, role: 'OPERATOR',
    })).rejects.toBeInstanceOf(NotFoundException);
  });
});
