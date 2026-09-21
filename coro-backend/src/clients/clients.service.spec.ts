import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';

describe('ClientsService operational permissions', () => {
  const actor = { userId: 'admin-1', role: 'SUPER_ADMIN', organizationId: 'org-1' };
  const current = {
    id: 'cu-1', email: 'user@example.test', firstName: 'Martin', lastName: 'Test',
    role: 'CLIENT_MANAGER', isActive: true, buildingIds: ['building-1'],
    operationalReviewPermissions: ['REX_CREATE'],
    correctiveActionPermissions: ['CORRECTIVE_ACTION_CREATE'],
  };
  const prisma: any = {
    client: { findFirst: jest.fn() },
    clientUser: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
  };
  const service = new ClientsService(prisma, {} as any);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
    prisma.clientUser.findFirst.mockResolvedValue(current);
    prisma.clientUser.update.mockImplementation(({ data }: any) => Promise.resolve({ ...current, ...data }));
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
  });

  it('refuses a non super admin', async () => {
    await expect(service.findClientUsers('client-1', { ...actor, role: 'ADMIN' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists only client users in the actor organization', async () => {
    prisma.clientUser.findMany.mockResolvedValue([current]);
    await service.findClientUsers('client-1', actor);
    expect(prisma.clientUser.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { clientId: 'client-1', organizationId: 'org-1' } }));
  });

  it('rejects tenant/client IDOR and a missing user', async () => {
    prisma.clientUser.findFirst.mockResolvedValue(null);
    await expect(service.getClientUserOperationalPermissions('other-client', 'cu-1', actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.clientUser.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'cu-1', clientId: 'other-client', organizationId: 'org-1' } }));
  });

  it('updates REX only without changing scope or corrective permissions', async () => {
    const result = await service.updateClientUserOperationalPermissions('client-1', 'cu-1', { operationalReviewPermissions: ['REX_EDIT'] as any }, actor);
    expect(result.operationalReviewPermissions).toEqual(['REX_EDIT']);
    expect(result.correctiveActionPermissions).toEqual(['CORRECTIVE_ACTION_CREATE']);
    expect(prisma.clientUser.update.mock.calls[0][0].data).toEqual({ operationalReviewPermissions: ['REX_EDIT'], correctiveActionPermissions: ['CORRECTIVE_ACTION_CREATE'] });
    expect(prisma.clientUser.update.mock.calls[0][0].data).not.toHaveProperty('role');
    expect(prisma.clientUser.update.mock.calls[0][0].data).not.toHaveProperty('buildingIds');
  });

  it('updates corrective permissions only and supports explicit removal', async () => {
    await service.updateClientUserOperationalPermissions('client-1', 'cu-1', { correctiveActionPermissions: [] }, actor);
    expect(prisma.clientUser.update.mock.calls[0][0].data).toEqual({ operationalReviewPermissions: ['REX_CREATE'], correctiveActionPermissions: [] });
  });

  it('requires at least one permissions list', async () => {
    await expect(service.updateClientUserOperationalPermissions('client-1', 'cu-1', {}, actor)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('writes old and new permissions to the audit log in the transaction', async () => {
    await service.updateClientUserOperationalPermissions('client-1', 'cu-1', { operationalReviewPermissions: ['REX_FINALIZE'] as any }, actor);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'admin-1', organizationId: 'org-1', entityId: 'cu-1', metadata: expect.objectContaining({ previous: expect.any(Object), next: expect.any(Object) }) }) });
  });
});
