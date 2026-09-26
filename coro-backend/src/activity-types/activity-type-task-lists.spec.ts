import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActivityTypesService } from './activity-types.service';

const admin = { userId: 'admin-a', organizationId: 'org-a', role: 'ADMIN' };
const superAdmin = { ...admin, role: 'SUPER_ADMIN' };
const systemType = { id: 'type-system', organizationId: null, isSystem: true, isActive: true };
const list = (id: string, organizationId: string | null = null) => ({
  id, name: id, organizationId, isActive: true, documentTypes: [],
});
const association = (taskList: any, displayOrder: number) => ({ taskListId: taskList.id, displayOrder, isActive: true, taskList });
const policy = (organizationId: string | null, mode: 'APPEND' | 'REPLACE' | 'DISABLE', items: any[]) => ({
  id: `${organizationId ?? 'global'}-policy`, activityTypeId: systemType.id, organizationId, mode,
  associations: items,
});

function resolutionHarness(policies: any[]) {
  const prisma = {
    activityType: { findFirst: jest.fn().mockResolvedValue(systemType), findMany: jest.fn().mockResolvedValue([systemType]) },
    activityTypeTaskListPolicy: { findMany: jest.fn().mockResolvedValue(policies) },
  };
  return { prisma, service: new ActivityTypesService(prisma as any) };
}

