import { NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';

const admin = { userId: 'admin-a', organizationId: 'org-a', role: 'ADMIN' };

function harness() {
  const prisma = {
    project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-a' }) },
    projectActivity: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    projectTask: { findMany: jest.fn().mockResolvedValue([]) },
    projectTaskList: { findFirst: jest.fn() },
    activityType: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null), deleteMany: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'project-a' }]),
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
  };
  const activityTypes = { list: jest.fn().mockResolvedValue([]), resolveTaskLists: jest.fn().mockResolvedValue([]) };
  const activityTaskLists = { instantiateMissingTaskListsForActivity: jest.fn().mockResolvedValue({ createdLists: [] }) };
  return { prisma, activityTypes, activityTaskLists,
    service: new ActivitiesService(prisma as never, activityTypes as never, activityTaskLists as never) };
}

describe('ActivitiesService exercise report summary', () => {
  it('applies catalog defaults once when creating an activity', async () => {
    const h = harness();
    h.prisma.activityType.findFirst.mockResolvedValue({ id:'type-a', code:'custom-inspection', nameFR:'Inspection', defaultDurationMinutes:90, clientBookableDefault:true });
    h.prisma.projectActivity.create.mockImplementation(({ data }: any) => ({ id: 'activity-a', ...data }));
    const result:any = await h.service.createActivity('project-a', admin,{ activityTypeId:'type-a' });
    expect(result).toMatchObject({ activityTypeId:'type-a', type:'custom-inspection', label:'Inspection', duration:'1h30', dureeHeures:1.5, clientBookable:true });
    expect(h.activityTaskLists.instantiateMissingTaskListsForActivity).toHaveBeenCalledWith(
      h.prisma, 'project-a', 'activity-a', admin,
    );
  });

  it('keeps legacy creation without a canonical type outside automatic instantiation', async () => {
    const h = harness();
    h.prisma.projectActivity.create.mockImplementation(({ data }: any) => ({ id: 'legacy', ...data }));
    await h.service.createActivity('project-a', admin, { type: 'legacy', label: 'Legacy' });
    expect(h.activityTaskLists.instantiateMissingTaskListsForActivity).not.toHaveBeenCalled();
  });

  it('propagates instantiation failure from the same creation transaction', async () => {
    const h = harness();
    h.prisma.activityType.findFirst.mockResolvedValue({ id: 'type-a', code: 'inspection', nameFR: 'Inspection' });
    h.prisma.projectActivity.create.mockResolvedValue({ id: 'activity-a', activityTypeId: 'type-a' });
    h.activityTaskLists.instantiateMissingTaskListsForActivity.mockRejectedValue(new Error('instantiation failed'));
    await expect(h.service.createActivity('project-a', admin, { activityTypeId: 'type-a' }))
      .rejects.toThrow('instantiation failed');
  });

  it('requires a custom label for the system Other type', async () => {
    const h = harness(); h.prisma.activityType.findFirst.mockResolvedValue({ id:'other', code:'autre', nameFR:'Autre' });
    await expect(h.service.createActivity('project-a', admin,{ activityTypeId:'other' })).rejects.toThrow('libellé personnalisé');
  });
  it('emits one UTC Z suffix in activity ICS dates', () => {
    const ics = harness().service.generateIcs({ id: 'activity-a', scheduledDate: new Date('2026-10-01T13:00:00Z'), duration: '1h', title: 'Test' });
    expect(ics).toContain('DTSTART:20261001T130000Z');
    expect(ics).not.toMatch(/\dZZ/);
  });
  it('returns an admissible activity without a report', async () => {
    const h = harness();
    h.prisma.projectActivity.findMany.mockResolvedValue([
      { id: 'activity-a', type: 'exercice_table', exerciseReport: null, tasks: [] },
    ]);
    await expect(h.service.getActivities('project-a', admin)).resolves.toEqual([
      { id: 'activity-a', type: 'exercice_table', exerciseReport: null, tasks: [], taskCount: 0,
        taskCompletedCount: 0, taskOpenCount: 0, taskProgressPercent: null, actualHours: 0 },
    ]);
  });

  it('includes a lightweight report summary in the same activity query', async () => {
    const h = harness();
    h.prisma.projectActivity.findMany.mockResolvedValue([
      {
        id: 'activity-a',
        type: 'exercice_evacuation',
        exerciseReport: { id: 'report-a', status: 'DRAFT' },
        tasks: [],
      },
    ]);
    const result = await h.service.getActivities('project-a', admin);
    expect(result[0].exerciseReport).toEqual({
      id: 'report-a',
      status: 'DRAFT',
    });
    expect(h.prisma.projectActivity.findMany).toHaveBeenCalledTimes(1);
    expect(h.prisma.projectActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          exerciseReport: { select: { id: true, status: true } },
          tasks: {
            include: {
              assignee: { select: { id: true, firstName: true, lastName: true } },
              assignees: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
              timeEntries: { select: { heures: true } },
            },
            orderBy: [{ order: 'asc' }, { taskTitle: 'asc' }, { id: 'asc' }],
          },
        },
      }),
    );
  });

  it('computes deterministic task aggregates and actual hours without N+1 queries', async () => {
    const h = harness();
    h.prisma.projectActivity.findMany.mockResolvedValue([{ id: 'activity-a', exerciseReport: null, tasks: [
      { id: 'task-b', taskTitle: 'B', status: 'a_faire', timeEntries: [{ heures: 0.5 }], assignees: [] },
      { id: 'task-a', taskTitle: 'A', status: 'fait', timeEntries: [{ heures: 1 }, { heures: 0.75 }], assignees: [] },
    ] }]);
    const [activity] = await h.service.getActivities('project-a', admin);
    expect(activity).toMatchObject({ taskCount: 2, taskCompletedCount: 1, taskOpenCount: 1,
      taskProgressPercent: 50, actualHours: 2.25 });
    expect(activity.tasks.map((task: any) => task.actualHours)).toEqual([0.5, 1.75]);
    expect(h.prisma.projectActivity.findMany).toHaveBeenCalledTimes(1);
    expect(h.prisma.projectTask.findMany).not.toHaveBeenCalled();
    expect(h.prisma.projectActivity.create).not.toHaveBeenCalled();
  });

  it('projects applicable, missing, instantiated, historical and direct Activity work without task N+1', async () => {
    const h = harness();
    h.activityTypes.resolveTaskLists.mockResolvedValue([
      { id: 'list-current', name: 'Actuelle' }, { id: 'list-missing', name: 'Nouvelle' },
    ]);
    h.prisma.projectActivity.findFirst.mockResolvedValue({
      id: 'activity-a', status: 'a_faire', activityTypeId: 'type-a', project: { documentType: 'PMU' },
      taskLists: [
        { id: 'instance-current', taskListId: 'list-current', customName: 'Actuelle',
          instantiationSource: 'ACTIVITY_TYPE_CONFIG', taskList: { id: 'list-current', name: 'Actuelle' } },
        { id: 'instance-old', taskListId: 'list-old', customName: 'Ancienne',
          instantiationSource: 'ACTIVITY_TYPE_CONFIG', taskList: { id: 'list-old', name: 'Ancienne' } },
      ],
      tasks: [
        { id: 'task-current', projectTaskListId: 'instance-current', status: 'fait', timeEntries: [{ heures: 2 }], assignees: [] },
        { id: 'task-old', projectTaskListId: 'instance-old', status: 'a_faire', timeEntries: [{ heures: 1 }], assignees: [] },
        { id: 'task-direct', projectTaskListId: null, status: 'a_faire', timeEntries: [{ heures: 0.5 }], assignees: [] },
      ],
    });

    const result: any = await h.service.getActivityTasks('project-a', 'activity-a', admin);

    expect(result).toMatchObject({
      canonicalTypeMissing: false, isCancelled: false,
      currentApplicableTaskLists: [{ taskListId: 'list-current', name: 'Actuelle' }, { taskListId: 'list-missing', name: 'Nouvelle' }],
      missingTaskLists: [{ taskListId: 'list-missing', name: 'Nouvelle' }],
      directTasks: [{ id: 'task-direct', actualHours: 0.5 }],
      taskCount: 3, taskCompletedCount: 1, actualHours: 3.5,
    });
    expect(result.instantiatedTaskLists).toEqual([
      expect.objectContaining({ projectTaskListId: 'instance-current', taskListId: 'list-current',
        isCurrentlyApplicable: true, taskCount: 1, completedCount: 1, actualHours: 2 }),
      expect.objectContaining({ projectTaskListId: 'instance-old', taskListId: 'list-old',
        isCurrentlyApplicable: false, taskCount: 1, completedCount: 0, actualHours: 1 }),
    ]);
    expect(result.historicalTaskLists).toHaveLength(1);
    expect(h.activityTypes.resolveTaskLists).toHaveBeenCalledWith({
      activityTypeId: 'type-a', organizationId: 'org-a', documentType: 'PMU',
    });
    expect(h.prisma.projectTask.findMany).not.toHaveBeenCalled();
  });

  it('does not heuristically resolve a legacy Activity without a canonical type', async () => {
    const h = harness();
    h.prisma.projectActivity.findFirst.mockResolvedValue({ id: 'legacy', status: 'a_faire', activityTypeId: null,
      project: { documentType: 'PMU' }, taskLists: [], tasks: [] });
    await expect(h.service.getActivityTasks('project-a', 'legacy', admin)).resolves.toMatchObject({
      canonicalTypeMissing: true, currentApplicableTaskLists: [], missingTaskLists: [],
    });
    expect(h.activityTypes.resolveTaskLists).not.toHaveBeenCalled();
  });

  it('returns only eligible transversal tasks from the same project and tenant', async () => {
    const h = harness();
    h.prisma.projectActivity.findFirst.mockResolvedValue({ id: 'activity-a' });
    await h.service.getTaskCandidates('project-a', 'activity-a', admin);
    expect(h.prisma.projectTask.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { projectId: 'project-a', organizationId: 'org-a', activityId: null,
        status: 'a_faire', timeEntries: { none: {} } },
      orderBy: [{ order: 'asc' }, { taskTitle: 'asc' }, { id: 'asc' }],
    }));
  });

  it('rejects an operator without project access', async () => {
    const h = harness();
    h.prisma.project.findFirst.mockResolvedValue(null);
    await expect(
      h.service.getActivities('project-a', {
        userId: 'operator-b',
        organizationId: 'org-a',
        role: 'OPERATOR',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(h.prisma.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'project-a',
        organizationId: 'org-a',
        OR: [{ userId: 'operator-b' }, { lastEditedById: 'operator-b' }],
      },
      select: { id: true },
    });
  });
});

