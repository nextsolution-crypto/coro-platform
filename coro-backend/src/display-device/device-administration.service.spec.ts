import { ConflictException } from '@nestjs/common';
import { DeviceAdministrationService } from './device-administration.service';

describe('DeviceAdministrationService administrative transitions', () => {
  const authorization = { require: jest.fn().mockResolvedValue(undefined) };
  const actor = {
    userId: 'owner-a',
    organizationId: 'org-a',
    role: 'ADMIN' as const,
  };

  function service(status: string) {
    const prisma = {
      displayDevice: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-a',
          organizationId: 'org-a',
          buildingId: 'building-a',
          status,
          lockVersion: 0,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      displayDeviceEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    return {
      prisma,
      subject: new DeviceAdministrationService(
        prisma as never,
        authorization as never,
      ),
    };
  }

  it('refuses direct activation before proof-of-possession enrollment', async () => {
    const { subject, prisma } = service('PENDING_ENROLLMENT');
    await expect(
      subject.transition('org-a', 'device-a', actor, {
        status: 'ACTIVE',
        reason: 'attempted bypass',
        expectedLockVersion: 0,
        requestId: 'request-transition-0001',
      }),
    ).rejects.toEqual(new ConflictException('DEVICE_TRANSITION_NOT_ALLOWED'));
    expect(prisma.displayDevice.updateMany).not.toHaveBeenCalled();
    expect(prisma.displayDeviceEvent.create).not.toHaveBeenCalled();
  });

  it.each([
    ['ACTIVE', 'SUSPENDED'],
    ['SUSPENDED', 'ACTIVE'],
    ['ACTIVE', 'REVOKED'],
    ['PENDING_ENROLLMENT', 'REVOKED'],
  ])('allows governed transition %s -> %s', async (from, to) => {
    const { subject, prisma } = service(from);
    await expect(
      subject.transition('org-a', 'device-a', actor, {
        status: to,
        reason: 'governed operation',
        expectedLockVersion: 0,
        requestId: `request-${from}-${to}`,
      }),
    ).resolves.toMatchObject({ status: from });
    expect(prisma.displayDevice.updateMany).toHaveBeenCalledTimes(1);
  });

  it.each(['REVOKED', 'RETIRED'])(
    'keeps terminal state %s immutable',
    async (from) => {
      const { subject, prisma } = service(from);
      await expect(
        subject.transition('org-a', 'device-a', actor, {
          status: 'ACTIVE',
          reason: 'forbidden resurrection',
          expectedLockVersion: 0,
          requestId: `request-terminal-${from}`,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.displayDevice.updateMany).not.toHaveBeenCalled();
    },
  );
});
