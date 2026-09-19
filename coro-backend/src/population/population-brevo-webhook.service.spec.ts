import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PopulationDeliveryProviderEventType,
  PopulationDeliveryStatus,
  Prisma,
} from '@prisma/client';
import { PopulationBrevoWebhookService } from './population-brevo-webhook.service';
import { PopulationReadinessService } from './population-readiness.service';

describe('PopulationBrevoWebhookService', () => {
  const secret = 'w'.repeat(40);
  const authorization = `Bearer ${secret}`;
  const delivery = {
    id: 'delivery-1',
    alertId: 'alert-1',
    status: PopulationDeliveryStatus.SENT,
    provider: 'BREVO',
    providerMessageId: '<message-1@brevo>',
    sentAt: new Date('2026-09-19T12:00:00.000Z'),
    deliveredAt: null,
    failedAt: null,
    outcomeUnknownAt: null,
  };
  const payload = {
    event: 'delivered',
    email: 'citizen@example.com',
    subject: 'Private message',
    'message-id': '<message-1@brevo>',
    ts_event: 1_758_283_200,
    'X-Mailin-custom':
      'coro-population=11111111-1111-4111-8111-111111111111',
  };

  const prisma = {
    populationAlertDelivery: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    populationDeliveryProviderEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    populationAlert: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };

  let service: PopulationBrevoWebhookService;

  beforeEach(() => {
    jest.clearAllMocks();
    const env = { POPULATION_BREVO_WEBHOOK_SECRET: secret };
    const readiness = new PopulationReadinessService(env);
    service = new PopulationBrevoWebhookService(
      prisma as any,
      readiness,
      env,
    );
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(prisma),
    );
    prisma.populationAlertDelivery.findFirst.mockResolvedValue(delivery);
    prisma.populationDeliveryProviderEvent.create.mockResolvedValue({ id: 'e' });
    prisma.populationDeliveryProviderEvent.findMany.mockResolvedValue([
      {
        eventType: PopulationDeliveryProviderEventType.DELIVERED,
        providerOccurredAt: new Date('2025-09-19T12:00:00.000Z'),
      },
    ]);
    prisma.populationAlertDelivery.update.mockResolvedValue({});
    prisma.populationAlertDelivery.groupBy.mockResolvedValue([
      { status: PopulationDeliveryStatus.DELIVERED, _count: { _all: 1 } },
    ]);
    prisma.populationAlert.updateMany.mockResolvedValue({ count: 0 });
  });

  it('rejette secret absent, secret erroné et configuration absente', async () => {
    await expect(service.receive(undefined, payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      service.receive('Bearer wrong-secret', payload),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const unavailable = new PopulationBrevoWebhookService(
      prisma as any,
      new PopulationReadinessService({}),
      {},
    );
    await expect(
      unavailable.receive(authorization, payload),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('accepte le bon secret et fait évoluer SENT vers DELIVERED', async () => {
    await expect(service.receive(authorization, payload)).resolves.toEqual({
      received: true,
    });
    expect(prisma.populationAlertDelivery.update).toHaveBeenCalledWith({
      where: { id: 'delivery-1' },
      data: expect.objectContaining({
        status: PopulationDeliveryStatus.DELIVERED,
        deliveredAt: expect.any(Date),
        outcomeUnknownAt: null,
      }),
    });
  });

  it('ne persiste aucune PII ni payload brut', async () => {
    await service.receive(authorization, payload);
    const persisted = JSON.stringify(
      prisma.populationDeliveryProviderEvent.create.mock.calls[0][0],
    );
    expect(persisted).not.toContain('citizen@example.com');
    expect(persisted).not.toContain('Private message');
    expect(persisted).not.toContain(secret);
    expect(persisted).not.toContain('X-Mailin-custom');
  });

  it('accepte un messageId inconnu sans fuite ni persistance', async () => {
    prisma.populationAlertDelivery.findFirst.mockResolvedValue(null);
    await expect(service.receive(authorization, payload)).resolves.toEqual({
      received: true,
    });
    expect(prisma.populationDeliveryProviderEvent.create).not.toHaveBeenCalled();
  });

  it('accepte un événement non supporté sans le stocker', async () => {
    await expect(
      service.receive(authorization, { ...payload, event: 'opened' }),
    ).resolves.toEqual({ received: true });
    expect(prisma.populationAlertDelivery.findFirst).not.toHaveBeenCalled();
  });

  it('rejette un payload invalide sans reprendre ses valeurs', async () => {
    await expect(
      service.receive(authorization, { event: 'delivered', email: 'secret@x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.populationDeliveryProviderEvent.create).not.toHaveBeenCalled();
  });

  it('traite un doublon comme un succès sans seconde transition', async () => {
    prisma.populationDeliveryProviderEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );
    await expect(service.receive(authorization, payload)).resolves.toEqual({
      received: true,
    });
    expect(prisma.populationAlertDelivery.update).not.toHaveBeenCalled();
  });

  it('préserve DELIVERED face à un ancien deferred hors ordre', async () => {
    prisma.populationDeliveryProviderEvent.findMany.mockResolvedValue([
      {
        eventType: PopulationDeliveryProviderEventType.DELIVERED,
        providerOccurredAt: new Date('2026-09-19T12:00:00.000Z'),
      },
      {
        eventType: PopulationDeliveryProviderEventType.DEFERRED,
        providerOccurredAt: new Date('2026-09-19T11:00:00.000Z'),
      },
    ]);
    await service.receive(authorization, { ...payload, event: 'deferred' });
    expect(prisma.populationAlertDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PopulationDeliveryStatus.DELIVERED,
        }),
      }),
    );
  });

  it.each(['hard_bounce', 'blocked', 'invalid_email', 'error', 'spam', 'unsubscribed'])(
    'projette %s comme échec définitif sans modifier le consentement',
    async (event) => {
      prisma.populationDeliveryProviderEvent.findMany.mockResolvedValue([
        {
          eventType:
            event === 'hard_bounce'
              ? PopulationDeliveryProviderEventType.HARD_BOUNCE
              : event === 'invalid_email'
                ? PopulationDeliveryProviderEventType.INVALID
                : (event.toUpperCase() as PopulationDeliveryProviderEventType),
          providerOccurredAt: new Date('2026-09-19T12:00:00.000Z'),
        },
      ]);
      await service.receive(authorization, { ...payload, event });
      expect(prisma.populationAlertDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PopulationDeliveryStatus.FAILED,
          }),
        }),
      );
      expect((prisma as any).populationSubscriber).toBeUndefined();
    },
  );

  it.each(['deferred', 'soft_bounce'])(
    'conserve %s comme preuve temporaire non définitive',
    async (event) => {
      prisma.populationDeliveryProviderEvent.findMany.mockResolvedValue([
        {
          eventType:
            event === 'deferred'
              ? PopulationDeliveryProviderEventType.DEFERRED
              : PopulationDeliveryProviderEventType.SOFT_BOUNCE,
          providerOccurredAt: new Date('2026-09-19T12:00:00.000Z'),
        },
      ]);
      await service.receive(authorization, { ...payload, event });
      expect(prisma.populationAlertDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PopulationDeliveryStatus.SENT,
            failedAt: null,
          }),
        }),
      );
    },
  );

  it('résout un outcome inconnu par corrélation opaque sans adresse', async () => {
    prisma.populationAlertDelivery.findFirst.mockResolvedValue({
      ...delivery,
      status: PopulationDeliveryStatus.SENDING,
      provider: null,
      providerMessageId: null,
      outcomeUnknownAt: new Date(),
    });
    prisma.populationDeliveryProviderEvent.findMany.mockResolvedValue([
      {
        eventType: PopulationDeliveryProviderEventType.ACCEPTED,
        providerOccurredAt: new Date('2026-09-19T12:00:00.000Z'),
      },
    ]);
    await service.receive(authorization, { ...payload, event: 'request' });
    expect(prisma.populationAlertDelivery.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              providerIdempotencyKey:
                '11111111-1111-4111-8111-111111111111',
            },
          ]),
        }),
      }),
    );
    expect(prisma.populationAlertDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PopulationDeliveryStatus.SENT,
          providerMessageId: 'message-1@brevo',
          outcomeUnknownAt: null,
        }),
      }),
    );
  });

  it.each([5, 60])(
    'ne renvoie jamais un outcome inconnu après %s minutes',
    async (minutes) => {
    prisma.populationAlertDelivery.findUnique.mockResolvedValue({
      status: PopulationDeliveryStatus.SENDING,
      outcomeUnknownAt: new Date(Date.now() - minutes * 60 * 1000),
      providerEvents: [],
    });
    await expect(
      service.reconcileUnknownDelivery('delivery-1'),
    ).resolves.toEqual({ result: 'STILL_UNKNOWN' });
    expect(prisma.populationAlertDelivery.update).not.toHaveBeenCalled();
    },
  );
});