describe('ActivitiesService mandate origin', () => {
  it('creates canonical Mandate work and delegates checklist creation in the same transaction', async () => {
    const h = harness();
    h.prisma.activityType.findMany.mockResolvedValue([{ id: 'type-a', code: 'inspection', nameFR: 'Inspection',
      defaultDurationMinutes: 90, clientBookableDefault: false }]);
    h.prisma.projectActivity.findMany.mockResolvedValue([]);
    h.prisma.projectActivity.create.mockImplementation(({ data }: any) => ({ id: 'activity-a', ...data }));
    await h.service.generateFromMandate('project-a', admin, [{ activityTypeId: 'type-a', isRecurring: true }]);
    expect(h.prisma.projectActivity.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      activityTypeId: 'type-a', sourceMandate: true, type: 'inspection', isRecurring: true,
    }) });
    expect(h.activityTaskLists.instantiateMissingTaskListsForActivity).toHaveBeenCalledWith(
      h.prisma, 'project-a', 'activity-a', admin,
    );
    expect((h.prisma as any).taskList).toBeUndefined();
  });

  it('rejects legacy code-only input instead of creating new legacy work', async () => {
    const h = harness();
    await expect(h.service.generateFromMandate('project-a', admin,
      [{ type: 'inspection', isRecurring: false } as any]))
      .rejects.toThrow("type d'activit");
    expect(h.prisma.projectActivity.create).not.toHaveBeenCalled();
  });

  it('reuses canonical Mandate work without adopting a legacy Activity', async () => {
    const h = harness();
    h.prisma.activityType.findMany.mockResolvedValue([{ id: 'type-a', code: 'inspection', nameFR: 'Inspection',
      defaultDurationMinutes: 60, clientBookableDefault: false }]);
    h.prisma.projectActivity.findMany.mockResolvedValue([{ id: 'canonical', activityTypeId: 'type-a', status: 'a_faire',
      bookings: [], exerciseReport: null, tasks: [], taskLists: [] }]);
    h.prisma.projectActivity.update.mockResolvedValue({ id: 'canonical', activityTypeId: 'type-a' });
    await h.service.generateFromMandate('project-a', admin, [{ activityTypeId: 'type-a', isRecurring: false }]);
    expect(h.prisma.projectActivity.update).toHaveBeenCalledWith({ where: { id: 'canonical' }, data: { isRecurring: false } });
    expect(h.prisma.projectActivity.create).not.toHaveBeenCalled();
  });

  it('cancels deselected Mandate work with checklists rather than deleting history', async () => {
    const h = harness();
    h.prisma.projectActivity.findMany.mockResolvedValue([{ id: 'activity-a', activityTypeId: 'type-a', status: 'a_faire',
      bookings: [], exerciseReport: null, tasks: [{ id: 'task-a' }], taskLists: [{ id: 'list-a' }] }]);
    await h.service.generateFromMandate('project-a', admin, []);
    expect(h.prisma.projectActivity.update).toHaveBeenCalledWith({ where: { id: 'activity-a' }, data: {
      status: 'annule', scheduledDate: null, reportedDate: null,
    } });
    expect(h.prisma.projectActivity.delete).not.toHaveBeenCalled();
  });

  it('refuses changing ActivityType after a configured checklist exists', async () => {
    const h = harness();
    h.prisma.projectActivity.findFirst.mockResolvedValue({ id: 'activity-a', activityTypeId: 'old', type: 'old', clientVisible: true, clientBookable: false });
    h.prisma.activityType.findFirst.mockResolvedValue({ id: 'new', code: 'new', nameFR: 'Nouveau' });
    h.prisma.projectTaskList.findFirst.mockResolvedValue({ id: 'instance-a' });
    await expect(h.service.updateActivity('activity-a', 'org-a', { activityTypeId: 'new' }))
      .rejects.toThrow("ne peut plus être modifié");
    expect(h.prisma.projectActivity.update).not.toHaveBeenCalled();
  });

  it('does not let the generic update forge sourceMandate', async () => {
    const h = harness();
    (h.prisma.projectActivity as any).findFirst = jest.fn().mockResolvedValue({
      id: 'activity-a', clientVisible: true, clientBookable: false,
    });
    (h.prisma.projectActivity as any).update = jest.fn().mockResolvedValue({});
    await h.service.updateActivity('activity-a', 'org-a', { sourceMandate: true, notes: 'note' });
    expect((h.prisma.projectActivity as any).update).toHaveBeenCalledWith({
      where: { id: 'activity-a' }, data: { notes: 'note' },
    });
  });
});
