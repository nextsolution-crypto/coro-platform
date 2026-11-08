/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import {
  PopulationDeliveryProviderEventType,
  PopulationDeliveryStatus,
  Prisma,
} from '@prisma/client';
import { PopulationBrevoSmsWebhookService } from './population-brevo-sms-webhook.service';

describe('PopulationBrevoSmsWebhookService', () => {
  const tx = {
    incidentNotificationDelivery: { findMany: jest.fn().mockResolvedValue([]) },
    buildingEmployee: { findMany: jest.fn().mockResolvedValue([]) },
    $executeRaw: jest.fn(),
    populationInboundSmsEvent: { create: jest.fn() },
    populationSubscriber: { findMany: jest.fn(), updateMany: jest.fn() },
    populationSmsSuppression: { upsert: jest.fn() },
    populationConsentEvent: { createMany: jest.fn() },
    populationAlertDelivery: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    populationDeliveryProviderEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const prisma = {
    incidentNotificationDelivery: { findMany: jest.fn().mockResolvedValue([]) },
    buildingEmployee: { findMany: jest.fn().mockResolvedValue([]) },
    populationAlertDelivery: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    populationAlert: { updateMany: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const suppressions = {
    canonicalize: jest.fn(() => '+15145550123'),
  };
  const service = new PopulationBrevoSmsWebhookService(
    prisma as never,
    suppressions as never,
    { POPULATION_BREVO_SMS_WEBHOOK_SECRET: 'secret' },
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tx.$executeRaw.mockResolvedValue(1);
    prisma.populationAlertDelivery.findFirst.mockResolvedValue(null);
    prisma.populationAlertDelivery.findMany.mockResolvedValue([]);
    prisma.populationAlertDelivery.groupBy.mockResolvedValue([]);
    prisma.populationAlert.updateMany.mockResolvedValue({ count: 0 });
    tx.populationAlertDelivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      alertId: 'alert-1',
      channel: 'SMS',
      provider: 'BREVO',
      providerMessageId: 'provider-message-1',
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
      status: PopulationDeliveryStatus.SENT,
      sentAt: new Date('2027-01-15T10:00:00.000Z'),
    });
    tx.populationAlertDelivery.update.mockResolvedValue({});
    tx.populationDeliveryProviderEvent.create.mockResolvedValue({});
    tx.populationDeliveryProviderEvent.findMany.mockResolvedValue([]);
    tx.populationInboundSmsEvent.create.mockResolvedValue({ id: 'event-1' });
    tx.populationSubscriber.findMany.mockResolvedValue([
      {
        id: 'subscriber-1',
        programId: 'program-1',
        emailEnabled: true,
        program: { consentVersion: 'v1' },
      },
      {
        id: 'subscriber-2',
        programId: 'program-2',
        emailEnabled: false,
        program: { consentVersion: 'v2' },
      },
    ]);
    tx.populationSubscriber.updateMany.mockResolvedValue({ count: 2 });
    tx.populationSmsSuppression.upsert.mockResolvedValue({ id: 'suppression' });
    tx.populationConsentEvent.createMany.mockResolvedValue({ count: 2 });
  });

  const event = (reply: string, name = 'replied') => ({
    event: name,
    to: '+1 514 555 0123',
    reply,
    messageId: 'provider-message-1',
    ts_event: 1_800_000_000,
  });

  const deliveryEvent = (name: string, timestamp = 1_800_000_000) => ({
    id: 42,
    msg_status: name,
    to: '+1 514 555 0123',
    messageId: 'provider-message-1',
    reference: 'synthetic-reference',
    ts_event: timestamp,
    type: 'transactional',
  });

  const correlatedDelivery = () => {
    prisma.populationAlertDelivery.findMany.mockResolvedValue([
      { id: 'delivery-1', alertId: 'alert-1' },
    ]);
  };

  const providerHistory = (
    ...events: Array<{
      eventType: PopulationDeliveryProviderEventType;
      providerOccurredAt: Date;
    }>
  ) => tx.populationDeliveryProviderEvent.findMany.mockResolvedValue(events);

  it('rejects missing provider authentication', async () => {
    await expect(
      service.receive(undefined, event('STOP')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['STOP', 'stop', 'StOp'])(
    'globally suppresses a canonical phone for %s without changing email/status',
    async (reply) => {
      await expect(
        service.receive('Bearer secret', event(reply)),
      ).resolves.toEqual({ received: true });

      expect(tx.populationSmsSuppression.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { phoneCanonical: '+15145550123' },
        }),
      );
      expect(tx.populationSubscriber.updateMany).toHaveBeenCalledWith({
        where: { phoneCanonical: '+15145550123', smsEnabled: true },
        data: { smsEnabled: false },
      });
      expect(tx.populationConsentEvent.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            subscriberId: 'subscriber-1',
            smsEnabled: false,
            emailEnabled: true,
          }),
        ]),
      });
    },
  );

  it('treats provider unsubscribe as global suppression', async () => {
    await service.receive('Bearer secret', event('', 'unsubscribe'));
    expect(tx.populationSmsSuppression.upsert).toHaveBeenCalled();
  });

  it.each(['HELP', 'hello there'])(
    'records %s without changing consent or suppression',
    async (reply) => {
      await service.receive('Bearer secret', event(reply));
      expect(tx.populationInboundSmsEvent.create).toHaveBeenCalled();
      expect(tx.populationSmsSuppression.upsert).not.toHaveBeenCalled();
      expect(tx.populationSubscriber.updateMany).not.toHaveBeenCalled();
      expect(tx.populationConsentEvent.createMany).not.toHaveBeenCalled();
    },
  );

  it('records subscribe without clearing a prior suppression', async () => {
    await service.receive('Bearer secret', event('', 'subscribe'));
    expect(tx.populationInboundSmsEvent.create).toHaveBeenCalled();
    expect(tx.populationSmsSuppression.upsert).not.toHaveBeenCalled();
  });

  it('correlates an SMS delivery by provider message id when available', async () => {
    prisma.populationAlertDelivery.findFirst.mockResolvedValue({
      id: 'delivery-1',
    });
    await service.receive('Bearer secret', event('HELP'));
    expect(tx.populationInboundSmsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ deliveryId: 'delivery-1' }),
    });
  });

  it('does not retain inbound reply text in event evidence', async () => {
    await service.receive('Bearer secret', event('private free text'));
    const data = tx.populationInboundSmsEvent.create.mock.calls[0][0].data;
    expect(JSON.stringify(data)).not.toContain('private free text');
    expect(data).toEqual(
      expect.objectContaining({ payloadFingerprint: expect.any(String) }),
    );
  });

  it('reconciles accepted then sent then delivered without treating delivered as human reading', async () => {
    correlatedDelivery();
    providerHistory({
      eventType: PopulationDeliveryProviderEventType.ACCEPTED,
      providerOccurredAt: new Date('2027-01-15T10:00:00.000Z'),
    });
    await service.receive('Bearer secret', deliveryEvent('accepted'));
    expect(tx.populationAlertDelivery.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PopulationDeliveryStatus.SENT,
        }),
      }),
    );

    providerHistory(
      {
        eventType: PopulationDeliveryProviderEventType.ACCEPTED,
        providerOccurredAt: new Date('2027-01-15T10:00:00.000Z'),
      },
      {
        eventType: PopulationDeliveryProviderEventType.SENT,
        providerOccurredAt: new Date('2027-01-15T10:00:01.000Z'),
      },
    );
    await service.receive(
      'Bearer secret',
      deliveryEvent('sent', 1_800_000_001),
    );

    providerHistory(
      {
        eventType: PopulationDeliveryProviderEventType.DELIVERED,
        providerOccurredAt: new Date('2027-01-15T10:00:02.000Z'),
      },
      {
        eventType: PopulationDeliveryProviderEventType.SENT,
        providerOccurredAt: new Date('2027-01-15T10:00:01.000Z'),
      },
    );
    await service.receive(
      'Bearer secret',
      deliveryEvent('delivered', 1_800_000_002),
    );
    expect(tx.populationAlertDelivery.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PopulationDeliveryStatus.DELIVERED,
          deliveredAt: expect.any(Date),
          errorCode: null,
        }),
      }),
    );
  });

  it('does not regress delivered when sent arrives later', async () => {
    correlatedDelivery();
    providerHistory(
      {
        eventType: PopulationDeliveryProviderEventType.DELIVERED,
        providerOccurredAt: new Date('2027-01-15T10:00:02.000Z'),
      },
      {
        eventType: PopulationDeliveryProviderEventType.SENT,
        providerOccurredAt: new Date('2027-01-15T10:00:01.000Z'),
      },
    );
    await service.receive('Bearer secret', deliveryEvent('sent'));
    expect(tx.populationAlertDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PopulationDeliveryStatus.DELIVERED,
        }),
      }),
    );
  });

  it.each(['hard_bounce', 'rejected', 'blacklisted', 'skip'])(
    'projects permanent provider failure %s',
    async (name) => {
      correlatedDelivery();
      const mapping: Record<string, PopulationDeliveryProviderEventType> = {
        hard_bounce: PopulationDeliveryProviderEventType.HARD_BOUNCE,
        rejected: PopulationDeliveryProviderEventType.REJECTED,
        blacklisted: PopulationDeliveryProviderEventType.BLOCKED,
        skip: PopulationDeliveryProviderEventType.SKIPPED,
      };
      providerHistory({
        eventType: mapping[name],
        providerOccurredAt: new Date('2027-01-15T10:00:02.000Z'),
      });
      await service.receive('Bearer secret', deliveryEvent(name));
      expect(tx.populationAlertDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PopulationDeliveryStatus.FAILED,
          }),
        }),
      );
    },
  );

  it('records a soft bounce as transient uncertainty, not delivered', async () => {
    correlatedDelivery();
    providerHistory({
      eventType: PopulationDeliveryProviderEventType.SOFT_BOUNCE,
      providerOccurredAt: new Date('2027-01-15T10:00:02.000Z'),
    });
    await service.receive('Bearer secret', deliveryEvent('soft_bounce'));
    expect(tx.populationAlertDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PopulationDeliveryStatus.SENT,
          outcomeUnknownAt: expect.any(Date),
          errorCode: 'BREVO_SMS_SOFT_BOUNCE',
        }),
      }),
    );
  });

  it('records duplicate provider events idempotently', async () => {
    correlatedDelivery();
    const duplicate = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
    });
    (prisma.$transaction as jest.Mock).mockRejectedValueOnce(duplicate);
    await expect(
      service.receive('Bearer secret', deliveryEvent('delivered')),
    ).resolves.toEqual({ received: true });
  });

  it('does not mutate an unknown or ambiguous provider message id', async () => {
    await service.receive('Bearer secret', deliveryEvent('delivered'));
    expect(prisma.$transaction).not.toHaveBeenCalled();
    prisma.populationAlertDelivery.findMany.mockResolvedValue([
      { id: 'delivery-1', alertId: 'alert-1' },
      { id: 'delivery-2', alertId: 'alert-2' },
    ]);
    await service.receive('Bearer secret', deliveryEvent('delivered'));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('correlates an early webhook by the immutable SMS tag before message id persistence', async () => {
    correlatedDelivery();
    tx.populationAlertDelivery.findUnique.mockResolvedValueOnce({
      id: 'delivery-1',
      alertId: 'alert-1',
      channel: 'SMS',
      provider: null,
      providerMessageId: null,
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
      status: PopulationDeliveryStatus.SENDING,
      sentAt: null,
    });
    providerHistory({
      eventType: PopulationDeliveryProviderEventType.DELIVERED,
      providerOccurredAt: new Date('2027-01-15T10:00:02.000Z'),
    });

    await service.receive('Bearer secret', {
      ...deliveryEvent('delivered'),
      tag: ['11111111-1111-4111-8111-111111111111'],
      organizationId: 'spoofed-organization',
    });

    expect(prisma.populationAlertDelivery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          channel: 'SMS',
          OR: expect.arrayContaining([
            { idempotencyKey: '11111111-1111-4111-8111-111111111111' },
          ]),
        }),
      }),
    );
    expect(tx.populationAlertDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'delivery-1' },
        data: expect.objectContaining({
          status: PopulationDeliveryStatus.DELIVERED,
          provider: 'BREVO',
          providerMessageId: 'provider-message-1',
        }),
      }),
    );
  });

  it('refuses malformed recognized delivery events and ignores unknown events safely', async () => {
    await expect(
      service.receive('Bearer secret', {
        msg_status: 'delivered',
        messageId: '',
        ts_event: 1_800_000_000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.receive('Bearer secret', {
        msg_status: 'new_provider_status',
        to: '+15145550123',
      }),
    ).resolves.toEqual({ received: true });
    expect(tx.populationAlertDelivery.update).not.toHaveBeenCalled();
  });

  it('persists events but preserves cancelled and suppressed deliveries', async () => {
    correlatedDelivery();
    for (const status of [
      PopulationDeliveryStatus.CANCELLED,
      PopulationDeliveryStatus.SUPPRESSED,
    ]) {
      tx.populationAlertDelivery.findUnique.mockResolvedValueOnce({
        id: 'delivery-1',
        alertId: 'alert-1',
        channel: 'SMS',
        provider: 'BREVO',
        providerMessageId: 'provider-message-1',
        status,
        sentAt: null,
      });
      await service.receive('Bearer secret', deliveryEvent('delivered'));
    }
    expect(tx.populationDeliveryProviderEvent.create).toHaveBeenCalledTimes(2);
    expect(tx.populationAlertDelivery.update).not.toHaveBeenCalled();
  });
});
