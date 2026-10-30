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

  private key() {
    const encoded = process.env.CLIENT_INVITATION_OUTBOX_KEY_BASE64?.trim();
    if (!encoded) throw new Error('CLIENT_INVITATION_OUTBOX_KEY_BASE64 is required');
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length !== 32) throw new Error('CLIENT_INVITATION_OUTBOX_KEY_BASE64 must decode to 32 bytes');
    return { bytes, id: process.env.CLIENT_INVITATION_OUTBOX_KEY_ID?.trim() || 'v1' };
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

  private unprotect(encrypted: string, idempotencyKey: string): ClientInvitationEnvelope {
    const { bytes } = this.key();
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
    const current = await this.prisma.clientInvitationEvent.findUnique({ where: { id } });
    if (!current || !['PENDING', 'FAILED'].includes(current.status) || current.attempts >= 5) {
      return { claimed: false };
    }
    const leaseExpiresAt = new Date(Date.now() + 60_000);
    const claimed = await this.prisma.clientInvitationEvent.updateMany({
      where: { id, status: current.status, attempts: current.attempts },
      data: { status: 'PROCESSING', attempts: { increment: 1 }, nextAttemptAt: null, leaseExpiresAt },
    });
    if (claimed.count !== 1) return { claimed: false };

    try {
      const envelope = this.unprotect(current.encryptedEnvelope, current.idempotencyKey);
      const result = await this.email.sendClientInvitation(envelope);
      if (!result.success) throw new Error('PROVIDER_REJECTED');
      await this.prisma.clientInvitationEvent.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          providerMessageId: result.messageId,
          deliveredAt: new Date(),
          leaseExpiresAt: null,
          lastErrorCode: null,
        },
      });
      return { claimed: true, delivered: true };
    } catch (error) {
      const attempts = current.attempts + 1;
      const exhausted = attempts >= 5;
      await this.prisma.clientInvitationEvent.update({
        where: { id },
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
