import { RemindersService } from './reminders.service';
describe('Sentinelle stale presence closure', () => {
  it('protects emergency sites and records the administrative source', async () => {
    const prisma = {
      occupancyRecord: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    await new RemindersService(prisma as any, {} as any).closeStaleCheckins();
    const call = prisma.occupancyRecord.updateMany.mock.calls[0][0] as any;
    expect(call.where.status).toBe('IN');
    expect(
      Date.now() - call.where.checkedInAt.lt.getTime(),
    ).toBeGreaterThanOrEqual(16 * 60 * 60 * 1000);
    expect(call.where.building).toEqual({
      incidentEvents: {
        none: { status: { in: ['PRE_ALERT', 'ACTIVE', 'CONTAINED'] } },
      },
      evacuationEvents: { none: { status: 'ACTIVE' } },
    });
    expect(call.data.checkoutSource).toBe('AUTO_STALE_16H');
  });
});
