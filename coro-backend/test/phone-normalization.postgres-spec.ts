import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour phone-normalization.postgres-spec',
  );
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

describe('PHONE-01A migration', () => {
  afterAll(async () => prisma.$disconnect());

  it('adds a nullable canonical phone without changing the legacy phone', async () => {
    const columns = await prisma.$queryRaw<
      Array<{ column_name: string; is_nullable: string }>
    >`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'PopulationSubscriber'
        AND column_name IN ('phone', 'phoneCanonical')
      ORDER BY column_name
    `;

    expect(columns).toEqual([
      { column_name: 'phone', is_nullable: 'YES' },
      { column_name: 'phoneCanonical', is_nullable: 'YES' },
    ]);
  });

  it('creates the scoped non-unique lookup index', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexdef: string }>>`
      SELECT indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'PopulationSubscriber'
        AND indexname = 'PopulationSubscriber_programId_phoneCanonical_idx'
    `;

    expect(indexes).toHaveLength(1);
    expect(indexes[0].indexdef).toContain('("programId", "phoneCanonical")');
    expect(indexes[0].indexdef).not.toContain('UNIQUE');
  });
});
