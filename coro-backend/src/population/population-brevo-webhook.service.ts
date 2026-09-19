import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PopulationAlertStatus,
  PopulationAlertChannel,
  PopulationDeliveryProviderEventType,
  PopulationDeliveryStatus,
  Prisma,
} from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  POPULATION_ENVIRONMENT,
  PopulationReadinessService,
} from './population-readiness.service';

type ParsedBrevoEvent = {
  eventType: PopulationDeliveryProviderEventType;
  providerMessageId: string;
  providerOccurredAt: Date;
  correlationKey: string | null;
  eventFingerprint: string;
  payloadFingerprint: string;
};

const BREVO_EVENT_TYPES: Record<
  string,
  PopulationDeliveryProviderEventType | undefined
> = {
  request: PopulationDeliveryProviderEventType.ACCEPTED,
  sent: PopulationDeliveryProviderEventType.ACCEPTED,
  delivered: PopulationDeliveryProviderEventType.DELIVERED,
  deferred: PopulationDeliveryProviderEventType.DEFERRED,
  soft_bounce: PopulationDeliveryProviderEventType.SOFT_BOUNCE,
  softBounce: PopulationDeliveryProviderEventType.SOFT_BOUNCE,
  hard_bounce: PopulationDeliveryProviderEventType.HARD_BOUNCE,
  hardBounce: PopulationDeliveryProviderEventType.HARD_BOUNCE,
  blocked: PopulationDeliveryProviderEventType.BLOCKED,
  invalid: PopulationDeliveryProviderEventType.INVALID,
  invalid_email: PopulationDeliveryProviderEventType.INVALID,
  error: PopulationDeliveryProviderEventType.ERROR,
  spam: PopulationDeliveryProviderEventType.SPAM,
  unsubscribed: PopulationDeliveryProviderEventType.UNSUBSCRIBED,
};

const DEFINITIVE_FAILURES = new Set<PopulationDeliveryProviderEventType>([
  PopulationDeliveryProviderEventType.HARD_BOUNCE,
  PopulationDeliveryProviderEventType.BLOCKED,
  PopulationDeliveryProviderEventType.INVALID,
  PopulationDeliveryProviderEventType.ERROR,
  PopulationDeliveryProviderEventType.SPAM,
  PopulationDeliveryProviderEventType.UNSUBSCRIBED,
]);

@Injectable()
export class PopulationBrevoWebhookService {
  private readonly logger = new Logger(PopulationBrevoWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly readiness: PopulationReadinessService,
    @Inject(POPULATION_ENVIRONMENT)
    private readonly env: NodeJS.ProcessEnv,
  ) {}

  async receive(authorization: string | undefined, payload: unknown) {
    this.assertAuthorized(authorization);
    const parsed = this.parseEvent(payload);

    if (!parsed) {
      this.logger.log('provider=BREVO eventType=UNSUPPORTED matched=false');
      return { received: true };
    }

    const messageIdVariants = [
      parsed.providerMessageId,
      `<${parsed.providerMessageId}>`,
    ];

    const delivery = await this.prisma.populationAlertDelivery.findFirst({
      where: {
        channel: PopulationAlertChannel.EMAIL,
        OR: [
          {
            provider: 'BREVO',
            providerMessageId: { in: messageIdVariants },
          },
          ...(parsed.correlationKey
            ? [{ providerIdempotencyKey: parsed.correlationKey }]
            : []),
        ],
      },
      select: {
        id: true,
        alertId: true,
        status: true,
        provider: true,
        providerMessageId: true,
        sentAt: true,
        deliveredAt: true,
        failedAt: true,
        outcomeUnknownAt: true,
      },
    });

    if (!delivery) {
      this.logger.log(
        `provider=BREVO eventType=${parsed.eventType} matched=false`,
      );
      return { received: true };
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.populationDeliveryProviderEvent.create({
          data: {
            deliveryId: delivery.id,
            provider: 'BREVO',
            providerMessageId: parsed.providerMessageId,
            eventType: parsed.eventType,
            providerOccurredAt: parsed.providerOccurredAt,
            eventFingerprint: parsed.eventFingerprint,
            payloadFingerprint: parsed.payloadFingerprint,
          },
        });

        const events = await tx.populationDeliveryProviderEvent.findMany({
          where: { deliveryId: delivery.id },
          select: { eventType: true, providerOccurredAt: true },
        });

        await this.projectDelivery(tx, delivery, parsed, events);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { received: true };
      }
      throw error;
    }

