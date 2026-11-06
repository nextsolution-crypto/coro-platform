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
  PopulationInboundSmsEventType,
  PopulationSmsSuppressionReason,
  Prisma,
} from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { POPULATION_ENVIRONMENT } from './population-readiness.service';
import { PopulationSmsSuppressionService } from './population-sms-suppression.service';
import { populationGlobalPhoneLockKey } from './population-identity-lock';

type ParsedSmsEvent = {
  eventType: PopulationInboundSmsEventType;
  phoneCanonical: string;
  providerMessageId: string | null;
  providerOccurredAt: Date;
  providerEventKey: string;
  payloadFingerprint: string;
};

type ParsedSmsDeliveryEvent = {
  eventType: PopulationDeliveryProviderEventType;
  providerMessageId: string;
  providerOccurredAt: Date;
  eventFingerprint: string;
  payloadFingerprint: string;
  correlationKey: string | null;
};

const SMS_DELIVERY_EVENT_TYPES: Record<
  string,
  PopulationDeliveryProviderEventType | undefined
> = {
  accepted: PopulationDeliveryProviderEventType.ACCEPTED,
  sent: PopulationDeliveryProviderEventType.SENT,
  delivered: PopulationDeliveryProviderEventType.DELIVERED,
  soft_bounce: PopulationDeliveryProviderEventType.SOFT_BOUNCE,
  softbounce: PopulationDeliveryProviderEventType.SOFT_BOUNCE,
  hard_bounce: PopulationDeliveryProviderEventType.HARD_BOUNCE,
  hardbounce: PopulationDeliveryProviderEventType.HARD_BOUNCE,
  blacklisted: PopulationDeliveryProviderEventType.BLOCKED,
  blocklisted: PopulationDeliveryProviderEventType.BLOCKED,
  blocked: PopulationDeliveryProviderEventType.BLOCKED,
  rejected: PopulationDeliveryProviderEventType.REJECTED,
  skip: PopulationDeliveryProviderEventType.SKIPPED,
  skipped: PopulationDeliveryProviderEventType.SKIPPED,
};

const DEFINITIVE_SMS_FAILURES = new Set<PopulationDeliveryProviderEventType>([
  PopulationDeliveryProviderEventType.HARD_BOUNCE,
  PopulationDeliveryProviderEventType.BLOCKED,
  PopulationDeliveryProviderEventType.REJECTED,
  PopulationDeliveryProviderEventType.SKIPPED,
]);

@Injectable()
export class PopulationBrevoSmsWebhookService {
  private readonly logger = new Logger(PopulationBrevoSmsWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly suppressions: PopulationSmsSuppressionService,
    @Inject(POPULATION_ENVIRONMENT)
    private readonly env: NodeJS.ProcessEnv,
  ) {}

