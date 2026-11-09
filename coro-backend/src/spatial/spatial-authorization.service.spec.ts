/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { ForbiddenException } from '@nestjs/common';
import { DisplayPermission } from '@prisma/client';
import { SpatialAuthorizationService } from './spatial-authorization.service';

describe('SpatialAuthorizationService', () => {
  const prisma = { user: { findFirst: jest.fn() } } as any;
  const service = new SpatialAuthorizationService(prisma);
  const actor = { userId: 'user-a', organizationId: 'org-a', role: 'ADMIN' };

  beforeEach(() => jest.clearAllMocks());

  it('requires the route tenant to equal the canonical actor tenant', async () => {
    await expect(
      service.require(actor, 'org-b', DisplayPermission.DISPLAY_READ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('does not grant Display rights implicitly to an administrator', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.require(actor, 'org-a', DisplayPermission.DISPLAY_READ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          displayPermissions: { has: DisplayPermission.DISPLAY_READ },
        }),
      }),
    );
  });

  it('accepts only an active canonical user carrying the exact permission', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-a' });
    await expect(
      service.require(actor, 'org-a', DisplayPermission.DISPLAY_DEVICE_MANAGE),
    ).resolves.toBeUndefined();
  });

  it('keeps emergency activation and reset as distinct contracts', () => {
    expect(DisplayPermission.DISPLAY_EMERGENCY_ACTIVATE).not.toBe(
      DisplayPermission.DISPLAY_EMERGENCY_RESET,
    );
    expect(DisplayPermission.DISPLAY_DEVICE_MANAGE).not.toBe(
      DisplayPermission.DISPLAY_EMERGENCY_ACTIVATE,
    );
    expect(DisplayPermission.DISPLAY_CONTENT_MANAGE).not.toBe(
      DisplayPermission.DISPLAY_EMERGENCY_RESET,
    );
  });
});
