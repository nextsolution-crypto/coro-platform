import { NotFoundException } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { OperationalLogAccessService } from './operational-log-access.service';

describe('OperationalLogAccessService', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
    building: { findFirst: jest.fn() },
    platformPermissionGrant: { findFirst: jest.fn() },
    operationalLogBuildingAssignment: { findFirst: jest.fn() },
  };
  const service = new OperationalLogAccessService(prisma as never);
  const actor = { userId: 'user-a', organizationId: 'org-a' } as never;

  beforeEach(() => jest.clearAllMocks());

  it('requires identity, permission and an active building assignment', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-a' });
    prisma.building.findFirst.mockResolvedValue({ id: 'building-a' });
    prisma.platformPermissionGrant.findFirst.mockResolvedValue({
      id: 'grant-a',
    });
    prisma.operationalLogBuildingAssignment.findFirst.mockResolvedValue({
      id: 'assignment-a',
    });
    await expect(
      service.require(
        actor,
        'org-a',
        'building-a',
        PlatformPermission.OPERATIONAL_LOG_READ,
      ),
    ).resolves.toBeUndefined();
  });

  it('fails closed across organizations before any database read', async () => {
    await expect(
      service.require(
        actor,
        'org-b',
        'building-a',
        PlatformPermission.OPERATIONAL_LOG_READ,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('refuses a user without the explicit building assignment', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-a' });
    prisma.building.findFirst.mockResolvedValue({ id: 'building-a' });
    prisma.platformPermissionGrant.findFirst.mockResolvedValue({
      id: 'grant-a',
    });
    prisma.operationalLogBuildingAssignment.findFirst.mockResolvedValue(null);
    await expect(
      service.require(
        actor,
        'org-a',
        'building-a',
        PlatformPermission.OPERATIONAL_LOG_READ,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