    await this.finalizeAlert(delivery.alertId);
    this.logger.log(
      `provider=BREVO eventType=${parsed.eventType} matched=true`,
    );
    return { received: true };
  }

  async reconcileUnknownDelivery(deliveryId: string) {
    const delivery = await this.prisma.populationAlertDelivery.findUnique({
      where: { id: deliveryId },
      select: {
        status: true,
        outcomeUnknownAt: true,
        providerEvents: { select: { eventType: true } },
      },
    });

    if (!delivery?.outcomeUnknownAt) {
      if (delivery?.status === PopulationDeliveryStatus.DELIVERED) {
        return { result: 'RESOLVED_ACCEPTED' as const };
      }
      if (delivery?.status === PopulationDeliveryStatus.FAILED) {
        return { result: 'RESOLVED_FAILED' as const };
      }
      return { result: 'STILL_UNKNOWN' as const };
    }

    // Brevo ne permet pas de rechercher une requête par idempotencyKey.
    // Sans webhook corrélé, aucun renvoi ni déduction n'est sûr.
    return { result: 'STILL_UNKNOWN' as const };
  }

  private assertAuthorized(authorization: string | undefined) {
    this.readiness.assertEmailWebhookReady();
    const expected = this.env.POPULATION_BREVO_WEBHOOK_SECRET?.trim() || '';
    const supplied = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : '';
    const expectedDigest = createHash('sha256').update(expected).digest();
    const suppliedDigest = createHash('sha256').update(supplied).digest();
    if (!timingSafeEqual(expectedDigest, suppliedDigest) || !supplied) {
      throw new UnauthorizedException('Webhook non autorisé');
    }
  }

  private parseEvent(payload: unknown): ParsedBrevoEvent | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Événement fournisseur invalide');
    }
    const source = payload as Record<string, unknown>;
    if (typeof source.event !== 'string') {
      throw new BadRequestException('Événement fournisseur invalide');
    }
    const eventType = BREVO_EVENT_TYPES[source.event];
    if (!eventType) return null;

    const rawProviderMessageId =
      typeof source['message-id'] === 'string'
        ? source['message-id'].trim()
        : typeof source.messageId === 'string'
          ? source.messageId.trim()
          : '';
    if (!rawProviderMessageId || rawProviderMessageId.length > 500) {
      throw new BadRequestException('Événement fournisseur invalide');
    }
    const providerMessageId = rawProviderMessageId.replace(/^<|>$/g, '');

    const providerOccurredAt = this.parseOccurredAt(source);
    const custom =
      typeof source['X-Mailin-custom'] === 'string'
        ? source['X-Mailin-custom']
        : '';
    const correlationMatch = custom.match(
      /(?:^|;)coro-population=([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:;|$)/i,
    );
    const correlationKey = correlationMatch?.[1]?.toLowerCase() ?? null;
    const canonical = [
      'BREVO',
      providerMessageId,
      eventType,
      providerOccurredAt.toISOString(),
    ].join('|');
    const payloadCanonical = `${canonical}|${correlationKey ?? ''}`;

    return {
      eventType,
      providerMessageId,
      providerOccurredAt,
      correlationKey,
      eventFingerprint: this.sha256(canonical),
      payloadFingerprint: this.sha256(payloadCanonical),
    };
  }

  private parseOccurredAt(source: Record<string, unknown>) {
    for (const key of ['ts_epoch', 'ts_event', 'ts'] as const) {
      const value = source[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        continue;
      }
      const date = new Date(value > 10_000_000_000 ? value : value * 1000);
      if (!Number.isNaN(date.getTime())) return date;
    }
    throw new BadRequestException('Événement fournisseur invalide');
  }

  private async projectDelivery(
    tx: Prisma.TransactionClient,
    delivery: {
      id: string;
      status: PopulationDeliveryStatus;
      providerMessageId: string | null;
      sentAt: Date | null;
      deliveredAt: Date | null;
      failedAt: Date | null;
    },
    parsed: ParsedBrevoEvent,
    events: Array<{
      eventType: PopulationDeliveryProviderEventType;
      providerOccurredAt: Date;
    }>,
  ) {
    if (
      delivery.status === PopulationDeliveryStatus.CANCELLED ||
      delivery.status === PopulationDeliveryStatus.SUPPRESSED
    ) {
      return;
    }

    const delivered = events
      .filter(
        (event) =>
          event.eventType === PopulationDeliveryProviderEventType.DELIVERED,
      )
      .sort(
        (left, right) =>
          right.providerOccurredAt.getTime() - left.providerOccurredAt.getTime(),
      )[0];
    const finalFailure = events
      .filter((event) => DEFINITIVE_FAILURES.has(event.eventType))
      .sort(
        (left, right) =>
          right.providerOccurredAt.getTime() - left.providerOccurredAt.getTime(),
      )[0];

    const common = {
      provider: 'BREVO',
      providerMessageId:
        delivery.providerMessageId ?? parsed.providerMessageId,
      outcomeUnknownAt: null,
      claimedAt: null,
      leaseExpiresAt: null,
      nextAttemptAt: null,
    };

    if (delivered) {
      await tx.populationAlertDelivery.update({
        where: { id: delivery.id },
        data: {
          ...common,
          status: PopulationDeliveryStatus.DELIVERED,
          sentAt: delivery.sentAt ?? delivered.providerOccurredAt,
          deliveredAt: delivered.providerOccurredAt,
          failedAt: null,
          errorCode: null,
          errorMessage: null,
        },
      });
      return;
    }

    if (finalFailure) {
      await tx.populationAlertDelivery.update({
        where: { id: delivery.id },
        data: {
          ...common,
          status: PopulationDeliveryStatus.FAILED,
          failedAt: finalFailure.providerOccurredAt,
          errorCode: `BREVO_${finalFailure.eventType}`,
          errorMessage: 'Échec définitif confirmé par le fournisseur',
        },
      });
      return;
    }

    await tx.populationAlertDelivery.update({
      where: { id: delivery.id },
      data: {
        ...common,
        status: PopulationDeliveryStatus.SENT,
        sentAt: delivery.sentAt ?? parsed.providerOccurredAt,
        failedAt: null,
        errorCode: null,
        errorMessage: null,
      },
    });
  }

  private async finalizeAlert(alertId: string) {
    const summary = await this.prisma.populationAlertDelivery.groupBy({
      by: ['status'],
      where: { alertId },
      _count: { _all: true },
    });
    const counts = new Map(
      summary.map((row) => [row.status, row._count._all]),
    );
    const pending =
      (counts.get(PopulationDeliveryStatus.QUEUED) ?? 0) +
      (counts.get(PopulationDeliveryStatus.SENDING) ?? 0);
    if (pending > 0) return;
    const accepted =
      (counts.get(PopulationDeliveryStatus.SENT) ?? 0) +
      (counts.get(PopulationDeliveryStatus.DELIVERED) ?? 0);
    await this.prisma.populationAlert.updateMany({
      where: { id: alertId, status: PopulationAlertStatus.SENDING },
      data:
        accepted > 0
          ? { status: PopulationAlertStatus.ACTIVE, activatedAt: new Date() }
          : { status: PopulationAlertStatus.FAILED },
    });
  }

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
