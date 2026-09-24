import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MandateController } from './mandate.controller';
import { MandateService } from './mandate.service';

const actor = { userId: 'admin-a', organizationId: 'org-a', role: 'ADMIN' };
const baseTask = {
  id: 'task-a', projectId: 'project-a', organizationId: 'org-a', activityId: null,
  status: 'a_faire', _count: { timeEntries: 0 },
};

function harness(task: any = baseTask) {
  const tx = {
    project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-a' }) },
    projectTask: {
      findFirst: jest.fn().mockResolvedValue(task),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue({ ...task, activityId: 'activity-a' }),
      create: jest.fn().mockResolvedValue({ ...task, activityId: 'activity-a', taskTitle: 'Nouvelle tâche' }),
    },
    projectActivity: {
      findFirst: jest.fn().mockResolvedValue({ id: 'activity-a', projectId: 'project-a' }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-a' }) },
    user: { findFirst: jest.fn().mockResolvedValue({ id: 'advisor-a' }) },
  };
  const prisma = { $transaction: jest.fn(async (callback: any) => callback(tx)) };
  return { tx, prisma, service: new MandateService(prisma as any) };
}

describe('ProjectTask activity provenance', () => {
  it('links a virgin task to an Activity from the same project and audits it atomically', async () => {
    const { service, tx, prisma } = harness();
    await service.setTaskActivity('project-a', 'task-a', 'activity-a', actor);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.projectActivity.findFirst).toHaveBeenCalledWith({
      where: { id: 'activity-a', organizationId: 'org-a' }, select: { id: true, projectId: true },
    });
    expect(tx.projectTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'task-a', projectId: 'project-a', organizationId: 'org-a', activityId: null }),
      data: { activityId: 'activity-a' },
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'TASK_LINKED_TO_ACTIVITY', entityId: 'task-a', projectId: 'project-a',
      organizationId: 'org-a', userId: 'admin-a',
    }) });
  });

  it('refuses cross-project and cross-tenant targets', async () => {
    const h = harness();
    h.tx.projectActivity.findFirst.mockResolvedValueOnce({ id: 'activity-b', projectId: 'project-b' });
    await expect(h.service.setTaskActivity('project-a', 'task-a', 'activity-b', actor))
      .rejects.toBeInstanceOf(BadRequestException);
    h.tx.projectActivity.findFirst.mockResolvedValueOnce(null);
    await expect(h.service.setTaskActivity('project-a', 'task-a', 'foreign-activity', actor))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(h.tx.projectTask.updateMany).not.toHaveBeenCalled();
  });

  it('refuses an implicit relink and any provenance change after work started', async () => {
    const linked = harness({ ...baseTask, activityId: 'activity-old' });
    await expect(linked.service.setTaskActivity('project-a', 'task-a', 'activity-new', actor))
      .rejects.toBeInstanceOf(ConflictException);
    const timed = harness({ ...baseTask, activityId: 'activity-old', _count: { timeEntries: 1 } });
    await expect(timed.service.setTaskActivity('project-a', 'task-a', null, actor))
      .rejects.toBeInstanceOf(ConflictException);
    const started = harness({ ...baseTask, activityId: 'activity-old', status: 'en_cours' });
    await expect(started.service.setTaskActivity('project-a', 'task-a', null, actor))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('unlinks a virgin task, audits it, and treats an old NULL task as an idempotent no-op', async () => {
    const linked = harness({ ...baseTask, activityId: 'activity-a' });
    await linked.service.setTaskActivity('project-a', 'task-a', null, actor);
    expect(linked.tx.projectTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { activityId: null } }));
    expect(linked.tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'TASK_UNLINKED_FROM_ACTIVITY', metadata: { previousActivityId: 'activity-a', activityId: null },
    }) });

    const legacy = harness();
    await legacy.service.setTaskActivity('project-a', 'task-a', null, actor);
    expect(legacy.tx.projectTask.updateMany).not.toHaveBeenCalled();
    expect(legacy.tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('detects a concurrent provenance change instead of overwriting it', async () => {
    const h = harness();
    h.tx.projectTask.updateMany.mockResolvedValue({ count: 0 });
    await expect(h.service.setTaskActivity('project-a', 'task-a', 'activity-a', actor))
      .rejects.toBeInstanceOf(ConflictException);
    expect(h.tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('rejects client roles at the mutation boundary', async () => {
    const service = { setTaskActivity: jest.fn(), createTask: jest.fn() };
    const controller = new MandateController(service as any);
    expect(() => controller.setTaskActivity('project-a', 'task-a', { activityId: 'activity-a' }, {
      user: { userId: 'client-a', organizationId: 'org-a', role: 'CLIENT' },
    })).toThrow(ForbiddenException);
    expect(() => controller.createTask('project-a', { taskTitle: 'Forbidden' }, {
      user: { userId: 'client-a', organizationId: 'org-a', role: 'CLIENT_MANAGER' },
    })).toThrow(ForbiddenException);
    expect(service.setTaskActivity).not.toHaveBeenCalled();
    expect(service.createTask).not.toHaveBeenCalled();
  });

  it('applies the existing operator project scope before reading the task', async () => {
    const h = harness();
    h.tx.project.findFirst.mockResolvedValue(null);
    await expect(h.service.setTaskActivity('project-a', 'task-a', 'activity-a', {
      userId: 'operator-b', organizationId: 'org-a', role: 'OPERATOR',
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(h.tx.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'project-a', organizationId: 'org-a',
        OR: [{ userId: 'operator-b' }, { lastEditedById: 'operator-b' }],
      },
      select: { id: true },
    });
    expect(h.tx.projectTask.findFirst).not.toHaveBeenCalled();
  });

  it('creates a manual task directly in an Activity through the canonical task service', async () => {
    const h = harness();
    const result = await h.service.createTask('project-a', {
      activityId: 'activity-a', taskTitle: ' Nouvelle tâche ', categoryName: 'Suivi', dueDate: '2026-10-01',
    }, actor);
    expect(result).toMatchObject({ activityId: 'activity-a', taskTitle: 'Nouvelle tâche' });
    expect(h.tx.projectActivity.findFirst).toHaveBeenCalledWith({
      where: { id: 'activity-a', projectId: 'project-a', organizationId: 'org-a' }, select: { id: true },
    });
    expect(h.tx.projectTask.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      projectId: 'project-a', organizationId: 'org-a', activityId: 'activity-a',
      taskTitle: 'Nouvelle tâche', categoryName: 'Suivi', status: 'a_faire',
    }) }));
  });

  it('does not create a task when a known Activity belongs to another project or tenant', async () => {
    const h = harness();
    h.tx.projectActivity.findFirst.mockResolvedValue(null);
    await expect(h.service.createTask('project-a', {
      activityId: 'foreign-activity', taskTitle: 'Forbidden',
    }, actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(h.tx.projectTask.create).not.toHaveBeenCalled();
  });

  it('keeps independent and listed tasks in the canonical Project task read model', async () => {
    const tasks = [
      { id: 'listed', projectTaskListId: 'list-a', activityId: 'activity-a' },
      { id: 'independent-linked', projectTaskListId: null, activityId: 'activity-a' },
      { id: 'independent-transversal', projectTaskListId: null, activityId: null },
    ];
    const prisma = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-a' }) },
      projectTask: { findMany: jest.fn().mockResolvedValue(tasks) },
    };
    const result = await new MandateService(prisma as any).getTasks('project-a', 'org-a');
    expect(result).toEqual(tasks);
    expect(prisma.projectTask.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { projectId: 'project-a', organizationId: 'org-a' },
      include: expect.objectContaining({
        activity: { select: { id: true, label: true, customLabel: true } },
      }),
      orderBy: [{ order: 'asc' }, { taskTitle: 'asc' }, { id: 'asc' }],
    }));
  });
});
