/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { DeterministicEmbeddingService } from '../knowledge/deterministic-embedding.service';
import { PUBLIC_KNOWLEDGE_CATALOG } from './public-knowledge.catalog';
import { PublicKnowledgeConfig } from './public-knowledge.config';
import { PublicKnowledgeIngestionService } from './public-knowledge-ingestion.service';
import { PublicKnowledgeSecurity } from './public-knowledge-security';

describe('PublicKnowledgeIngestionService', () => {
  let existing: any;
  const chunks: any[] = [];
  const capabilities: any[] = [];
  const sourceApi = {
    findUnique: jest.fn(async () => existing),
    create: jest.fn(async ({ data }: any) => {
      existing = { id: 'public-source-id', version: 1, ...data };
      return existing;
    }),
    update: jest.fn(async ({ data }: any) => {
      existing = {
        ...existing,
        ...data,
        version:
          data.version?.increment != null
            ? existing.version + data.version.increment
            : existing.version,
      };
      return existing;
    }),
    updateMany: jest.fn(async () => ({ count: 0 })),
  };
  const prisma: any = {
    publicKnowledgeSource: sourceApi,
    publicKnowledgeChunk: {
      deleteMany: jest.fn(async () => ({ count: chunks.splice(0).length })),
      create: jest.fn(async ({ data }: any) => {
        chunks.push(data);
        return data;
      }),
    },
    publicKnowledgeCapability: {
      upsert: jest.fn(async ({ create, update }: any) => {
        const value = capabilities.length ? update : create;
        capabilities.splice(0, capabilities.length, value);
        return value;
      }),
    },
    publicKnowledgeSyncEvent: {
      create: jest.fn(async ({ data }: any) => data),
      update: jest.fn(async ({ data }: any) => data),
    },
  };
  prisma.$transaction = jest.fn(async (callback: any) => callback(prisma));
  const service = new PublicKnowledgeIngestionService(
    prisma,
    new DeterministicEmbeddingService(),
    new PublicKnowledgeSecurity(),
    new PublicKnowledgeConfig(),
  );

  beforeEach(() => {
    existing = undefined;
    chunks.splice(0);
    capabilities.splice(0);
    jest.clearAllMocks();
  });

  it('creates an isolated public source, chunks and governed capability', async () => {
    const entry = PUBLIC_KNOWLEDGE_CATALOG.find(
      (item) =>
        item.sourceKey === 'capability-PMU' && item.language === 'fr-CA',
    )!;
    const result = await service.synchronize([entry]);
    expect(result.createdCount).toBe(1);
    expect(chunks.length).toBeGreaterThan(0);
    expect(capabilities[0]).toMatchObject({
      capabilityKey: 'PMU',
      status: 'AVAILABLE',
    });
    expect(JSON.stringify(existing)).not.toMatch(
      /organization|projectFile|tenant/i,
    );
  });

  it('is idempotent and increments the version only when content changes', async () => {
    const entry = PUBLIC_KNOWLEDGE_CATALOG[0];
    await service.synchronize([entry]);
    const unchanged = await service.synchronize([entry]);
    expect(unchanged.unchangedCount).toBe(1);
    expect(existing.version).toBe(1);
    const changed = await service.synchronize([
      { ...entry, content: `${entry.content} Mise à jour approuvée.` },
    ]);
    expect(changed.updatedCount).toBe(1);
    expect(existing.version).toBe(2);
  });

  it('rejects external, private and language-mismatched sources', async () => {
    const base = PUBLIC_KNOWLEDGE_CATALOG[0];
    for (const entry of [
      { ...base, canonicalUrl: 'https://evil.example/public' },
      { ...base, canonicalUrl: 'https://getcoro.io/api/project-files' },
      {
        ...base,
        language: 'en-CA' as const,
        canonicalUrl: 'https://getcoro.io/',
      },
    ])
      await expect(service.synchronize([entry])).rejects.toThrow(
        /PUBLIC_KNOWLEDGE_/,
      );
  });

  it('revokes a source through the public-only authority', async () => {
    await service.synchronize([PUBLIC_KNOWLEDGE_CATALOG[0]]);
    await service.revoke('coro-overview', 'fr-CA');
    expect(sourceApi.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorityStatus: 'REVOKED',
          indexedAt: null,
        }),
      }),
    );
  });
});
