import { PrismaClient } from '@prisma/client';
import { PopulationIdentityAuditService } from '../population/population-identity-audit.service';

const prisma = new PrismaClient();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const hmacKey = process.env.POPULATION_IDENTITY_AUDIT_HMAC_KEY;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (!hmacKey)
    throw new Error('POPULATION_IDENTITY_AUDIT_HMAC_KEY is required');
  const url = new URL(databaseUrl);
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) &&
    !process.argv.includes('--allow-remote-read-only')
  ) {
    throw new Error('Remote audit requires --allow-remote-read-only');
  }
  const [mode] = await prisma.$queryRaw<Array<{ readOnly: string }>>`
    SELECT current_setting('transaction_read_only') AS "readOnly"
  `;
  if (mode?.readOnly !== 'on') {
    throw new Error('Database session must enforce transaction_read_only=on');
  }
  const subscribers = await prisma.populationSubscriber.findMany({
    select: {
      programId: true,
      status: true,
      email: true,
      emailCanonical: true,
      phoneCanonical: true,
      createdAt: true,
      updatedAt: true,
      verifiedAt: true,
      _count: {
        select: {
          verifications: true,
          consentEvents: true,
          smsConsentEvidence: true,
          alertDeliveries: true,
        },
      },
    },
  });
  const report = new PopulationIdentityAuditService().audit(
    subscribers.map(({ _count, ...subscriber }) => ({
      ...subscriber,
      verificationCount: _count.verifications,
      consentEventCount: _count.consentEvents,
      smsEvidenceCount: _count.smsConsentEvidence,
      alertDeliveryCount: _count.alertDeliveries,
    })),
    hmacKey,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Audit failed'}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