describe('ActivityType TaskList resolution', () => {
  it('rejects inactive or foreign ActivityTypes before reading policies', async () => {
    const h = resolutionHarness([]);
    h.prisma.activityType.findFirst.mockResolvedValue(null);
    await expect(h.service.resolveTaskLists({ activityTypeId: 'foreign', organizationId: 'org-a' }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(h.prisma.activityTypeTaskListPolicy.findMany).not.toHaveBeenCalled();
  });

  it('treats missing tenant policy as INHERIT and keeps deterministic global order', async () => {
    const h = resolutionHarness([policy(null, 'REPLACE', [association(list('b'), 20), association(list('a'), 10)])]);
    await expect(h.service.resolveTaskLists({ activityTypeId: systemType.id, organizationId: 'org-a' }))
      .resolves.toEqual([expect.objectContaining({ id: 'b', source: 'GLOBAL', displayOrder: 20 }),
        expect.objectContaining({ id: 'a', source: 'GLOBAL', displayOrder: 10 })]);
    expect(h.prisma.activityTypeTaskListPolicy.findMany.mock.calls[0][0].include.associations.where)
      .toEqual({ isActive: true, taskList: { isActive: true } });
  });

  it('APPEND deduplicates with tenant priority after global-only lists', async () => {
    const shared = list('shared');
    const h = resolutionHarness([
      policy(null, 'REPLACE', [association(list('global'), 10), association(shared, 20)]),
      policy('org-a', 'APPEND', [association(shared, 10), association(list('tenant', 'org-a'), 20)]),
    ]);
    const result = await h.service.resolveTaskLists({ activityTypeId: systemType.id, organizationId: 'org-a' });
    expect(result.map((item) => `${item.id}:${item.source}`)).toEqual(['global:GLOBAL', 'shared:TENANT', 'tenant:TENANT']);
  });

  it('REPLACE ignores global lists and DISABLE returns none', async () => {
    const global = policy(null, 'REPLACE', [association(list('global'), 10)]);
    await expect(resolutionHarness([global, policy('org-a', 'REPLACE', [association(list('tenant', 'org-a'), 10)])])
      .service.resolveTaskLists({ activityTypeId: systemType.id, organizationId: 'org-a' }))
      .resolves.toEqual([expect.objectContaining({ id: 'tenant', source: 'TENANT' })]);
    await expect(resolutionHarness([global, policy('org-a', 'DISABLE', [])])
      .service.resolveTaskLists({ activityTypeId: systemType.id, organizationId: 'org-a' })).resolves.toEqual([]);
  });

  it('filters documentTypes only when a project document type is supplied', async () => {
    const unrestricted = list('all');
    const pmu = { ...list('pmu'), documentTypes: ['PMU'] };
    const pca = { ...list('pca'), documentTypes: ['PCA'] };
    const h = resolutionHarness([policy(null, 'REPLACE', [association(unrestricted, 10), association(pmu, 20), association(pca, 30)])]);
    const result = await h.service.resolveTaskLists({ activityTypeId: systemType.id, organizationId: 'org-a', documentType: 'PMU' });
    expect(result.map((item) => item.id)).toEqual(['all', 'pmu']);
  });

  it('batch resolves unique ActivityTypes with two bounded queries and the same policy semantics', async () => {
    const shared = list('shared');
    const h = resolutionHarness([
      policy(null, 'REPLACE', [association(list('global'), 10), association(shared, 20)]),
      policy('org-a', 'APPEND', [association(shared, 10), association(list('tenant', 'org-a'), 20)]),
    ]);
    const result = await h.service.resolveTaskListsMany({
      activityTypeIds: [systemType.id, systemType.id], organizationId: 'org-a', documentType: 'PMU',
    });
    expect(result.get(systemType.id)?.map(item => `${item.id}:${item.source}`))
      .toEqual(['global:GLOBAL', 'shared:TENANT', 'tenant:TENANT']);
    expect(h.prisma.activityType.findMany).toHaveBeenCalledTimes(1);
    expect(h.prisma.activityTypeTaskListPolicy.findMany).toHaveBeenCalledTimes(1);
  });
});

describe('ActivityType TaskList configuration', () => {
  function updateHarness(foundLists = [list('global')]) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: systemType.id }]),
      activityType: { findFirst: jest.fn().mockResolvedValue(systemType) },
      taskList: { findMany: jest.fn().mockResolvedValue(foundLists) },
      activityTypeTaskListPolicy: {
        findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'policy' }),
        update: jest.fn(), delete: jest.fn(),
      },
      activityTypeTaskList: { deleteMany: jest.fn(), createMany: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: any) => callback(tx)),
      activityType: { findFirst: jest.fn().mockResolvedValue(systemType) },
      activityTypeTaskListPolicy: { findMany: jest.fn().mockResolvedValue([]) },
      projectTaskList: { create: jest.fn() }, projectTask: { create: jest.fn() },
      booking: { create: jest.fn() }, projectActivity: { create: jest.fn() },
    };
    return { tx, prisma, service: new ActivityTypesService(prisma as any) };
  }

  it('updates policy and ordered associations atomically without instantiating work', async () => {
    const h = updateHarness();
    await h.service.updateTaskListConfiguration(systemType.id, {
      scope: 'tenant', mode: 'APPEND', taskLists: [{ taskListId: 'global', displayOrder: 10 }],
    }, admin);
    expect(h.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(h.tx.activityTypeTaskList.createMany).toHaveBeenCalledWith({ data: [{
      policyId: 'policy', taskListId: 'global', displayOrder: 10,
    }] });
    expect(h.tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'ACTIVITY_TYPE_TASK_LIST_CONFIG_UPDATED', entityId: systemType.id,
    }) });
    expect(h.prisma.projectTaskList.create).not.toHaveBeenCalled();
    expect(h.prisma.projectTask.create).not.toHaveBeenCalled();
    expect(h.prisma.booking.create).not.toHaveBeenCalled();
    expect(h.prisma.projectActivity.create).not.toHaveBeenCalled();
  });

  it('removes a tenant policy for INHERIT and rejects foreign or inactive lists', async () => {
    const inherit = updateHarness([]);
    inherit.tx.activityTypeTaskListPolicy.findFirst.mockResolvedValue({ id: 'old', mode: 'DISABLE', associations: [] });
    await inherit.service.updateTaskListConfiguration(systemType.id, { scope: 'tenant', mode: 'INHERIT' }, admin);
    expect(inherit.tx.activityTypeTaskListPolicy.delete).toHaveBeenCalledWith({ where: { id: 'old' } });

    const foreign = updateHarness([]);
    await expect(foreign.service.updateTaskListConfiguration(systemType.id, {
      scope: 'tenant', mode: 'APPEND', taskLists: [{ taskListId: 'foreign' }],
    }, admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('accepts a custom ActivityType from the actor tenant and rejects a foreign custom type', async () => {
    const own = updateHarness([list('tenant', 'org-a')]);
    own.tx.activityType.findFirst.mockResolvedValue({ ...systemType, organizationId: 'org-a', isSystem: false });
    await expect(own.service.updateTaskListConfiguration(systemType.id, {
      scope: 'tenant', mode: 'REPLACE', taskLists: [{ taskListId: 'tenant' }],
    }, admin)).resolves.toBeDefined();
    const foreign = updateHarness([list('tenant', 'org-a')]);
    foreign.tx.activityType.findFirst.mockResolvedValue(null);
    await expect(foreign.service.updateTaskListConfiguration(systemType.id, {
      scope: 'tenant', mode: 'REPLACE', taskLists: [{ taskListId: 'tenant' }],
    }, admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not publish a result when an association write fails inside the transaction', async () => {
    const h = updateHarness();
    h.tx.activityTypeTaskList.createMany.mockRejectedValue(new Error('write failed'));
    await expect(h.service.updateTaskListConfiguration(systemType.id, {
      scope: 'tenant', mode: 'REPLACE', taskLists: [{ taskListId: 'global' }],
    }, admin)).rejects.toThrow('write failed');
    expect(h.prisma.activityTypeTaskListPolicy.findMany).not.toHaveBeenCalled();
  });

  it('enforces global, tenant, operator and client administration roles', async () => {
    await expect(updateHarness().service.updateTaskListConfiguration(systemType.id, {
      scope: 'global', mode: 'REPLACE', taskLists: [{ taskListId: 'global' }],
    }, admin)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(updateHarness().service.updateTaskListConfiguration(systemType.id, {
      scope: 'tenant', mode: 'APPEND', taskLists: [{ taskListId: 'global' }],
    }, { ...admin, role: 'OPERATOR' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(updateHarness().service.updateTaskListConfiguration(systemType.id, {
      scope: 'tenant', mode: 'APPEND', taskLists: [{ taskListId: 'global' }],
    }, { ...admin, role: 'CLIENT_MANAGER' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(updateHarness().service.updateTaskListConfiguration(systemType.id, {
      scope: 'global', mode: 'REPLACE', taskLists: [{ taskListId: 'global' }],
    }, superAdmin)).resolves.toBeDefined();
  });
});
