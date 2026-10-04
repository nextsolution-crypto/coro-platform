/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { UnauthorizedException } from '@nestjs/common';
import { PopulationBrevoSmsWebhookService } from './population-brevo-sms-webhook.service';

describe('PopulationBrevoSmsWebhookService', () => {
  const tx = {
    $executeRaw: jest.fn(),
    populationInboundSmsEvent: { create: jest.fn() },
    populationSubscriber: { findMany: jest.fn(), updateMany: jest.fn() },
    populationSmsSuppression: { upsert: jest.fn() },
    populationConsentEvent: { createMany: jest.fn() },
  };
  const prisma = {
    populationAlertDelivery: { findFirst: jest.fn() },
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
});
