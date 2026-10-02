import { PrismaClient } from '@prisma/client';
import { PopulationPhoneAuditService } from '../common/phone/population-phone-audit.service';

const prisma = new PrismaClient();

async function readSubscribers() {
  const [mode] = await prisma.$queryRaw<
    Array<{ transactionReadOnly: string }>
  >`SELECT current_setting('transaction_read_only') AS "transactionReadOnly"`;
  if (mode?.transactionReadOnly !== 'on') {
    throw new Error(
      'Database session must enforce transaction_read_only=on for this audit',
    );
  }
  return prisma.populationSubscriber.findMany({
    orderBy: [{ programId: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      programId: true,
      phone: true,
      phoneCanonical: true,
      status: true,
      smsEnabled: true,
      emailEnabled: true,
      verifiedAt: true,
      createdAt: true,
      _count: {
        select: {
          consentEvents: true,
          smsConsentEvidence: true,
          alertDeliveries: true,
        },
      },
    },
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const url = new URL(databaseUrl);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (!local && !process.argv.includes('--allow-remote-read-only')) {
    throw new Error('Remote audit requires --allow-remote-read-only');
  }

  const subscribers = await readSubscribers();
  const report = new PopulationPhoneAuditService().audit(
    subscribers.map((subscriber) => ({
      id: subscriber.id,
      programId: subscriber.programId,
      phone: subscriber.phone,
      phoneCanonical: subscriber.phoneCanonical,
      status: subscriber.status,
      smsEnabled: subscriber.smsEnabled,
      emailEnabled: subscriber.emailEnabled,
      verifiedAt: subscriber.verifiedAt,
      createdAt: subscriber.createdAt,
      consentEvidenceCount:
        subscriber._count.consentEvents + subscriber._count.smsConsentEvidence,
      historicalDeliveryCount: subscriber._count.alertDeliveries,
    })),
    { detailedCollisions: process.argv.includes('--detailed-collisions') },
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Population phone audit failed'}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
