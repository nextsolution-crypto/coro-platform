import { ForbiddenException } from '@nestjs/common';
import { ActivitiesService } from '../activities/activities.service';
import { ProjectsService } from './projects.service';
import { NotificationsService } from '../notifications/notifications.service';

const operator = { userId: 'operator-a', organizationId: 'org-a', role: 'OPERATOR' };
const admin = { userId: 'admin-a', organizationId: 'org-a', role: 'ADMIN' };
const operatorScope = {
  organizationId: 'org-a',
  OR: [{ userId: 'operator-a' }, { lastEditedById: 'operator-a' }],
};

function projectHarness() {
  const prisma = {
    project: { findMany: jest.fn().mockResolvedValue([]) },
    projectTask: { findMany: jest.fn().mockResolvedValue([]) },
    client: { findMany: jest.fn().mockResolvedValue([]) },
    building: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { prisma, service: new ProjectsService(prisma as never) };
}

describe('organization dashboard authorization scope', () => {
  it('scopes update cards to the operator canonical project scope', async () => {
    const h = projectHarness();
    await h.service.findUpcomingUpdates(operator);
    expect(h.prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ...operatorScope, isActive: true }),
      }),
    );
  });

  it('denies the approval aggregate to an operator before querying projects', async () => {
    const h = projectHarness();
    await expect(h.service.findPendingApproval(operator)).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.prisma.project.findMany).not.toHaveBeenCalled();
  });

  it('keeps approvals in the administrator organization and excludes self-review', async () => {
    const h = projectHarness();
    await h.service.findPendingApproval(admin);
    expect(h.prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org-a',
          status: 'REVIEW',
          submittedById: { not: 'admin-a' },
        },
      }),
    );
  });

  it('returns only overdue tasks assigned to the actor in an accessible project', async () => {
    const h = projectHarness();
    await h.service.findLateTasks(operator);
    expect(h.prisma.projectTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-a',
          assigneeId: 'operator-a',
          project: { is: { ...operatorScope, isActive: true } },
        }),
      }),
    );
  });

  it('preserves operator scope while adding search predicates', async () => {
    const h = projectHarness();
    await h.service.globalSearch('alpha', operator);
    expect(h.prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          AND: expect.arrayContaining([operatorScope]),
        }),
      }),
    );
    expect(h.prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-a', projects: { some: operatorScope } }) }),
    );
    expect(h.prisma.building.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-a', projects: { some: operatorScope } }) }),
    );
  });

  it('scopes both recurring and upcoming activities through their parent project', async () => {
    const prisma = { projectActivity: { findMany: jest.fn().mockResolvedValue([]) } };
    const types = { list: jest.fn(), resolveTaskLists: jest.fn() };
    const service = new ActivitiesService(prisma as never, types as never);
    await service.getRecurringToRenew(operator);
    await service.getUpcoming(operator);
    for (const [call] of prisma.projectActivity.findMany.mock.calls) {
      expect(call.where).toEqual(expect.objectContaining({
        organizationId: 'org-a',
        project: { is: operatorScope },
      }));
    }
  });

  it('scopes mandate delay alerts through the same canonical project policy', async () => {
    const prisma = { projectMandate: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new NotificationsService(prisma as never);
    await service.checkMandateDelays(operator);
    expect(prisma.projectMandate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-a',
          project: expect.objectContaining(operatorScope),
        }),
      }),
    );
  });
});
