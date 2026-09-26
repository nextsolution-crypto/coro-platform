import { NotFoundException } from '@nestjs/common';
import { MandateService } from './mandate.service';

const operator = { userId: 'operator-a', organizationId: 'org-a', role: 'OPERATOR' };
const task = (id: string, activityId: string | null, projectTaskListId: string | null, status = 'a_faire', heures = 0) => ({
  id, activityId, projectTaskListId, taskTitle: id, categoryName: 'Travail', status, dueDate: null,
  assigneeId: null, assignee: null, assignees: [], timeEntries: heures ? [{ heures }] : [],
});

function harness(project: any) {
  const prisma: any = { project: { findFirst: jest.fn().mockResolvedValue(project) } };
  const activityTypes: any = { resolveTaskListsMany: jest.fn().mockResolvedValue(new Map([
    ['type-a', [{ id: 'list-current', name: 'Actuelle' }, { id: 'list-missing', name: 'Nouvelle' }]],
  ])) };
  return { prisma, activityTypes, service: new MandateService(prisma, activityTypes) };
}

const project = {
  id: 'project-a', name: 'Mandat A', documentType: 'PMU', mandate: { heuresBudgetees: 20 },
  activities: [
    { id: 'activity-a', activityTypeId: 'type-a', label: 'Inspection', customLabel: null, duration: '2h',
      scheduledDate: null, status: 'a_faire',
      taskLists: [
        { id: 'instance-current', taskListId: 'list-current', customName: 'Actuelle',
          instantiationSource: 'ACTIVITY_TYPE_CONFIG', taskList: { name: 'Actuelle' } },
        { id: 'instance-old', taskListId: 'list-old', customName: 'Ancienne',
          instantiationSource: 'ACTIVITY_TYPE_CONFIG', taskList: { name: 'Ancienne' } },
      ],
      bookings: [{ id: 'booking-a', status: 'CONFIRMEE', requestedDate: new Date(), reportedDate: null, duration: 120,
        assignments: [{ status: 'ACCEPTED', user: { id: 'lead-a', firstName: 'Steve', lastName: 'Parker' } }] }],
    },
    { id: 'activity-b', activityTypeId: null, label: 'Legacy', customLabel: null, duration: '', scheduledDate: null,
      status: 'annule', taskLists: [], bookings: [] },
  ],
  projectTaskLists: [
    { id: 'instance-current', activityId: 'activity-a', taskListId: 'list-current', customName: 'Actuelle',
      instantiationSource: 'ACTIVITY_TYPE_CONFIG', taskList: { name: 'Actuelle' } },
    { id: 'instance-old', activityId: 'activity-a', taskListId: 'list-old', customName: 'Ancienne',
      instantiationSource: 'ACTIVITY_TYPE_CONFIG', taskList: { name: 'Ancienne' } },
    { id: 'legacy-list', activityId: null, taskListId: 'legacy', customName: 'Liste importée',
      instantiationSource: null, taskList: { name: 'Legacy' } },
  ],
  projectTasks: [
    task('check-current', 'activity-a', 'instance-current', 'fait', 2),
    task('check-old', 'activity-a', 'instance-old', 'a_faire', 1),
    task('direct', 'activity-a', null, 'a_faire', 0.5),
    task('linked-legacy', 'activity-a', 'legacy-list'),
    task('legacy', null, 'legacy-list'),
    task('transversal', null, null, 'fait', 1.5),
  ],
};

describe('MandateService consolidated work projection', () => {
  it('classifies every Task exactly once and projects Activity planning, work and budget', async () => {
    const h = harness(project);
    const result: any = await h.service.getWork('project-a', operator);
    const activity = result.activities[0];
    expect(activity).toMatchObject({ planningStatus: 'CONFIRMED', lead: { displayName: 'Steve Parker', status: 'ACCEPTED' },
      taskCount: 4, completedTaskCount: 1, actualHours: 3.5,
      missingTaskLists: [{ taskListId: 'list-missing', name: 'Nouvelle' }] });
    expect(activity.checklists).toHaveLength(2);
    expect(activity.checklists).toEqual(expect.arrayContaining([
      expect.objectContaining({ projectTaskListId: 'instance-current', isCurrentlyApplicable: true, taskCount: 1 }),
      expect.objectContaining({ projectTaskListId: 'instance-old', isCurrentlyApplicable: false, taskCount: 1 }),
    ]));
    expect(activity.directTasks.map((item: any) => item.id)).toEqual(['direct']);
    expect(activity.linkedExistingLists[0].tasks.map((item: any) => item.id)).toEqual(['linked-legacy']);
    expect(result.transversal.tasks.map((item: any) => item.id)).toEqual(['transversal']);
    expect(result.legacyLists[0].tasks.map((item: any) => item.id)).toEqual(['legacy']);
    expect(result.activities[1]).toMatchObject({ canonicalTypeMissing: true, status: 'annule', planningStatus: 'TO_PLAN' });
    expect(result.classification).toEqual({ activityTaskCount: 4, legacyTaskCount: 1, transversalTaskCount: 1, totalTaskCount: 6 });
    expect(result.summary).toEqual({ budgetHours: 20, actualHours: 5, plannedHours: 2,
      budgetRemainingHours: 15, unplannedRemainingHours: 13 });
    const projectedIds = [
      ...result.activities.flatMap((item: any) => [
        ...item.checklists.flatMap((list: any) => list.tasks.map((value: any) => value.id)),
        ...item.linkedExistingLists.flatMap((list: any) => list.tasks.map((value: any) => value.id)),
        ...item.directTasks.map((value: any) => value.id),
      ]),
      ...result.legacyLists.flatMap((list: any) => list.tasks.map((value: any) => value.id)),
      ...result.transversal.tasks.map((value: any) => value.id),
    ];
    expect(new Set(projectedIds).size).toBe(project.projectTasks.length);
    expect(projectedIds).toHaveLength(project.projectTasks.length);
    expect(h.prisma.project.findFirst).toHaveBeenCalledTimes(1);
    expect(h.prisma.project.findFirst.mock.calls[0][0].select.activities.select.bookings.where)
      .toEqual({ status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] } });
    expect(h.activityTypes.resolveTaskListsMany).toHaveBeenCalledTimes(1);
  });

  it('clamps both budget remainders at zero without changing actual or planned hours', async () => {
    const overBudget = structuredClone(project); overBudget.mandate.heuresBudgetees = 3;
    const result: any = await harness(overBudget).service.getWork('project-a', operator);
    expect(result.summary).toEqual({ budgetHours: 3, actualHours: 5, plannedHours: 2,
      budgetRemainingHours: 0, unplannedRemainingHours: 0 });
  });

  it('derives pending and terminal Booking planning states without using assigneeEmail', async () => {
    const pendingProject = structuredClone(project);
    pendingProject.activities[0].bookings[0].status = 'DEMANDEE';
    pendingProject.activities[0].bookings[0].assignments[0].status = 'PENDING';
    let result: any = await harness(pendingProject).service.getWork('project-a', operator);
    expect(result.activities[0].planningStatus).toBe('LEAD_PENDING');
    pendingProject.activities[0].bookings = [];
    result = await harness(pendingProject).service.getWork('project-a', operator);
    expect(result.activities[0].planningStatus).toBe('TO_PLAN');
  });

  it('applies project access and rejects an inaccessible tenant/project generically', async () => {
    const h = harness(null);
    await expect(h.service.getWork('foreign', operator)).rejects.toBeInstanceOf(NotFoundException);
    expect(h.activityTypes.resolveTaskListsMany).not.toHaveBeenCalled();
  });
});