  async receive(authorization: string | undefined, payload: unknown) {
    this.assertAuthorized(authorization);
    const deliveryEvent = this.parseDeliveryEvent(payload);
    if (deliveryEvent) {
      return this.reconcileDeliveryEvent(deliveryEvent);
    }
    const parsed = this.parseEvent(payload);
    if (!parsed) {
      this.logger.log('provider=BREVO channel=SMS eventType=UNSUPPORTED');
      return { received: true };
    }

    const delivery = parsed.providerMessageId
      ? await this.prisma.populationAlertDelivery.findFirst({
          where: {
            channel: PopulationAlertChannel.SMS,
            provider: 'BREVO',
            providerMessageId: parsed.providerMessageId,
          },
          select: { id: true },
        })
      : null;

    try {
      await this.prisma.$transaction(async (tx) => {
        const phoneLock = populationGlobalPhoneLockKey(parsed.phoneCanonical);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${phoneLock}, 0))`;
        const event = await tx.populationInboundSmsEvent.create({
          data: {
            provider: 'BREVO',
            providerEventKey: parsed.providerEventKey,
            eventType: parsed.eventType,
            phoneCanonical: parsed.phoneCanonical,
            providerMessageId: parsed.providerMessageId,
            providerOccurredAt: parsed.providerOccurredAt,
            payloadFingerprint: parsed.payloadFingerprint,
            deliveryId: delivery?.id ?? null,
          },
        });

        if (
          parsed.eventType !== PopulationInboundSmsEventType.STOP &&
          parsed.eventType !== PopulationInboundSmsEventType.UNSUBSCRIBE
        ) {
          return;
        }

        const subscribers = await tx.populationSubscriber.findMany({
          where: { phoneCanonical: parsed.phoneCanonical },
          select: {
            id: true,
            programId: true,
            emailEnabled: true,
            program: { select: { consentVersion: true } },
          },
        });

        await tx.populationSmsSuppression.upsert({
          where: { phoneCanonical: parsed.phoneCanonical },
          create: {
            phoneCanonical: parsed.phoneCanonical,
            provider: 'BREVO',
            reason:
              parsed.eventType === PopulationInboundSmsEventType.STOP
                ? PopulationSmsSuppressionReason.PROVIDER_STOP
                : PopulationSmsSuppressionReason.PROVIDER_UNSUBSCRIBE,
            source: 'BREVO_SMS_WEBHOOK',
            suppressedAt: parsed.providerOccurredAt,
            originEventId: event.id,
          },
          update: {
            provider: 'BREVO',
            reason:
              parsed.eventType === PopulationInboundSmsEventType.STOP
                ? PopulationSmsSuppressionReason.PROVIDER_STOP
                : PopulationSmsSuppressionReason.PROVIDER_UNSUBSCRIBE,
            source: 'BREVO_SMS_WEBHOOK',
            suppressedAt: parsed.providerOccurredAt,
            originEventId: event.id,
          },
        });

        await tx.populationSubscriber.updateMany({
          where: { phoneCanonical: parsed.phoneCanonical, smsEnabled: true },
          data: { smsEnabled: false },
        });

        if (subscribers.length > 0) {
          await tx.populationConsentEvent.createMany({
            data: subscribers.map((subscriber) => ({
              programId: subscriber.programId,
              subscriberId: subscriber.id,
              type: 'CONSENT_UPDATED',
              consentVersion:
                subscriber.program.consentVersion || 'PROVIDER_STOP_V1',
              smsEnabled: false,
              emailEnabled: subscriber.emailEnabled,
              source: 'BREVO_GLOBAL_SMS_SUPPRESSION',
              occurredAt: parsed.providerOccurredAt,
            })),
          });
        }
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

    this.logger.log(
      `provider=BREVO channel=SMS eventType=${parsed.eventType} correlated=${Boolean(delivery)}`,
    );
    return { received: true };
  }

  private async reconcileDeliveryEvent(parsed: ParsedSmsDeliveryEvent) {
    const candidates = await this.prisma.populationAlertDelivery.findMany({
      where: {
        channel: PopulationAlertChannel.SMS,
        OR: [
          {
            provider: 'BREVO',
            providerMessageId: parsed.providerMessageId,
          },
          ...(parsed.correlationKey
            ? [{ idempotencyKey: parsed.correlationKey }]
            : []),
        ],
      },
      select: { id: true, alertId: true },
      take: 2,
    });
    if (candidates.length !== 1) {
      this.logger.log(
        `provider=BREVO channel=SMS eventType=${parsed.eventType} matched=false correlation=${candidates.length === 0 ? 'NONE' : 'AMBIGUOUS'}`,
      );
      return { received: true };
    }
    const candidate = candidates[0];
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`population-sms-delivery:${candidate.id}`}, 0))`;
        const delivery = await tx.populationAlertDelivery.findUnique({
          where: { id: candidate.id },
          select: {
            id: true,
            alertId: true,
            channel: true,
            provider: true,
            providerMessageId: true,
            idempotencyKey: true,
            status: true,
            sentAt: true,
          },
        });
        if (!delivery || delivery.channel !== PopulationAlertChannel.SMS) {
          return;
        }
        const providerMatch =
          delivery.provider === 'BREVO' &&
          delivery.providerMessageId === parsed.providerMessageId;
        const correlationMatch =
          parsed.correlationKey !== null &&
          delivery.idempotencyKey === parsed.correlationKey;
        if (!providerMatch && !correlationMatch) {
          return;
        }
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
        await this.projectSmsDelivery(
          tx,
          delivery,
          parsed.providerMessageId,
          events,
        );
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
    await this.finalizeAlert(candidate.alertId);
    this.logger.log(
      `provider=BREVO channel=SMS eventType=${parsed.eventType} matched=true`,
    );
    return { received: true };
  }

  private assertAuthorized(authorization: string | undefined) {
    const expected = this.env.POPULATION_BREVO_SMS_WEBHOOK_SECRET?.trim() || '';
    const supplied = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : '';
    const expectedDigest = createHash('sha256').update(expected).digest();
    const suppliedDigest = createHash('sha256').update(supplied).digest();
    if (
      !expected ||
      !supplied ||
      !timingSafeEqual(expectedDigest, suppliedDigest)
    ) {
      throw new UnauthorizedException('Webhook non autorisé');
    }
  }

  private parseEvent(payload: unknown): ParsedSmsEvent | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Événement fournisseur invalide');
    }
    const source = payload as Record<string, unknown>;
    const rawEvent =
      typeof source.event === 'string'
        ? source.event
        : typeof source.msg_status === 'string'
          ? source.msg_status
          : '';
    const normalizedEvent = rawEvent.trim().toLowerCase();
    if (
      ![
        'replied',
        'reply',
        'subscribe',
        'unsubscribe',
        'unsubscribed',
      ].includes(normalizedEvent)
    ) {
      return null;
    }

