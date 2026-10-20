import { IncidentNotificationDispatcherService } from './incident-notification-dispatcher.service';

describe('IncidentNotificationDispatcherService', () => {
  const prisma = {
    incidentNotificationDelivery: {
      upsert: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), update: jest.fn(),
    },
    incidentLog: { create: jest.fn() },
    $transaction: jest.fn((callback: any) => callback(prisma)),
  } as any;
  const provider = { sendEmail: jest.fn(), sendSms: jest.fn() } as any;
  let service: IncidentNotificationDispatcherService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INCIDENT_OUTBOX_KEY_BASE64 = Buffer.alloc(32, 7).toString('base64');
    process.env.INCIDENT_OUTBOX_KEY_ID = 'qa-v1';
    process.env.INCIDENT_NOTIFICATION_PROVIDER_MODE = 'FAKE';
    service = new IncidentNotificationDispatcherService(prisma, provider);
  });

  it('persists an encrypted envelope with a stable idempotency key', async () => {
    prisma.incidentNotificationDelivery.upsert.mockImplementation(({ create }: any) => create);
    const row = await service.enqueue({ organizationId: 'org-1', incidentEventId: 'incident-1', channel: 'EMAIL', purpose: 'TEST', idempotencyKey: 'incident-1:test', envelope: { destination: 'qa@example.test', subject: 'Test', html: 'Secret body' } });
    expect(row.encryptionKeyId).toBe('qa-v1');
    expect(row.encryptedEnvelope).not.toContain('qa@example.test');
    expect(row.encryptedEnvelope).not.toContain('Secret body');
    expect(prisma.incidentNotificationDelivery.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { idempotencyKey: 'incident-1:test' }, update: {} }));
  });

  it('records provider acceptance without claiming delivery', async () => {
    const create = jest.fn();
    prisma.incidentNotificationDelivery.upsert.mockImplementation(({ create: value }: any) => { create(value); return value; });
    await service.enqueue({ organizationId: 'org-1', incidentEventId: 'incident-1', channel: 'EMAIL', purpose: 'TEST', idempotencyKey: 'incident-1:test', envelope: { destination: 'qa@example.test', subject: 'Test', html: 'Body' } });
    const stored = create.mock.calls[0][0];
    prisma.incidentNotificationDelivery.findUnique.mockResolvedValue({ id: 'delivery-1', status: 'QUEUED', attemptCount: 0, maxAttempts: 3, ...stored });
    prisma.incidentNotificationDelivery.updateMany.mockResolvedValue({ count: 1 });
    prisma.incidentNotificationDelivery.update.mockResolvedValue({});
    await expect(service.dispatchOne('delivery-1')).resolves.toEqual({ claimed: true, accepted: true, delivered: false });
    expect(prisma.incidentNotificationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SENT', providerAcceptedAt: expect.any(Date) }) }));
    expect(provider.sendEmail).not.toHaveBeenCalled();
  });

  it('only marks delivery when matching provider evidence is supplied', async () => {
    prisma.incidentNotificationDelivery.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.recordDelivered('delivery-1', 'provider-1')).resolves.toEqual({ recorded: true });
    expect(prisma.incidentNotificationDelivery.updateMany).toHaveBeenCalledWith({ where: { id: 'delivery-1', providerMessageId: 'provider-1', status: 'SENT' }, data: { status: 'DELIVERED', providerDeliveredAt: expect.any(Date) } });
  });
});
