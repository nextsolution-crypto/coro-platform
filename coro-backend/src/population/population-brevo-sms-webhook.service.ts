import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PopulationAlertChannel,
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