    const phone = typeof source.to === 'string' ? source.to.trim() : '';
    if (!phone || phone.length > 50) {
      throw new BadRequestException('Événement fournisseur invalide');
    }
    let phoneCanonical: string;
    try {
      phoneCanonical = this.suppressions.canonicalize(phone);
    } catch {
      throw new BadRequestException('Événement fournisseur invalide');
    }

    const reply = typeof source.reply === 'string' ? source.reply.trim() : '';
    const replyCommand = reply.toUpperCase();
    const eventType =
      normalizedEvent === 'subscribe'
        ? PopulationInboundSmsEventType.SUBSCRIBE
        : normalizedEvent === 'unsubscribe' ||
            normalizedEvent === 'unsubscribed'
          ? PopulationInboundSmsEventType.UNSUBSCRIBE
          : replyCommand === 'STOP'
            ? PopulationInboundSmsEventType.STOP
            : replyCommand === 'HELP'
              ? PopulationInboundSmsEventType.HELP
              : PopulationInboundSmsEventType.REPLY;

    const rawMessageId = source.messageId ?? source['message-id'];
    const providerMessageId =
      typeof rawMessageId === 'string' || typeof rawMessageId === 'number'
        ? String(rawMessageId).trim()
        : null;
    if (providerMessageId && providerMessageId.length > 500) {
      throw new BadRequestException('Événement fournisseur invalide');
    }
    const providerOccurredAt = this.parseOccurredAt(source);
    const providerId =
      typeof source.id === 'string' || typeof source.id === 'number'
        ? String(source.id)
        : '';
    const canonical = [
      'BREVO',
      providerId,
      eventType,
      phoneCanonical,
      providerMessageId ?? '',
      providerOccurredAt.toISOString(),
    ].join('|');
    return {
      eventType,
      phoneCanonical,
      providerMessageId,
      providerOccurredAt,
      providerEventKey: this.sha256(canonical),
      payloadFingerprint: this.sha256(`${canonical}|${replyCommand}`),
    };
  }

  private parseDeliveryEvent(payload: unknown): ParsedSmsDeliveryEvent | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Événement fournisseur invalide');
    }
    const source = payload as Record<string, unknown>;
    // Brevo can include technical status fields on inbound replies. Keep the
    // established reply/STOP path authoritative whenever reply content exists.
    if (typeof source.reply === 'string') return null;
    const rawEvent =
      typeof source.event === 'string'
        ? source.event
        : typeof source.msg_status === 'string'
          ? source.msg_status
          : '';
    const normalizedEvent = rawEvent
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const eventType = SMS_DELIVERY_EVENT_TYPES[normalizedEvent];
    if (!eventType) return null;
    const rawMessageId = source.messageId ?? source['message-id'];
    const providerMessageId =
      typeof rawMessageId === 'string' || typeof rawMessageId === 'number'
        ? String(rawMessageId).trim()
        : '';
    if (!providerMessageId || providerMessageId.length > 500) {
      throw new BadRequestException('Événement fournisseur invalide');
    }
    const providerOccurredAt = this.parseOccurredAt(source);
    const reference =
      typeof source.reference === 'string' && source.reference.length <= 500
        ? source.reference
        : '';
    const providerEventId =
      typeof source.id === 'string' || typeof source.id === 'number'
        ? String(source.id)
        : '';
    const canonical = [
      'BREVO',
      'SMS',
      providerMessageId,
      eventType,
      providerOccurredAt.toISOString(),
      providerEventId,
      reference,
    ].join('|');
    const technicalStatus =
      typeof source.status === 'string' ? source.status.slice(0, 100) : '';
    const technicalErrorCode =
      typeof source.error_code === 'string' ||
      typeof source.error_code === 'number'
        ? String(source.error_code).slice(0, 100)
        : '';
    const rawTags = Array.isArray(source.tag)
      ? source.tag
      : Array.isArray(source.tags)
        ? source.tags
        : typeof source.tag === 'string'
          ? [source.tag]
          : [];
    const correlationKey = rawTags.find(
      (tag): tag is string =>
        typeof tag === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          tag,
        ),
    );
    return {
      eventType,
      providerMessageId,
      providerOccurredAt,
      eventFingerprint: this.sha256(canonical),
      payloadFingerprint: this.sha256(
        `${canonical}|${technicalStatus}|${technicalErrorCode}`,
      ),
      correlationKey: correlationKey ?? null,
    };
  }

  private async projectSmsDelivery(
    tx: Prisma.TransactionClient,
    delivery: {
      id: string;
      status: PopulationDeliveryStatus;
      sentAt: Date | null;
    },
    providerMessageId: string,
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
    const latest = (types: Set<PopulationDeliveryProviderEventType>) =>
      events
        .filter((event) => types.has(event.eventType))
        .sort(
          (left, right) =>
            right.providerOccurredAt.getTime() -
            left.providerOccurredAt.getTime(),
        )[0];
    const delivered = latest(
      new Set([PopulationDeliveryProviderEventType.DELIVERED]),
    );
    const finalFailure = latest(DEFINITIVE_SMS_FAILURES);
    const transientFailure = latest(
      new Set([
        PopulationDeliveryProviderEventType.SOFT_BOUNCE,
        PopulationDeliveryProviderEventType.DEFERRED,
      ]),
    );
    const accepted = latest(
      new Set([
        PopulationDeliveryProviderEventType.ACCEPTED,
        PopulationDeliveryProviderEventType.SENT,
      ]),
    );
    const common = {
      provider: 'BREVO',
      providerMessageId,
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
          sentAt:
            delivery.sentAt ??
            accepted?.providerOccurredAt ??
            delivered.providerOccurredAt,
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
          errorCode: `BREVO_SMS_${finalFailure.eventType}`,
          errorMessage: 'Échec SMS définitif confirmé par le fournisseur',
        },
      });
      return;
    }
    if (transientFailure) {
      await tx.populationAlertDelivery.update({
        where: { id: delivery.id },
        data: {
          ...common,
          status: PopulationDeliveryStatus.SENT,
          sentAt:
            delivery.sentAt ??
            accepted?.providerOccurredAt ??
            transientFailure.providerOccurredAt,
          failedAt: null,
          outcomeUnknownAt: transientFailure.providerOccurredAt,
          errorCode: `BREVO_SMS_${transientFailure.eventType}`,
          errorMessage: 'Résultat SMS temporairement non confirmé',
        },
      });
      return;
    }
    if (accepted) {
      await tx.populationAlertDelivery.update({
        where: { id: delivery.id },
        data: {
          ...common,
          status: PopulationDeliveryStatus.SENT,
          sentAt: delivery.sentAt ?? accepted.providerOccurredAt,
          failedAt: null,
          errorCode: null,
          errorMessage: null,
        },
      });
    }
  }

  private async finalizeAlert(alertId: string) {
    const summary = await this.prisma.populationAlertDelivery.groupBy({
      by: ['status'],
      where: { alertId },
      _count: { _all: true },
    });
    const counts = new Map(summary.map((row) => [row.status, row._count._all]));
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

  private parseOccurredAt(source: Record<string, unknown>) {
    for (const key of ['ts_event', 'ts_epoch', 'ts'] as const) {
      const raw = source[key];
      const numeric = typeof raw === 'string' ? Number(raw) : raw;
      if (
        typeof numeric !== 'number' ||
        !Number.isFinite(numeric) ||
        numeric <= 0
      )
        continue;
      const date = new Date(
        numeric > 10_000_000_000 ? numeric : numeric * 1000,
      );
      if (!Number.isNaN(date.getTime())) return date;
    }
    throw new BadRequestException('Événement fournisseur invalide');
  }

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
