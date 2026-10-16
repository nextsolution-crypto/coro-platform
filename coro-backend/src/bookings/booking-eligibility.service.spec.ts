import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingEligibilityService } from './booking-eligibility.service';

describe('BookingEligibilityService', () => {
  type PrismaMock = {
    project: { findFirst: jest.Mock };
    user: { findFirst: jest.Mock };
    projectActivity: { findFirst: jest.Mock };
    projectAdvisorEligibility: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    bookingAssignment: { count: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let prisma: PrismaMock;
  let service: BookingEligibilityService;

  beforeEach(() => {
    prisma = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'project' }) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'advisor' }) },
      projectActivity: {
        findFirst: jest.fn().mockResolvedValue({ id: 'activity' }),
      },
      projectAdvisorEligibility: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest
          .fn()
          .mockImplementation((input: { data: Record<string, unknown> }) => ({
            id: 'eligibility',
            ...input.data,
          })),
        update: jest
          .fn()
          .mockImplementation((input: { data: Record<string, unknown> }) => ({
            id: 'eligibility',
            ...input.data,
          })),
      },
      bookingAssignment: { count: jest.fn().mockResolvedValue(0) },
      auditLog: { create: jest.fn() },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (transaction: PrismaMock) => unknown) =>
          callback(prisma),
        ),
    };
    service = new BookingEligibilityService(prisma as unknown as PrismaService);
  });

  it('rejects advisor self-granting', async () => {
    await expect(
      service.grant(
        'project',
        { advisorUserId: 'advisor', priority: 10 },
        { userId: 'advisor', organizationId: 'org', role: 'OPERATOR' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.projectAdvisorEligibility.create).not.toHaveBeenCalled();
  });

  it('creates an explicitly scoped and audited eligibility', async () => {
    await service.grant(
      'project',
      { advisorUserId: 'advisor', activityId: 'activity', priority: 10 },
      { userId: 'admin', organizationId: 'org', role: 'ADMIN' },
    );
    expect(prisma.projectAdvisorEligibility.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('blocks revocation while an unaccepted assignment still holds capacity', async () => {
    prisma.projectAdvisorEligibility.findFirst.mockResolvedValue({
      id: 'eligibility',
      organizationId: 'org',
      projectId: 'project',
      activityId: null,
      advisorUserId: 'advisor',
    });
    prisma.bookingAssignment.count.mockResolvedValue(1);
    await expect(
      service.revoke('eligibility', {
        userId: 'admin',
        organizationId: 'org',
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.projectAdvisorEligibility.update).not.toHaveBeenCalled();
  });
});
