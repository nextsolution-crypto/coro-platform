import { MandateService } from './mandate.service';
import { TaskListsService } from '../task-lists/task-lists.service';

const actor = {
  userId: 'operator-a',
  organizationId: 'org-a',
  role: 'OPERATOR',
};

function harness(state: { status: string; isActive: boolean }) {
  const project = { id: 'project-a', organizationId: 'org-a', ...state };
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: project.id }]),
    project: { findFirst: jest.fn().mockResolvedValue(project) },
    projectTask: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue({
        id: 'task-a',
        projectId: project.id,
        organizationId: 'org-a',
      }),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    taskTemplate: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'template-a', categoryName: 'QA', taskTitle: 'QA', order: 1 },
        ]),
    },
    taskTimeEntry: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue({ id: 'time-a' }),
      delete: jest.fn(),
    },
    projectComment: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue({ id: 'comment-a' }),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectMandate: { upsert: jest.fn(), update: jest.fn() },
    user: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma: any = {
    $transaction: jest.fn((callback: any) => callback(tx)),
  };
  return { tx, service: new MandateService(prisma) };
}

describe('Archived and inactive Project read-only policy', () => {
  it.each([
    ['archived', { status: 'ARCHIVED', isActive: true }],
    ['inactive', { status: 'IN_PROGRESS', isActive: false }],
  ])(
    'refuses every Mandate mutation before any write for an %s project',
    async (_label, state) => {
      const { service, tx } = harness(state);
      const attempts = [
        () => service.initTasksFromTemplate('project-a', actor, 'PMU'),
        () =>
          service.createTask('project-a', { taskTitle: 'Forbidden' }, actor),
        () =>
          service.updateTask('project-a', 'task-a', actor, { status: 'fait' }),
        () => service.setTaskActivity('project-a', 'task-a', null, actor),
        () =>
          service.addTimeEntry('project-a', 'task-a', actor, {
            date: '2026-11-02',
            heures: 1,
          }),
        () => service.deleteTimeEntry('project-a', 'time-a', actor),
        () => service.addComment('project-a', actor, 'Forbidden'),
        () =>
          service.updateComment('project-a', 'comment-a', actor, 'Forbidden'),
        () => service.deleteComment('project-a', 'comment-a', actor),
        () => service.saveMandate('project-a', actor, {}),
      ];
      for (const attempt of attempts) {
        await expect(attempt()).rejects.toThrow(
          'Ce projet est archivé ou inactif et demeure en lecture seule.',
        );
      }
      expect(tx.$queryRaw).toHaveBeenCalledTimes(attempts.length);
      expect(tx.projectTask.create).not.toHaveBeenCalled();
      expect(tx.projectTask.createMany).not.toHaveBeenCalled();
      expect(tx.projectTask.update).not.toHaveBeenCalled();
      expect(tx.projectTask.updateMany).not.toHaveBeenCalled();
      expect(tx.taskTimeEntry.create).not.toHaveBeenCalled();
      expect(tx.taskTimeEntry.delete).not.toHaveBeenCalled();
      expect(tx.projectComment.create).not.toHaveBeenCalled();
      expect(tx.projectComment.update).not.toHaveBeenCalled();
      expect(tx.projectComment.delete).not.toHaveBeenCalled();
      expect(tx.projectMandate.upsert).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
    },
  );

  it('locks and rechecks the Project before an active-project task write', async () => {
    const { service, tx } = harness({ status: 'IN_PROGRESS', isActive: true });
    tx.projectTask.create.mockResolvedValue({ id: 'task-new' });
    await service.createTask('project-a', { taskTitle: 'Allowed' }, actor);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.project.findFirst).toHaveBeenCalledTimes(2);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.projectTask.create.mock.invocationCallOrder[0],
    );
  });

  it('refuses the legacy TaskList import path before it creates a list or tasks', async () => {
    const project = {
      id: 'project-a',
      organizationId: 'org-a',
      status: 'ARCHIVED',
      isActive: true,
    };
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: project.id }]),
      project: { findFirst: jest.fn().mockResolvedValue(project) },
      taskList: { findFirst: jest.fn() },
      projectTaskList: { create: jest.fn(), findUnique: jest.fn() },
      projectTask: { createMany: jest.fn() },
    };
    const prisma: any = {
      $transaction: jest.fn((callback: any) => callback(tx)),
    };
    await expect(
      new TaskListsService(prisma).importToProject(
        'list-a',
        'project-a',
        '',
        actor,
      ),
    ).rejects.toThrow(
      'Ce projet est archivé ou inactif et demeure en lecture seule.',
    );
    expect(tx.taskList.findFirst).not.toHaveBeenCalled();
    expect(tx.projectTaskList.create).not.toHaveBeenCalled();
    expect(tx.projectTask.createMany).not.toHaveBeenCalled();
  });
});
