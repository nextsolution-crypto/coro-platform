import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createBookingFixture } from './booking-postgres-fixture';
import { ActivityTypesService } from '../src/activity-types/activity-types.service';
import { ActivityTaskListsService } from '../src/activities/activity-task-lists.service';
import { ActivitiesService } from '../src/activities/activities.service';
import { PlanningActionsService } from '../src/planning/planning-actions.service';
import { PlanningService } from '../src/planning/planning.service';
import { TaskListsService } from '../src/task-lists/task-lists.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Activity checklist instantiation 2D-A on PostgreSQL', () => {
  const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : new PrismaClient();
  const suffix = randomUUID().slice(0, 8);
  let fixture: Awaited<ReturnType<typeof createBookingFixture>>;
  let other: Awaited<ReturnType<typeof createBookingFixture>>;
  let typeId: string;
  const lists: Record<string, string> = {};
  let globalPolicyId: string;
  const activityTypes = () => new ActivityTypesService(prisma as never);
  const engine = () => new ActivityTaskListsService(prisma as never, activityTypes());
  const operator = () => ({ userId: fixture.owner.id, organizationId: fixture.org.id, role: 'OPERATOR' });
  const admin = () => ({ userId: fixture.admin.id, organizationId: fixture.org.id, role: 'ADMIN' });

  beforeAll(async () => {
    await prisma.$connect();
    [fixture, other] = await Promise.all([createBookingFixture(prisma), createBookingFixture(prisma)]);
    const type = await prisma.activityType.create({ data: { code: `gate-2da-${suffix}`, nameFR: `Gate 2DA ${suffix}`, isSystem: true } });
    typeId = type.id;
    for (const key of ['A', 'B', 'C', 'D']) {
      const list = await prisma.taskList.create({ data: { name: `2DA ${key} ${suffix}`, organizationId: null } });
      lists[key] = list.id;
      await prisma.taskTemplate.createMany({ data: [
        { taskListId: list.id, categoryName: 'Préparation', taskTitle: `${key} PMU`, order: 10, documentTypes: ['PMU'] },
        { taskListId: list.id, categoryName: 'Préparation', taskTitle: `${key} PCA`, order: 20, documentTypes: ['PCA'] },
        { taskListId: list.id, categoryName: 'Suivi', taskTitle: `${key} commun`, order: 30, documentTypes: [] },
      ] });
    }
    const policy = await prisma.activityTypeTaskListPolicy.create({ data: { activityTypeId: typeId, organizationId: null, mode: 'REPLACE' } });
    globalPolicyId = policy.id;
    await setGlobal(['A']);
  });
  afterAll(async () => prisma.$disconnect());

  async function setGlobal(keys: string[]) {
    await prisma.$transaction(async tx => {
      await tx.activityTypeTaskList.deleteMany({ where: { policyId: globalPolicyId } });
      await tx.activityTypeTaskList.createMany({ data: keys.map((key, index) => ({
        policyId: globalPolicyId, taskListId: lists[key], displayOrder: (index + 1) * 10,
      })) });
    });
  }
  async function setTenant(mode: 'APPEND'|'REPLACE'|'DISABLE'|'INHERIT', keys: string[] = []) {
    const existing = await prisma.activityTypeTaskListPolicy.findFirst({ where: { activityTypeId: typeId, organizationId: fixture.org.id } });
    if (mode === 'INHERIT') {
      if (existing) await prisma.activityTypeTaskListPolicy.delete({ where: { id: existing.id } });
      return;
    }
    const policy = existing
      ? await prisma.activityTypeTaskListPolicy.update({ where: { id: existing.id }, data: { mode } })
      : await prisma.activityTypeTaskListPolicy.create({ data: { activityTypeId: typeId, organizationId: fixture.org.id, mode } });
    await prisma.activityTypeTaskList.deleteMany({ where: { policyId: policy.id } });
    if (keys.length) await prisma.activityTypeTaskList.createMany({ data: keys.map((key, index) => ({
      policyId: policy.id, taskListId: lists[key], displayOrder: (index + 1) * 10,
    })) });
  }
  const createActivity = (data: { status?: string; activityTypeId?: string | null } = {}) => prisma.projectActivity.create({ data: {
    projectId: fixture.project.id, organizationId: fixture.org.id, type: 'gate', label: 'Gate 2DA', duration: '1h',
    status: data.status ?? 'a_faire', activityTypeId: data.activityTypeId === undefined ? typeId : data.activityTypeId,
  } });

  it('instantiates one list and active PMU-compatible template snapshots exactly once', async () => {
    await setTenant('INHERIT'); await setGlobal(['A']);
    const activity = await createActivity();
    await expect(engine().instantiateForActor(fixture.project.id, activity.id, operator())).resolves.toMatchObject({ createdLists: [lists.A], createdTasks: 2 });
    await expect(engine().instantiateForActor(fixture.project.id, activity.id, operator())).resolves.toMatchObject({ createdLists: [], existingLists: [lists.A], createdTasks: 0 });
    const instance = await prisma.projectTaskList.findFirstOrThrow({ where: { activityId: activity.id, taskListId: lists.A } });
    expect(instance).toMatchObject({ instantiationSource: 'ACTIVITY_TYPE_CONFIG' });
    expect(await prisma.projectTask.count({ where: { projectTaskListId: instance.id, activityId: activity.id } })).toBe(2);
    expect(await prisma.auditLog.count({ where: { action: 'ACTIVITY_TASK_LISTS_INSTANTIATED', entityId: activity.id } })).toBe(1);
  });

  it('serializes concurrent calls into one list and one task snapshot set', async () => {
    await setTenant('INHERIT'); await setGlobal(['A']);
    const activity = await createActivity();
    const results = await Promise.all([engine().instantiateForActor(fixture.project.id, activity.id, operator()), engine().instantiateForActor(fixture.project.id, activity.id, operator())]);
    expect(results.reduce((sum, item) => sum + item.createdLists.length, 0)).toBe(1);
    expect(await prisma.projectTaskList.count({ where: { activityId: activity.id, taskListId: lists.A } })).toBe(1);
    expect(await prisma.projectTask.count({ where: { activityId: activity.id } })).toBe(2);
  });

  it('consumes INHERIT, APPEND with deduplication, REPLACE and DISABLE from the real 2C engine', async () => {
    await setGlobal(['A']);
    await setTenant('APPEND', ['A', 'B']);
    const append = await createActivity();
    expect((await engine().instantiateForActor(fixture.project.id, append.id, operator())).createdLists).toEqual([lists.A, lists.B]);
    await setTenant('REPLACE', ['C']);
    const replace = await createActivity();
    expect((await engine().instantiateForActor(fixture.project.id, replace.id, operator())).createdLists).toEqual([lists.C]);
    await setTenant('DISABLE');
    const disabled = await createActivity();
    expect(await engine().instantiateForActor(fixture.project.id, disabled.id, operator())).toEqual({ createdLists: [], existingLists: [], createdTasks: 0 });
  });

  it('adds new configuration without deleting history and recognizes old lists when configuration returns', async () => {
    await setGlobal(['A', 'B']); await setTenant('INHERIT');
    const activity = await createActivity(); const service = engine();
    await service.instantiateForActor(fixture.project.id, activity.id, operator());
    await setGlobal(['C', 'D']);
    expect((await service.instantiateForActor(fixture.project.id, activity.id, operator())).createdLists).toEqual([lists.C, lists.D]);
    await setGlobal(['A', 'B']);
    expect((await service.instantiateForActor(fixture.project.id, activity.id, operator())).createdLists).toEqual([]);
    expect(await prisma.projectTaskList.count({ where: { activityId: activity.id } })).toBe(4);
  });

  it('projects historical adoption, missing checklists, direct tasks, time and configuration rollback without duplication', async () => {
    await setGlobal(['A', 'B']); await setTenant('INHERIT');
    const activity = await createActivity();
    const instantiation = engine();
    await instantiation.instantiateForActor(fixture.project.id, activity.id, operator());
    const direct = await prisma.projectTask.create({ data: {
      projectId: fixture.project.id, organizationId: fixture.org.id, activityId: activity.id,
      projectTaskListId: null, categoryName: 'Activité', taskTitle: `Directe ${suffix}`, status: 'a_faire',
    } });
    await prisma.taskTimeEntry.create({ data: {
      taskId: direct.id, userId: fixture.owner.id, organizationId: fixture.org.id, date: new Date(), heures: 1.5,
    } });
    await setGlobal(['C', 'D']);
    const activities = new ActivitiesService(prisma as never, activityTypes(), instantiation);
    const before: any = await activities.getActivityTasks(fixture.project.id, activity.id, admin());
    expect(new Set(before.historicalTaskLists.map((item: any) => item.taskListId))).toEqual(new Set([lists.A, lists.B]));
    expect(new Set(before.missingTaskLists.map((item: any) => item.taskListId))).toEqual(new Set([lists.C, lists.D]));
    expect(before.directTasks).toEqual([expect.objectContaining({ id: direct.id, actualHours: 1.5 })]);

    expect((await instantiation.instantiateForActor(fixture.project.id, activity.id, admin())).createdLists)
      .toEqual([lists.C, lists.D]);
    expect((await instantiation.instantiateForActor(fixture.project.id, activity.id, admin())).createdLists).toEqual([]);
    await setGlobal(['A', 'B']);
    const returned: any = await activities.getActivityTasks(fixture.project.id, activity.id, admin());
    expect(returned.missingTaskLists).toEqual([]);
    expect(new Set(returned.historicalTaskLists.map((item: any) => item.taskListId))).toEqual(new Set([lists.C, lists.D]));
    expect(returned.instantiatedTaskLists).toHaveLength(4);
    expect(await prisma.projectTask.count({ where: { id: direct.id } })).toBe(1);

    await setTenant('DISABLE');
    const disabled: any = await activities.getActivityTasks(fixture.project.id, activity.id, admin());
    expect(disabled.currentApplicableTaskLists).toEqual([]);
    expect(disabled.missingTaskLists).toEqual([]);
    expect(disabled.historicalTaskLists).toHaveLength(4);
  });

  it('refuses cross-tenant, legacy and cancelled Activities without writes', async () => {
    const foreign = await prisma.projectActivity.create({ data: { projectId: other.project.id, organizationId: other.org.id,
      type: 'gate', label: 'Foreign', duration: '1h', activityTypeId: typeId } });
    await expect(engine().instantiateForActor(other.project.id, foreign.id, operator())).rejects.toBeInstanceOf(NotFoundException);
    const legacy = await createActivity({ activityTypeId: null });
    await expect(engine().instantiateForActor(fixture.project.id, legacy.id, operator())).rejects.toBeInstanceOf(BadRequestException);
    const cancelled = await createActivity({ status: 'annule' });
    await expect(engine().instantiateForActor(fixture.project.id, cancelled.id, operator())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('protects Activity deletion/type change and refuses deleting a configured checklist', async () => {
    await setGlobal(['A']); await setTenant('INHERIT');
    const activity = await createActivity(); await engine().instantiateForActor(fixture.project.id, activity.id, operator());
    await prisma.projectTask.deleteMany({ where: { activityId: activity.id } });
    try {
      await prisma.projectActivity.delete({ where: { id: activity.id } });
      throw new Error('Expected ProjectTaskList Activity RESTRICT');
    } catch (error) {
      const prismaError = error as { code?: string; meta?: unknown; message?: string };
      const details = `${JSON.stringify(prismaError.meta ?? {})} ${prismaError.message ?? ''}`;
      expect(prismaError.code === 'P2003' || details.includes('ProjectTaskList_activityId_projectId_organizationId_fkey')).toBe(true);
    }
    const nextType = await prisma.activityType.create({ data: { organizationId: fixture.org.id, code: `custom-2da-${suffix}`, nameFR: 'Next type' } });
    const activities = new ActivitiesService(prisma as never, activityTypes(), engine());
    await expect(activities.updateActivity(activity.id, fixture.org.id, { activityTypeId: nextType.id })).rejects.toBeInstanceOf(BadRequestException);
    const instance = await prisma.projectTaskList.findFirstOrThrow({ where: { activityId: activity.id } });
    const taskListsService = new TaskListsService(prisma as never);
    await expect(taskListsService.deleteProjectTaskList(instance.id, fixture.org.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rolls back list, tasks and audit when template copying fails', async () => {
    await setGlobal(['A']); await setTenant('INHERIT');
    const activity = await createActivity(); const service = engine();
    await expect(prisma.$transaction(async tx => {
      const proxy: any = new Proxy(tx as any, { get(target, property) {
        if (property === 'projectTask') return { ...target.projectTask, createMany: async () => { throw new Error('task 6 failure'); } };
        return target[property];
      } });
      return service.instantiateMissingTaskListsForActivity(proxy, fixture.project.id, activity.id, operator());
    })).rejects.toThrow('task 6 failure');
    expect(await prisma.projectTaskList.count({ where: { activityId: activity.id } })).toBe(0);
    expect(await prisma.projectTask.count({ where: { activityId: activity.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'ACTIVITY_TASK_LISTS_INSTANTIATED', entityId: activity.id } })).toBe(0);
  });

  it('keeps lists, tasks, time and assignments when the Activity is cancelled', async () => {
    await setGlobal(['A']); await setTenant('INHERIT');
    const activity = await createActivity(); await engine().instantiateForActor(fixture.project.id, activity.id, operator());
    const task = await prisma.projectTask.findFirstOrThrow({ where: { activityId: activity.id } });
    const [entry, assignment] = await Promise.all([
      prisma.taskTimeEntry.create({ data: { taskId: task.id, userId: fixture.owner.id, organizationId: fixture.org.id, date: new Date(), heures: 1 } }),
      prisma.projectTaskAssignee.create({ data: { taskId: task.id, userId: fixture.owner.id } }),
    ]);
    await new PlanningActionsService(prisma as never, {} as never).cancelActivity(activity.id, admin());
    expect(await prisma.projectTaskList.count({ where: { activityId: activity.id } })).toBe(1);
    expect(await prisma.projectTask.findUnique({ where: { id: task.id } })).not.toBeNull();
    expect(await prisma.taskTimeEntry.findUnique({ where: { id: entry.id } })).not.toBeNull();
    expect(await prisma.projectTaskAssignee.findUnique({ where: { id: assignment.id } })).not.toBeNull();
  });

  it('automatically instantiates the resolved checklist from the project Activity route', async () => {
    await setGlobal(['A']); await setTenant('INHERIT');
    const service = new ActivitiesService(prisma as never, activityTypes(), engine());
    const created = await service.createActivity(fixture.project.id, admin(), { activityTypeId: typeId });
    expect(await prisma.projectTaskList.count({ where: { activityId: created.id, taskListId: lists.A } })).toBe(1);
    expect(await prisma.projectTask.count({ where: { activityId: created.id } })).toBe(2);
  });

  it('automatically instantiates before the Planner backlog creation audit', async () => {
    await setGlobal(['A']); await setTenant('APPEND', ['B']);
    const service = new PlanningService(prisma as never, {} as never, {} as never, engine());
    const created = await service.createUnplannedActivity({ projectId: fixture.project.id, activityTypeId: typeId }, admin());
    const listsCreated = await prisma.projectTaskList.findMany({ where: { activityId: created.id }, select: { taskListId: true } });
    expect(new Set(listsCreated.map(item => item.taskListId))).toEqual(new Set([lists.A, lists.B]));
    expect(await prisma.auditLog.count({ where: { entityId: created.id, action: 'PLANNING_ACTIVITY_CREATED' } })).toBe(1);
  });

  it('automatically instantiates before Booking creation in create-and-plan', async () => {
    await setGlobal(['A']); await setTenant('REPLACE', ['C']);
    const scheduling = { lockUsers: jest.fn(), analyzeUsers: jest.fn().mockResolvedValue(new Map([
      [fixture.owner.id, { status: 'AVAILABLE', conflicts: [], warnings: [], sourcesChecked: [] }],
    ])) };
    const service = new PlanningActionsService(prisma as never, scheduling as never, engine());
    const result = await service.createAndPlan({ projectId: fixture.project.id, activityTypeId: typeId,
      startUtc: '2027-02-03T15:00:00.000Z', durationMinutes: 60, leadUserId: fixture.owner.id,
      supportUserIds: [], confirmUnknown: true }, admin());
    expect(await prisma.projectTaskList.count({ where: { activityId: result.activityId, taskListId: lists.C } })).toBe(1);
    expect(await prisma.booking.count({ where: { id: result.bookingId, activityId: result.activityId } })).toBe(1);
  });

  it.each([
    ['project Activity', async (failing: ActivityTaskListsService) => new ActivitiesService(prisma as never, activityTypes(), failing)
      .createActivity(fixture.project.id, admin(), { activityTypeId: typeId, notes: `rollback-page-${suffix}` })],
    ['Planner backlog', async (failing: ActivityTaskListsService) => new PlanningService(prisma as never, {} as never, {} as never, failing)
      .createUnplannedActivity({ projectId: fixture.project.id, activityTypeId: typeId, notes: `rollback-backlog-${suffix}` }, admin())],
    ['create-and-plan', async (failing: ActivityTaskListsService) => new PlanningActionsService(prisma as never, {} as never, failing)
      .createAndPlan({ projectId: fixture.project.id, activityTypeId: typeId, notes: `rollback-plan-${suffix}`,
        startUtc: '2027-02-04T15:00:00.000Z', durationMinutes: 60, leadUserId: fixture.owner.id,
        supportUserIds: [], confirmUnknown: true }, admin())],
  ])('rolls back the Activity when %s automatic instantiation fails', async (_label, invoke) => {
    const failing = { instantiateMissingTaskListsForActivity: jest.fn().mockRejectedValue(new Error('automatic instantiation failure')) };
    const counts = () => Promise.all([
      prisma.projectActivity.count({ where: { projectId: fixture.project.id } }),
      prisma.projectTaskList.count({ where: { projectId: fixture.project.id } }),
      prisma.projectTask.count({ where: { projectId: fixture.project.id } }),
      prisma.booking.count({ where: { projectId: fixture.project.id } }),
      prisma.bookingAssignment.count({ where: { booking: { projectId: fixture.project.id } } }),
      prisma.notification.count({ where: { projectId: fixture.project.id } }),
      prisma.auditLog.count({ where: { projectId: fixture.project.id } }),
    ]);
    const before = await counts();
    await expect(invoke(failing as unknown as ActivityTaskListsService)).rejects.toThrow('automatic instantiation failure');
    expect(await counts()).toEqual(before);
  });
});
