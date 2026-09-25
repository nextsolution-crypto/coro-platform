import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActivityTaskListsService } from './activity-task-lists.service';

const actor = { userId: 'user-a', organizationId: 'org-a', role: 'OPERATOR' };

function harness(overrides: { activity?: any; project?: any; resolved?: any[]; existing?: any[] } = {}) {
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'activity-a' }]),
    project: { findFirst: jest.fn().mockResolvedValue('project' in overrides ? overrides.project : { id: 'project-a', organizationId: 'org-a', documentType: 'PMU' }) },
    projectActivity: { findFirst: jest.fn().mockResolvedValue(overrides.activity ?? {
      id: 'activity-a', projectId: 'project-a', organizationId: 'org-a', activityTypeId: 'type-a', status: 'a_faire',
    }) },
    projectTaskList: {
      findMany: jest.fn().mockResolvedValue(overrides.existing ?? []),
      create: jest.fn().mockImplementation(({ data }: any) => ({ id: `instance-${data.taskListId}`, ...data })),
    },
    taskTemplate: { findMany: jest.fn().mockResolvedValue([
      { id: 'template-a', categoryName: 'Préparation', taskTitle: 'Préparer', order: 10 },
    ]) },
    projectTask: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-a' }) },
  };
  const prisma: any = { $transaction: jest.fn((callback: any) => callback(tx)) };
  const activityTypes: any = { resolveTaskLists: jest.fn().mockResolvedValue(overrides.resolved ?? [{
    id: 'list-a', name: 'Inspection', sourceActivityTypeTaskListId: 'association-a',
  }]) };
  return { tx, prisma, activityTypes, service: new ActivityTaskListsService(prisma, activityTypes) };
}

describe('ActivityTaskListsService', () => {
  it('creates list and task snapshots with Activity provenance and one audit', async () => {
    const h = harness();
    await expect(h.service.instantiateForActor('project-a', 'activity-a', actor)).resolves.toEqual({
      createdLists: ['list-a'], existingLists: [], createdTasks: 1,
    });
    expect(h.activityTypes.resolveTaskLists).toHaveBeenCalledWith({
      activityTypeId: 'type-a', organizationId: 'org-a', documentType: 'PMU',
    }, h.tx);
    expect(h.tx.projectTask.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({
      activityId: 'activity-a', projectTaskListId: 'instance-list-a', templateId: 'template-a',
      projectId: 'project-a', organizationId: 'org-a', status: 'a_faire',
    })] });
    expect(h.tx.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('is additive and returns an audit-free no-op for existing or empty resolution', async () => {
    const existing = harness({ existing: [{ id: 'instance-a', taskListId: 'list-a' }] });
    await expect(existing.service.instantiateForActor('project-a', 'activity-a', actor)).resolves.toEqual({
      createdLists: [], existingLists: ['list-a'], createdTasks: 0,
    });
    expect(existing.tx.projectTaskList.create).not.toHaveBeenCalled();
    expect(existing.tx.auditLog.create).not.toHaveBeenCalled();
    const disabled = harness({ resolved: [] });
    await disabled.service.instantiateForActor('project-a', 'activity-a', actor);
    expect(disabled.tx.projectTaskList.create).not.toHaveBeenCalled();
  });

  it('rejects cancelled, legacy, cross-project and client requests without writes', async () => {
    const cancelled = harness({ activity: { id: 'activity-a', projectId: 'project-a', organizationId: 'org-a', activityTypeId: 'type-a', status: 'annule' } });
    await expect(cancelled.service.instantiateForActor('project-a', 'activity-a', actor)).rejects.toBeInstanceOf(BadRequestException);
    const legacy = harness({ activity: { id: 'activity-a', projectId: 'project-a', organizationId: 'org-a', activityTypeId: null, status: 'a_faire' } });
    await expect(legacy.service.instantiateForActor('project-a', 'activity-a', actor)).rejects.toBeInstanceOf(BadRequestException);
    const inaccessible = harness({ project: null });
    await expect(inaccessible.service.instantiateForActor('project-a', 'activity-a', actor)).rejects.toBeInstanceOf(NotFoundException);
    await expect(harness().service.instantiateForActor('project-a', 'activity-a', { ...actor, role: 'CLIENT_MANAGER' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('propagates a template-copy failure so the caller transaction can roll back', async () => {
    const h = harness();
    h.tx.projectTask.createMany.mockRejectedValue(new Error('template 6 failed'));
    await expect(h.service.instantiateForActor('project-a', 'activity-a', actor)).rejects.toThrow('template 6 failed');
    expect(h.tx.auditLog.create).not.toHaveBeenCalled();
  });
});
