import { SchedulingService } from './scheduling.service';

describe('Scheduling planner batch', () => {
  it('reads sources once and checks schedule coverage per slot', async () => {
    const prisma = { userWorkSchedule: { findMany: jest.fn().mockResolvedValue([{ userId: 'u1', verifiedAt: new Date(),
      timeZone: 'America/Toronto', effectiveFrom: new Date('2026-09-01'),
      effectiveUntil: new Date('2026-09-23T20:00:00Z'),
      intervals: [{ dayOfWeek: 3, startTime: 540, endTime: 1020 }] }]) } };
    const service = new SchedulingService(prisma as any);
    const analyze = jest.spyOn(service, 'analyzeUsers').mockResolvedValue(new Map([['u1', {
      status: 'UNKNOWN', conflicts: [], warnings: ['Horaire non configuré pour tout le créneau'],
      sourcesChecked: ['BOOKING', 'WORK_SCHEDULE'],
    }]]));
    const slots = [
      { key: 'inside', userId: 'u1', startUtc: new Date('2026-09-23T14:00:00Z'),
        endUtc: new Date('2026-09-23T15:00:00Z') },
      { key: 'outside', userId: 'u1', startUtc: new Date('2026-09-23T22:00:00Z'),
        endUtc: new Date('2026-09-23T23:00:00Z') },
    ];
    const result = await service.analyzeManySlots({ organizationId: 'org-a', userIds: ['u1'],
      startUtc: new Date('2026-09-23T00:00:00Z'), endUtc: new Date('2026-09-24T00:00:00Z'), slots });
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(prisma.userWorkSchedule.findMany).toHaveBeenCalledTimes(1);
    expect(result.get('inside')?.status).toBe('AVAILABLE');
    expect(result.get('outside')?.status).toBe('UNKNOWN');
  });
});
