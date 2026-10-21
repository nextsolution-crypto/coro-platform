import { BadRequestException } from '@nestjs/common';
import { AdminAuditService } from './admin-audit.service';

describe('AdminAuditService typed actor provenance', () => {
  const service = new AdminAuditService();
  const tx = () => ({
    user: { findUnique: jest.fn() },
    clientUser: { findUnique: jest.fn() },
    adminAuditEvent: { create: jest.fn(async ({ data }) => data) },
  });

  it('preserves historical internal-user provenance', async () => {
    const prisma = tx();
    prisma.user.findUnique.mockResolvedValue({ firstName: 'Ada', lastName: 'Lovelace', role: 'ADMIN', organizationId: 'org-a' });
    const result = await service.record(prisma as never, {
      actorUserId: 'user-a', action: 'TEST', targetType: 'Target', targetId: 'target-a', organizationId: 'org-a',
    });
    expect(result).toMatchObject({ actorType: 'INTERNAL_USER', actorUserId: 'user-a', actorClientUserId: null });
  });

  it('records a canonical active client actor', async () => {
    const prisma = tx();
    prisma.clientUser.findUnique.mockResolvedValue({ firstName: 'Client', lastName: 'Admin', role: 'CLIENT_MANAGER', organizationId: 'org-a', isActive: true });
    const result = await service.record(prisma as never, {
      actorType: 'CLIENT_USER', actorClientUserId: 'client-a', action: 'TEST', targetType: 'Target', targetId: 'target-a', organizationId: 'org-a',
    });
    expect(result).toMatchObject({ actorType: 'CLIENT_USER', actorUserId: null, actorClientUserId: 'client-a' });
  });

  it('denies forged cross-tenant client provenance', async () => {
    const prisma = tx();
    prisma.clientUser.findUnique.mockResolvedValue({ firstName: 'Client', lastName: 'Admin', role: 'CLIENT_MANAGER', organizationId: 'org-b', isActive: true });
    await expect(service.record(prisma as never, {
      actorType: 'CLIENT_USER', actorClientUserId: 'client-b', action: 'TEST', targetType: 'Target', targetId: 'target-a', organizationId: 'org-a',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.adminAuditEvent.create).not.toHaveBeenCalled();
  });
});
