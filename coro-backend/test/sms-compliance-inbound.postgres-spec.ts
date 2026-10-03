import {
  PopulationInboundSmsEventType,
  PopulationSmsSuppressionReason,
  PrismaClient,
} from '@prisma/client';
import { randomUUID } from 'crypto';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour sms-compliance-inbound.postgres-spec',
  );
}

describe('SMS compliance inbound PostgreSQL invariants', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const prefix = `sms01b-${Date.now()}`;

  afterAll(async () => {
    await prisma.populationSmsSuppression.deleteMany({
      where: { source: prefix },
    });
    await prisma.populationInboundSmsEvent.deleteMany({
      where: { providerEventKey: { startsWith: prefix } },
    });
    await prisma.$disconnect();
  });

  const eventData = (providerEventKey: string, phoneCanonical: string) => ({
    provider: 'BREVO',
    providerEventKey,
    eventType: PopulationInboundSmsEventType.STOP,
    phoneCanonical,
    providerOccurredAt: new Date('2026-10-03T12:00:00.000Z'),
    payloadFingerprint: 'a'.repeat(64),
  });

  it('enforces durable event idempotency under concurrent inserts', async () => {
    const key = `${prefix}-concurrent-event`;
    const phone = `+1514${String(Date.now()).slice(-7)}`;
    const results = await Promise.allSettled([
      prisma.populationInboundSmsEvent.create({ data: eventData(key, phone) }),
      prisma.populationInboundSmsEvent.create({ data: eventData(key, phone) }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    await expect(
      prisma.populationInboundSmsEvent.count({
        where: { providerEventKey: key },
      }),
    ).resolves.toBe(1);
  });

  it('allows only one global suppression authority per canonical phone', async () => {
    const phone = `+1418${String(Date.now() + 1).slice(-7)}`;
    const first = await prisma.populationInboundSmsEvent.create({
      data: eventData(`${prefix}-origin-a`, phone),
    });
    const second = await prisma.populationInboundSmsEvent.create({
      data: eventData(`${prefix}-origin-b`, phone),
    });
    await prisma.populationSmsSuppression.create({
      data: {
        phoneCanonical: phone,
        provider: 'BREVO',
        reason: PopulationSmsSuppressionReason.PROVIDER_STOP,
        source: prefix,
        suppressedAt: new Date(),
        originEventId: first.id,
      },
    });
    await expect(
      prisma.populationSmsSuppression.create({
        data: {
          phoneCanonical: phone,
          provider: 'BREVO',
          reason: PopulationSmsSuppressionReason.PROVIDER_STOP,
          source: prefix,
          suppressedAt: new Date(),
          originEventId: second.id,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rolls back inbound evidence when STOP processing fails', async () => {
    const key = `${prefix}-rollback-${randomUUID()}`;
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.populationInboundSmsEvent.create({
          data: eventData(key, '+16045550199'),
        });
        throw new Error('injected failure');
      }),
    ).rejects.toThrow('injected failure');
    await expect(
      prisma.populationInboundSmsEvent.count({
        where: { providerEventKey: key },
      }),
    ).resolves.toBe(0);
  });
});
