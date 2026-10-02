import { PrismaClient } from '@prisma/client';
import { PopulationPhoneBackfillService } from './population-phone-backfill.service';

const prisma = new PrismaClient();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const url = new URL(databaseUrl);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  const apply = process.argv.includes('--apply');
  const confirmation = process.argv
    .find((argument) => argument.startsWith('--confirm='))
    ?.slice('--confirm='.length);

  if (apply) {
    if (confirmation !== 'PHONE-01D') {
      throw new Error('Apply requires --apply --confirm=PHONE-01D');
    }
    if (!local && !process.argv.includes('--allow-remote-write')) {
      throw new Error('Remote apply requires --allow-remote-write');
    }
  } else {
    const [mode] = await prisma.$queryRaw<
      Array<{ transactionReadOnly: string }>
    >`SELECT current_setting('transaction_read_only') AS "transactionReadOnly"`;
    if (mode?.transactionReadOnly !== 'on') {
      throw new Error('Dry-run requires transaction_read_only=on');
    }
    if (!local && !process.argv.includes('--allow-remote-read-only')) {
      throw new Error('Remote dry-run requires --allow-remote-read-only');
    }
  }

  const service = new PopulationPhoneBackfillService();
  const result = apply
    ? await service.apply(prisma, confirmation!)
    : await service.dryRun(prisma);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Population phone backfill failed'}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
