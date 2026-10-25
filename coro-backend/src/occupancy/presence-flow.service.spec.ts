import { UnauthorizedException } from '@nestjs/common';
import { PresenceFlowService } from './presence-flow.service';

describe('PresenceFlowService', () => {
  const future = new Date(Date.now() + 60_000);
  let prisma: any;
  let service: PresenceFlowService;

  beforeEach(() => {
    prisma = {
      presenceKioskDisplay: { findFirst: jest.fn() },
      buildingKioskToken: { findFirst: jest.fn() },
      presenceSession: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      presenceDeviceSession: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      buildingEmployee: { findFirst: jest.fn() },
      occupancyRecord: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new PresenceFlowService(prisma);
  });

  it('issues a short challenge without persisting the bearer value', async () => {
    prisma.presenceKioskDisplay.findFirst.mockResolvedValue({
      id: 'display-a',
      buildingId: 'building-a',
      organizationId: 'org-a',
      label: 'Entrée Est',
    });
    prisma.presenceSession.updateMany.mockResolvedValue({ count: 0 });
    prisma.presenceSession.create.mockResolvedValue({ id: 'session-a' });

    const result = await service.issueChallenge('display-public-token');

    expect(result.rotationSeconds).toBe(30);
    expect(result.challenge).toHaveLength(43);
    expect(prisma.presenceSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          buildingId: 'building-a',
          entryLabel: 'Entrée Est',
          challengeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );
    expect(prisma.presenceSession.create.mock.calls[0][0].data.challengeHash).not.toBe(result.challenge);
  });

  it('claims a QR once and preserves a separate transaction deadline', async () => {
    prisma.presenceSession.updateMany.mockResolvedValue({ count: 1 });
    prisma.presenceSession.findUnique.mockResolvedValue({
      id: 'session-a',
      buildingId: 'building-a',
      transactionExpiresAt: future,
      entryLabel: 'Entrée Est',
      building: { name: 'Édifice QA' },
    });

    const result = await service.start('session-a', 'valid-challenge');

    expect(result.buildingName).toBe('Édifice QA');
    expect(result.transactionExpiresAt).toBe(future);
    expect(result.recognized).toBeNull();
  });

  it('rejects an expired or replayed QR before revealing a building', async () => {
    prisma.presenceSession.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.start('session-a', 'expired')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.presenceSession.findUnique).not.toHaveBeenCalled();
  });

  it('expires a transaction after five invalid PIN attempts', async () => {
    prisma.presenceSession.findFirst.mockResolvedValue({
      id: 'session-a',
      buildingId: 'building-a',
      organizationId: 'org-a',
      building: { name: 'Édifice QA' },
    });
    prisma.buildingEmployee.findFirst.mockResolvedValue(null);
    prisma.presenceSession.update.mockResolvedValueOnce({ failedAttempts: 5 }).mockResolvedValueOnce({});

    await expect(service.identify('session-a', '9999')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.presenceSession.update).toHaveBeenLastCalledWith({
      where: { id: 'session-a' },
      data: { status: 'EXPIRED' },
    });
  });

  it('returns the same completed result for an idempotent network retry', async () => {
    prisma.presenceSession.findFirst.mockResolvedValue({
      id: 'session-a',
      status: 'COMPLETED',
      idempotencyKey: 'abcdefghijklmnop',
      intendedAction: 'CHECK_IN',
      occupancyRecordId: 'presence-a',
      completedAt: future,
      employee: { firstName: 'Ariane', lastName: 'Test' },
    });

    const result = await service.confirm('session-a', 'CHECK_IN', 'abcdefghijklmnop', false);

    expect(result.occupancyRecordId).toBe('presence-a');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
