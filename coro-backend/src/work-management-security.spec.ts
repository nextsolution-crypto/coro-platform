import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { requireInternal, requireSuperAdmin, requireTenantAdmin } from './auth/work-management-access';
import { TaskTemplatesService } from './task-templates/task-templates.service';
import { TaskListsService } from './task-lists/task-lists.service';
import { TimelogService } from './timelog/timelog.service';
import { MandateService } from './mandate/mandate.service';
import { TaskListsController } from './task-lists/task-lists.controller';

const actor = (role: string, organizationId = 'org-a') => ({ userId: 'user-a', role, organizationId });
const model = () => new Proxy({}, { get: (target: any, key) => target[key] ||= jest.fn() });

describe('Work Management security hardening', () => {
  it.each(['CLIENT_MANAGER', 'CLIENT_CORPORATE'])('blocks client role %s from internal work management', role => {
    expect(() => requireInternal(actor(role))).toThrow(ForbiddenException);
  });

  it('allows operators into project operations but not tenant administration', () => {
    expect(() => requireInternal(actor('OPERATOR'))).not.toThrow();
    expect(() => requireTenantAdmin(actor('OPERATOR'))).toThrow(ForbiddenException);
  });

  it('reserves global administration to SUPER_ADMIN', () => {
    expect(() => requireSuperAdmin(actor('ADMIN'))).toThrow(ForbiddenException);
    expect(() => requireSuperAdmin(actor('SUPER_ADMIN'))).not.toThrow();
  });

  it('derives TaskTemplate organization instead of accepting body organizationId', async () => {
    const prisma: any = { taskTemplate: model() };
    prisma.taskTemplate.create.mockResolvedValue({ id: 'template' });
    await new TaskTemplatesService(prisma).create({ taskTitle: 'T', categoryName: 'C', organizationId: 'org-b' }, 'org-a');
    expect(prisma.taskTemplate.create.mock.calls[0][0].data.organizationId).toBe('org-a');
  });

  it('denies cross-tenant TaskTemplate update and leaves it unchanged', async () => {
    const prisma: any = { taskTemplate: model() };
    prisma.taskTemplate.findFirst.mockResolvedValue(null);
    await expect(new TaskTemplatesService(prisma).update('template-b', { taskTitle: 'pwned' }, 'org-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.taskTemplate.update).not.toHaveBeenCalled();
    expect(prisma.taskTemplate.findFirst).toHaveBeenCalledWith({ where: { id: 'template-b', organizationId: 'org-a' } });
  });

  it('denies cross-tenant TaskList mutation', async () => {
    const prisma: any = { taskList: model() };
    prisma.taskList.findFirst.mockResolvedValue(null);
    await expect(new TaskListsService(prisma).update('list-b', { name: 'pwned' }, 'org-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.taskList.update).not.toHaveBeenCalled();
  });

  it('allows same-tenant TaskList mutation', async () => {
    const prisma: any = { taskList: model() };
    prisma.taskList.findFirst.mockResolvedValue({ id: 'list-a', organizationId: 'org-a', name: 'Old' });
    prisma.taskList.update.mockResolvedValue({ id: 'list-a', name: 'New' });
    await new TaskListsService(prisma).update('list-a', { name: 'New' }, 'org-a');
    expect(prisma.taskList.update).toHaveBeenCalled();
  });

  it('denies importing a TaskList into a foreign Project before writes', async () => {
    const prisma: any = { project: model(), taskList: model(), projectTaskList: model(), projectTask: model() };
    prisma.project.findFirst.mockResolvedValue(null);
    await expect(new TaskListsService(prisma).importToProject('list', 'project-b', '', 'org-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.projectTaskList.create).not.toHaveBeenCalled();
  });

  it('denies cross-tenant ProjectTaskList rename', async () => {
    const prisma: any = { projectTaskList: model() };
    prisma.projectTaskList.findFirst.mockResolvedValue(null);
    await expect(new TaskListsService(prisma).renameProjectTaskList('list-b', 'pwned', 'org-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.projectTaskList.update).not.toHaveBeenCalled();
  });

  it('removes an empty same-tenant ProjectTaskList with one delete', async () => {
    const prisma: any = { projectTaskList: model(), projectTask: model() };
    prisma.projectTaskList.findFirst.mockResolvedValue({ id: 'list-a', organizationId: 'org-a' });
    prisma.projectTaskList.delete.mockResolvedValue({ id: 'list-a' });
    await new TaskListsService(prisma).deleteProjectTaskList('list-a', 'org-a');
    expect(prisma.projectTaskList.delete).toHaveBeenCalledWith({ where: { id: 'list-a' } });
    expect(prisma.projectTask.deleteMany).not.toHaveBeenCalled();
  });

  it('preserves Tasks by relying on ON DELETE SET NULL instead of deleting them', async () => {
    const prisma: any = { projectTaskList: model(), projectTask: model() };
    prisma.projectTaskList.findFirst.mockResolvedValue({ id: 'list-with-tasks', organizationId: 'org-a' });
    prisma.projectTaskList.delete.mockResolvedValue({ id: 'list-with-tasks' });
    await new TaskListsService(prisma).deleteProjectTaskList('list-with-tasks', 'org-a');
    expect(prisma.projectTask.deleteMany).not.toHaveBeenCalled();
    expect(prisma.projectTask.updateMany).not.toHaveBeenCalled();
  });

  it('denies cross-tenant ProjectTaskList removal before delete', async () => {
    const prisma: any = { projectTaskList: model(), projectTask: model() };
    prisma.projectTaskList.findFirst.mockResolvedValue(null);
    await expect(new TaskListsService(prisma).deleteProjectTaskList('list-b', 'org-a'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.projectTaskList.delete).not.toHaveBeenCalled();
    expect(prisma.projectTask.deleteMany).not.toHaveBeenCalled();
  });

  it('denies a client role from the ProjectTaskList removal route', async () => {
    const service: any = { deleteProjectTaskList: jest.fn() };
    const controller = new TaskListsController(service);
    expect(() => controller.deleteProjectTaskList('list-a', { user: actor('CLIENT_MANAGER') }))
      .toThrow(ForbiddenException);
    expect(service.deleteProjectTaskList).not.toHaveBeenCalled();
  });

  it('cannot update a global TimelogCategory through a tenant mutation', async () => {
    const prisma: any = { timelogCategory: model() };
    prisma.timelogCategory.findFirst.mockResolvedValue(null);
    await expect(new TimelogService(prisma).updateCategory('global', { label: 'pwned' }, 'org-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.timelogCategory.updateMany).not.toHaveBeenCalled();
    expect(prisma.timelogCategory.findFirst).toHaveBeenCalledWith({ where: { key: 'global', organizationId: 'org-a' } });
  });

  it('scopes TimelogEntry update by owner and tenant', async () => {
    const prisma: any = { timelogEntry: model() };
    prisma.timelogEntry.updateMany.mockResolvedValue({ count: 1 });
    await new TimelogService(prisma).updateEntry('entry', 'user-a', 'org-a', { heures: 1, note: '' });
    expect(prisma.timelogEntry.updateMany.mock.calls[0][0].where).toEqual({ id: 'entry', userId: 'user-a', organizationId: 'org-a' });
  });

  it('denies cross-tenant ProjectTask update', async () => {
    const prisma: any = { projectTask: model() };
    prisma.projectTask.findFirst.mockResolvedValue(null);
    await expect(new MandateService(prisma).updateTask('task-b', 'org-a', { status: 'fait' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.projectTask.update).not.toHaveBeenCalled();
  });

  it('denies assigning a ProjectTask to a foreign tenant user', async () => {
    const prisma: any = { projectTask: model(), user: model() };
    prisma.projectTask.findFirst.mockResolvedValue({ id: 'task-a', organizationId: 'org-a' });
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(new MandateService(prisma).updateTask('task-a', 'org-a', { assigneeId: 'user-b' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.projectTask.update).not.toHaveBeenCalled();
  });

  it('denies a foreign Project before changing a Comment', async () => {
    const prisma: any = { project: model(), projectComment: model() };
    prisma.project.findFirst.mockResolvedValue(null);
    await expect(new MandateService(prisma).updateComment('project-b', 'comment-b', 'user-a', 'org-a', 'pwned')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.projectComment.update).not.toHaveBeenCalled();
  });

  it('denies a foreign Project before deleting a TaskTimeEntry', async () => {
    const prisma: any = { project: model(), taskTimeEntry: model() };
    prisma.project.findFirst.mockResolvedValue(null);
    await expect(new MandateService(prisma).deleteTimeEntry('project-b', 'entry-b', 'user-a', 'org-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.taskTimeEntry.delete).not.toHaveBeenCalled();
  });
});
