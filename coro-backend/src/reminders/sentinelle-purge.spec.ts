import { RemindersService } from './reminders.service';

describe('Sentinelle nightly purge (audit M5-03)', () => {
  function harness(overrides: Record<string, jest.Mock> = {}) {
    const calls: string[] = [];
    const ok = (name: string, count: number) =>
      jest.fn().mockImplementation(async () => {
        calls.push(name);
        return { count };
      });
    const prisma: any = {
      evacuationCheckIn: { deleteMany: overrides.evacuationCheckIn ?? ok('evacuationCheckIn', 4) },
      evacuationEvent: { deleteMany: overrides.evacuationEvent ?? ok('evacuationEvent', 1) },
      occupancyRecord: { deleteMany: overrides.occupancyRecord ?? ok('occupancyRecord', 10) },
      visitorInvitation: { deleteMany: overrides.visitorInvitation ?? ok('visitorInvitation', 2) },
    };
    const service = new RemindersService(prisma, {} as any);
    (service as any).logger = { log: jest.fn(), error: jest.fn() };
    return { service, prisma, calls };
  }

  const now = new Date('2027-06-15T06:00:00Z');

  it('keeps presences cited by a retained evacuation and purges evacuations first', async () => {
    const { service, prisma, calls } = harness();
    const result = await service.purgeOldOccupancyRecords(now);

    expect(calls).toEqual(['evacuationCheckIn', 'evacuationEvent', 'occupancyRecord', 'visitorInvitation']);
    const where = prisma.occupancyRecord.deleteMany.mock.calls[0][0].where;
    expect(where.evacuationCheckins).toEqual({ none: {} });
    expect(where.checkedInAt.lt.toISOString()).toBe('2026-06-15T06:00:00.000Z');
    expect(prisma.evacuationEvent.deleteMany.mock.calls[0][0].where.triggeredAt.lt.toISOString()).toBe(
      '2024-06-15T06:00:00.000Z',
    );
    expect(result).toEqual({ deletedRecords: 10, deletedEvents: 1, deletedInvitations: 2, failures: [] });
  });

  it('a failing step raises an alert without stopping the other steps', async () => {
    const { service, prisma } = harness({
      occupancyRecord: jest.fn().mockRejectedValue(new Error('Foreign key constraint failed')),
    });
    const result = await service.purgeOldOccupancyRecords(now);

    expect(result.failures).toEqual(['présences']);
    expect(prisma.visitorInvitation.deleteMany).toHaveBeenCalled();
    expect((service as any).logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[ALERTE] Purge Sentinelle en échec (présences)'),
    );
  });
});
