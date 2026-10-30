import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../client-portal/email.service';

export type ClientInvitationEnvelope = {
  toEmail: string;
  toName: string;
  clientName: string;
  temporaryPassword: string;
  organizationName: string;
};

@Injectable()
export class ClientInvitationOutboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  private decodeKey(encoded: string | undefined, variable: string) {
    if (!encoded?.trim()) throw new Error(`${variable} is required`);
    const bytes = Buffer.from(encoded.trim(), 'base64');
    if (bytes.length !== 32) throw new Error(`${variable} must decode to 32 bytes`);
    return bytes;
  }

  private key(requestedId?: string) {
    const encoded = process.env.CLIENT_INVITATION_OUTBOX_KEY_BASE64?.trim();
    const id = process.env.CLIENT_INVITATION_OUTBOX_KEY_ID?.trim() || 'v1';
    if (!requestedId || requestedId === id) {
      return { bytes: this.decodeKey(encoded, 'CLIENT_INVITATION_OUTBOX_KEY_BASE64'), id };
    }
    let previous: Record<string, string> = {};
    try {
      previous = JSON.parse(process.env.CLIENT_INVITATION_OUTBOX_PREVIOUS_KEYS_BASE64 || '{}');
    } catch {
      throw new Error('CLIENT_INVITATION_OUTBOX_PREVIOUS_KEYS_BASE64 must be a JSON object');
    }
    return {
      bytes: this.decodeKey(previous[requestedId], `previous outbox key ${requestedId}`),
      id: requestedId,
    };
  }

  protect(envelope: ClientInvitationEnvelope, idempotencyKey: string) {
    const { bytes, id } = this.key();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', bytes, iv);
    cipher.setAAD(Buffer.from(idempotencyKey));
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(envelope), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return {
      recipientHash: createHash('sha256').update(envelope.toEmail.trim().toLowerCase()).digest('hex'),
      encryptedEnvelope: Buffer.concat([iv, tag, ciphertext]).toString('base64'),
      encryptionKeyId: id,
    };
  }

  private unprotect(encrypted: string, idempotencyKey: string, encryptionKeyId: string): ClientInvitationEnvelope {
    const { bytes } = this.key(encryptionKeyId);
    const packed = Buffer.from(encrypted, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', bytes, packed.subarray(0, 12));
    decipher.setAAD(Buffer.from(idempotencyKey));
    decipher.setAuthTag(packed.subarray(12, 28));
    return JSON.parse(Buffer.concat([
      decipher.update(packed.subarray(28)),
      decipher.final(),
    ]).toString('utf8')) as ClientInvitationEnvelope;
  }

  @Cron('*/30 * * * * *')
  async dispatchDue() {
    const now = new Date();
    await this.prisma.clientInvitationEvent.updateMany({
      where: {
        status: 'PROCESSING',
        leaseExpiresAt: { lte: now },
        attempts: { lt: 5 },
      },
      data: {
        status: 'FAILED',
        nextAttemptAt: now,
        leaseExpiresAt: null,
        lastErrorCode: 'LEASE_EXPIRED',
      },
    });
    const due = await this.prisma.clientInvitationEvent.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        nextAttemptAt: { lte: now },
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { id: true },
    });
    for (const event of due) await this.dispatchOne(event.id);
  }

  async dispatchOne(id: string) {
    const current = await this.prisma.clientInvitationEvent.findUnique({
      where: { id },
      include: {
        client: { select: { isActive: true } },
        clientUser: { select: { isActive: true } },
        building: { select: { isActive: true } },
      },
    });
    if (!current || !['PENDING', 'FAILED'].includes(current.status) || current.attempts >= 5) {
      return { claimed: false };
    }
    if (!current.client.isActive || !current.clientUser.isActive || (current.buildingId && !current.building?.isActive)) {
      await this.prisma.clientInvitationEvent.updateMany({
        where: { id, status: { in: ['PENDING', 'FAILED'] } },
        data: { status: 'CANCELLED', nextAttemptAt: null, leaseExpiresAt: null, lastErrorCode: 'RECIPIENT_INELIGIBLE' },
      });
      return { claimed: false, cancelled: true };
    }
    const leaseExpiresAt = new Date(Date.now() + 60_000);
    const claimed = await this.prisma.clientInvitationEvent.updateMany({
      where: { id, status: current.status, attempts: current.attempts },
      data: { status: 'PROCESSING', attempts: { increment: 1 }, nextAttemptAt: null, leaseExpiresAt },
    });
    if (claimed.count !== 1) return { claimed: false };

    try {
      const eligibility = await this.prisma.clientInvitationEvent.findUnique({
        where: { id },
        include: {
          client: { select: { isActive: true } },
          clientUser: { select: { isActive: true } },
          building: { select: { isActive: true } },
        },
      });
      if (!eligibility?.client.isActive || !eligibility.clientUser.isActive || (eligibility.buildingId && !eligibility.building?.isActive)) {
        await this.prisma.clientInvitationEvent.update({
          where: { id },
          data: { status: 'CANCELLED', leaseExpiresAt: null, lastErrorCode: 'RECIPIENT_INELIGIBLE' },
        });
        return { claimed: true, delivered: false, cancelled: true };
      }
      const envelope = this.unprotect(current.encryptedEnvelope, current.idempotencyKey, current.encryptionKeyId);
      const result = await this.email.sendClientInvitation(envelope);
      if (!result.success) throw new Error('PROVIDER_REJECTED');
      const recorded = await this.prisma.clientInvitationEvent.updateMany({
        where: { id, status: 'PROCESSING' },
        data: {
          status: 'DELIVERED',
          providerMessageId: result.messageId,
          deliveredAt: new Date(),
          leaseExpiresAt: null,
          lastErrorCode: null,
        },
      });
      return recorded.count === 1
        ? { claimed: true, delivered: true }
        : { claimed: true, delivered: false, cancelled: true };
    } catch (error) {
      const attempts = current.attempts + 1;
      const exhausted = attempts >= 5;
      await this.prisma.clientInvitationEvent.updateMany({
        where: { id, status: 'PROCESSING' },
        data: {
          status: exhausted ? 'EXHAUSTED' : 'FAILED',
          nextAttemptAt: exhausted ? null : new Date(Date.now() + Math.min(15 * 60_000, 30_000 * 2 ** (attempts - 1))),
          leaseExpiresAt: null,
          lastErrorCode: error instanceof Error && error.message === 'PROVIDER_REJECTED'
            ? 'PROVIDER_REJECTED'
            : 'PROVIDER_ERROR',
        },
      });
      return { claimed: true, delivered: false, exhausted };
    }
  }
}
