import { PrismaClient } from '@prisma/client';
import { DeterministicEmbeddingService } from '../src/knowledge/deterministic-embedding.service';
import { PUBLIC_KNOWLEDGE_CATALOG } from '../src/public-knowledge/public-knowledge.catalog';
import { PublicKnowledgeConfig } from '../src/public-knowledge/public-knowledge.config';
import { PublicKnowledgeDatabaseService } from '../src/public-knowledge/public-knowledge-database.service';
import { PublicKnowledgeIngestionService } from '../src/public-knowledge/public-knowledge-ingestion.service';
import { PublicKnowledgeSearchService } from '../src/public-knowledge/public-knowledge-search.service';
import { PublicKnowledgeSecurity } from '../src/public-knowledge/public-knowledge-security';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour Public Knowledge',
  );

describe('Public Knowledge isolated PostgreSQL 16 authority', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const security = new PublicKnowledgeSecurity();
  const embeddings = new DeterministicEmbeddingService();
  const config = new PublicKnowledgeConfig();
  const ingestion = new PublicKnowledgeIngestionService(
    prisma as unknown as PrismaService,
    embeddings,
    security,
    config,
  );
  const search = new PublicKnowledgeSearchService(
    prisma as unknown as PublicKnowledgeDatabaseService,
    embeddings,
    security,
    config,
  );

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.publicKnowledgeSyncEvent.deleteMany();
    await prisma.publicKnowledgeSource.deleteMany();
  });

  afterAll(async () => {
    await prisma.publicKnowledgeSyncEvent.deleteMany();
    await prisma.publicKnowledgeSource.deleteMany();
    await prisma.$disconnect();
  });

  it('ingests the governed bilingual corpus idempotently and retrieves citations', async () => {
    const first = await ingestion.synchronize(PUBLIC_KNOWLEDGE_CATALOG);
    expect(first).toMatchObject({
      createdCount: PUBLIC_KNOWLEDGE_CATALOG.length,
    });
    const second = await ingestion.synchronize(PUBLIC_KNOWLEDGE_CATALOG);
    expect(second).toMatchObject({
      unchangedCount: PUBLIC_KNOWLEDGE_CATALOG.length,
    });

    const sources = await prisma.publicKnowledgeSource.count();
    const chunks = await prisma.publicKnowledgeChunk.count();
    expect(sources).toBe(PUBLIC_KNOWLEDGE_CATALOG.length);
    expect(chunks).toBeGreaterThanOrEqual(sources);

    const results = await search.search(
      'Quelle différence entre PMU et PSI ?',
      'fr-CA',
    );
    expect(results.map((result) => result.sourceKey)).toEqual(
      expect.arrayContaining(['capability-PMU', 'capability-PSI']),
    );
    expect(
      results.every((result) => result.citation.sourceId === result.sourceId),
    ).toBe(true);
  });

  it('has no tenant-owned foreign key or private authority column', async () => {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name LIKE 'PublicKnowledge%'
    `;
    const names = columns.map((row) => row.column_name.toLowerCase());
    expect(names).not.toEqual(
      expect.arrayContaining([
        'organizationid',
        'buildingid',
        'projectfileid',
        'tenantid',
        'clientuserid',
      ]),
    );

    const forbiddenForeignKeys = await prisma.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT COUNT(*)::bigint AS count
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name LIKE 'PublicKnowledge%'
        AND ccu.table_name NOT LIKE 'PublicKnowledge%'
    `;
    expect(Number(forbiddenForeignKeys[0].count)).toBe(0);
  });

  it('withdraws omitted sources and excludes revoked sources from current retrieval', async () => {
    const retained = PUBLIC_KNOWLEDGE_CATALOG.filter(
      (entry) => entry.sourceKey === 'coro-overview',
    );
    const reconciliation = await ingestion.synchronize(retained, {
      reconcile: true,
    });
    expect(reconciliation.withdrawnCount).toBe(
      PUBLIC_KNOWLEDGE_CATALOG.length - retained.length,
    );

    await ingestion.synchronize(PUBLIC_KNOWLEDGE_CATALOG, { reconcile: true });
    await ingestion.revoke('security', 'fr-CA');
    const results = await search.search('Certification ISO 22301', 'fr-CA');
    expect(results.map((result) => result.sourceKey)).not.toContain('security');
  });

  it('keeps deterministic retrieval within the initial local performance budget', async () => {
    await ingestion.synchronize(PUBLIC_KNOWLEDGE_CATALOG, { reconcile: true });
    const durations: number[] = [];
    for (let index = 0; index < 50; index += 1) {
      const startedAt = performance.now();
      await search.search('Comment fonctionne CORO Knowledge ?', 'fr-CA');
      durations.push(performance.now() - startedAt);
    }
    durations.sort((left, right) => left - right);
    const medianMs = durations[Math.floor(durations.length * 0.5)];
    const p95Ms = durations[Math.floor(durations.length * 0.95)];
    process.stdout.write(
      `${JSON.stringify({ event: 'PUBLIC_KNOWLEDGE_PERFORMANCE', medianMs, p95Ms })}\n`,
    );
    expect(p95Ms).toBeLessThan(250);
  });

  it('supports a read-only public SQL identity and rejects private tables and writes', async () => {
    const role = 'coro_public_knowledge_qa';
    const password = 'public_knowledge_disposable_only';
    await prisma.$executeRawUnsafe(`DROP ROLE IF EXISTS ${role}`);
    await prisma.$executeRawUnsafe(
      `CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
    );
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await prisma.$executeRawUnsafe(
      `GRANT SELECT ON TABLE "PublicKnowledgeSource", "PublicKnowledgeChunk", "PublicKnowledgeCapability" TO ${role}`,
    );

    const limitedUrl = new URL(databaseUrl);
    limitedUrl.username = role;
    limitedUrl.password = password;
    const limited = new PrismaClient({
      datasources: { db: { url: limitedUrl.toString() } },
    });
    await limited.$connect();
    try {
      await expect(
        limited.publicKnowledgeSource.count(),
      ).resolves.toBeGreaterThan(0);
      await expect(limited.projectFile.count()).rejects.toThrow();
      await expect(
        limited.publicKnowledgeSource.updateMany({
          data: { authorityRank: 999 },
        }),
      ).rejects.toThrow();
    } finally {
      await limited.$disconnect();
      await prisma.$executeRawUnsafe(`DROP OWNED BY ${role}`);
      await prisma.$executeRawUnsafe(`DROP ROLE ${role}`);
    }
  });
});
