import { reconcileSentinelleProviderEvent } from './sentinelle-provider-reconciliation';
describe('Authenticated Sentinelle delivery reconciliation', () => {
  const tx = {
    incidentNotificationDelivery: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    buildingEmployee: { findMany: jest.fn(), updateMany: jest.fn() },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn((callback: any) => callback(tx)),
  };
  const event = {
    providerMessageId: 'synthetic-id',
    eventType: 'DELIVERED',
    providerOccurredAt: new Date(),
  };
  beforeEach(() => {
    jest.clearAllMocks();
    tx.incidentNotificationDelivery.findMany.mockResolvedValue([]);
    tx.buildingEmployee.findMany.mockResolvedValue([]);
  });
  it('projects a PIN delivery by provider ID without using private payload fields', async () => {
    tx.buildingEmployee.findMany.mockResolvedValue([{ id: 'employee-a' }]);
    await reconcileSentinelleProviderEvent(prisma as any, 'EMAIL', event);
    expect(tx.buildingEmployee.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'employee-a',
        pinEmailMessageId: { in: ['synthetic-id', '<synthetic-id>'] },
        pinEmailStatus: { in: ['ACCEPTED', 'FAILED'] },
      },
      data: {
        pinEmailStatus: 'DELIVERED',
        pinEmailDeliveredAt: event.providerOccurredAt,
      },
    });
  });
  it('projects incident delivery only from SENT and the matching channel', async () => {
    tx.incidentNotificationDelivery.findMany.mockResolvedValue([
      { id: 'notification-a' },
    ]);
    await reconcileSentinelleProviderEvent(prisma as any, 'SMS', event);
    expect(tx.buildingEmployee.findMany).not.toHaveBeenCalled();
    expect(tx.incidentNotificationDelivery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          channel: 'SMS',
          status: { in: ['SENT', 'EXHAUSTED'] },
        }),
        data: {
          status: 'DELIVERED',
          providerDeliveredAt: event.providerOccurredAt,
        },
      }),
    );
  });
  it('does not reconcile ambiguous matches', async () => {
    tx.incidentNotificationDelivery.findMany.mockResolvedValue([
      { id: 'notification-a' },
    ]);
    tx.buildingEmployee.findMany.mockResolvedValue([{ id: 'employee-a' }]);
    await reconcileSentinelleProviderEvent(prisma as any, 'EMAIL', event);
    expect(tx.incidentNotificationDelivery.updateMany).not.toHaveBeenCalled();
    expect(tx.buildingEmployee.updateMany).not.toHaveBeenCalled();
  });
  it('ignores unsupported or acceptance-only events', async () => {
    await reconcileSentinelleProviderEvent(prisma as any, 'EMAIL', {
      ...event,
      eventType: 'ACCEPTED',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('stops retrying definitive provider rejection', async () => {
    tx.incidentNotificationDelivery.findMany.mockResolvedValue([
      { id: 'notification-a' },
    ]);
    await reconcileSentinelleProviderEvent(prisma as any, 'SMS', {
      ...event,
      eventType: 'REJECTED',
    });
    expect(tx.incidentNotificationDelivery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'EXHAUSTED',
          nextAttemptAt: null,
        }),
      }),
    );
  });
});
