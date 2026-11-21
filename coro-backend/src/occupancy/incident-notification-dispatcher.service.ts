import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PopulationDeliveryService, PopulationProviderError } from '../population/population-delivery.service';

type IncidentEnvelope = {
  destination: string;
  subject?: string;
  html?: string;
  message?: string;
};

/** Envois simultanés vers le fournisseur (débit Brevo largement supérieur). */
const DISPATCH_CONCURRENCY = 10;

/** Priorité : ceux qui agissent d'abord, les occupants ensuite. */
export function purposeRank(purpose: string): number {
  if (purpose === 'COORDINATOR_ALERT') return 0;
  if (purpose === 'MEMBER_ALERT') return 1;
  if (purpose === 'OCCUPANT_ALERT') return 3;
  return 2;
}

@Injectable()
export class IncidentNotificationDispatcherService {
  private readonly logger = new Logger(IncidentNotificationDispatcherService.name);
  constructor(private readonly prisma: PrismaService, private readonly provider: PopulationDeliveryService) {}

  private key(): { bytes: Buffer; id: string } {
    const encoded = process.env.INCIDENT_OUTBOX_KEY_BASE64?.trim();
    if (!encoded) throw new Error('INCIDENT_OUTBOX_KEY_BASE64 is required');
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length !== 32) throw new Error('INCIDENT_OUTBOX_KEY_BASE64 must decode to 32 bytes');
    return { bytes, id: process.env.INCIDENT_OUTBOX_KEY_ID?.trim() || 'v1' };
  }

  private encrypt(value: IncidentEnvelope, aad: string) {
    const { bytes, id } = this.key();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', bytes, iv);
    cipher.setAAD(Buffer.from(aad));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { encryptedEnvelope: Buffer.concat([iv, tag, ciphertext]).toString('base64'), encryptionKeyId: id };
  }

  private decrypt(encrypted: string, aad: string): IncidentEnvelope {
    const { bytes } = this.key();
    const packed = Buffer.from(encrypted, 'base64');
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const decipher = createDecipheriv('aes-256-gcm', bytes, iv);
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8'));
  }

  async enqueue(input: { organizationId: string; incidentEventId: string; channel: 'EMAIL' | 'SMS'; purpose: string; idempotencyKey: string; envelope: IncidentEnvelope; maxAttempts?: number }, tx: any = this.prisma) {
    const protectedPayload = this.encrypt(input.envelope, input.idempotencyKey);
    const recipientHash = createHash('sha256').update(input.envelope.destination.trim().toLowerCase()).digest('hex');
    return tx.incidentNotificationDelivery.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: { organizationId: input.organizationId, incidentEventId: input.incidentEventId, channel: input.channel, purpose: input.purpose, idempotencyKey: input.idempotencyKey, recipientHash, ...protectedPayload, maxAttempts: input.maxAttempts ?? 3, nextAttemptAt: new Date() },
      update: {},
    });
  }

  /**
   * Filet de sécurité (reprises après échec, envois laissés en file). Le
   * premier envoi part dès le déclenchement via dispatchIncidentNow (M2-04).
   */
  @Cron('*/15 * * * * *')
  async dispatchDue() {
    const due = await this.prisma.incidentNotificationDelivery.findMany({ where: { status: { in: ['QUEUED', 'FAILED'] }, nextAttemptAt: { lte: new Date() }, attemptCount: { lt: 3 } }, orderBy: { createdAt: 'asc' }, take: 200, select: { id: true, purpose: true, createdAt: true } });
    await this.dispatchInParallel(due);
  }

  /**
   * Envoi immédiat des notifications d'un incident qui vient d'être déclenché
   * (audit M2-04) : coordonnateur et équipe avant les occupants, en
   * parallèle. Appelé après la validation de la transaction.
   */
  async dispatchIncidentNow(incidentEventId: string) {
    const queued = await this.prisma.incidentNotificationDelivery.findMany({ where: { incidentEventId, status: 'QUEUED', attemptCount: 0 }, orderBy: { createdAt: 'asc' }, select: { id: true, purpose: true, createdAt: true } });
    return this.dispatchInParallel(queued);
  }

  private async dispatchInParallel(deliveries: Array<{ id: string; purpose: string; createdAt: Date }>) {
    const ordered = [...deliveries].sort((a, b) => (purposeRank(a.purpose) - purposeRank(b.purpose)) || (a.createdAt.getTime() - b.createdAt.getTime()));
    let next = 0;
    let accepted = 0;
    const worker = async () => {
      while (next < ordered.length) {
        const delivery = ordered[next++];
        try {
          const result = await this.dispatchOne(delivery.id);
          if ((result as any).accepted) accepted++;
        } catch (error) {
          this.logger.error(`Envoi ${delivery.id} interrompu : ${error instanceof Error ? error.message : 'erreur'}`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(DISPATCH_CONCURRENCY, ordered.length) }, worker));
    return { attempted: ordered.length, accepted };
  }

  async dispatchOne(id: string) {
    const current = await this.prisma.incidentNotificationDelivery.findUnique({ where: { id } });
    if (!current || !['QUEUED', 'FAILED'].includes(current.status) || current.attemptCount >= current.maxAttempts) return { claimed: false };
    const claimed = await this.prisma.incidentNotificationDelivery.updateMany({ where: { id, status: current.status, attemptCount: current.attemptCount }, data: { status: 'PROCESSING', attemptCount: { increment: 1 }, nextAttemptAt: null } });
    if (claimed.count !== 1) return { claimed: false };
    try {
      const envelope = this.decrypt(current.encryptedEnvelope, current.idempotencyKey);
      const fake = process.env.INCIDENT_NOTIFICATION_PROVIDER_MODE === 'FAKE';
      const result = fake
        ? { providerMessageId: `fake-${createHash('sha256').update(current.idempotencyKey).digest('hex').slice(0, 20)}` }
        : current.channel === 'EMAIL'
          ? await this.provider.sendEmail({ destination: envelope.destination, subject: envelope.subject || '', html: envelope.html || '', providerIdempotencyKey: current.idempotencyKey, organizationId: current.organizationId, operation: current.purpose })
          : await this.provider.sendSms(envelope.destination, envelope.message || '', current.organizationId, current.purpose, current.idempotencyKey);
      await this.prisma.incidentNotificationDelivery.update({ where: { id }, data: { status: 'SENT', providerMessageId: result.providerMessageId, providerAcceptedAt: new Date(), sentAt: new Date(), lastErrorCode: null, lastErrorAt: null } });
      return { claimed: true, accepted: true, delivered: false };
    } catch (error) {
      const code = error instanceof PopulationProviderError ? error.code : 'INCIDENT_PROVIDER_ERROR';
      const unknown = error instanceof PopulationProviderError && error.outcome === 'OUTCOME_UNKNOWN';
      const attempts = current.attemptCount + 1;
      const exhausted = unknown || attempts >= current.maxAttempts;
      const backoffMs = Math.min(15 * 60_000, 30_000 * 2 ** Math.max(0, attempts - 1));
      await this.prisma.$transaction(async (tx) => {
        await tx.incidentNotificationDelivery.update({ where: { id }, data: { status: exhausted ? 'EXHAUSTED' : 'FAILED', lastErrorCode: code, lastErrorAt: new Date(), nextAttemptAt: exhausted ? null : new Date(Date.now() + backoffMs) } });
        if (exhausted) await tx.incidentLog.create({ data: { incidentEventId: current.incidentEventId, action: 'Escalade notification requise', details: `Livraison ${id} epuisee; preuve fournisseur absente`, isAutomatic: true } });
      });
      return { claimed: true, accepted: false, exhausted };
    }
  }

  async recordDelivered(id: string, providerMessageId: string) {
    const updated = await this.prisma.incidentNotificationDelivery.updateMany({ where: { id, providerMessageId, status: 'SENT' }, data: { status: 'DELIVERED', providerDeliveredAt: new Date() } });
    return { recorded: updated.count === 1 };
  }

  async acknowledge(id: string) {
    const updated = await this.prisma.incidentNotificationDelivery.updateMany({ where: { id, status: { in: ['SENT', 'DELIVERED'] } }, data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() } });
    return { acknowledged: updated.count === 1 };
  }

  async cancelIncident(incidentEventId: string, reason: string, tx: any = this.prisma) {
    return tx.incidentNotificationDelivery.updateMany({ where: { incidentEventId, status: { in: ['QUEUED', 'FAILED'] } }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason, nextAttemptAt: null } });
  }
}
