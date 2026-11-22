import { DeterministicEmbeddingService } from './deterministic-embedding.service';
import { KnowledgeEmbeddingBackfillService } from './knowledge-embedding-backfill.service';
import { KnowledgeRetrievalService, titanSemanticScore } from './knowledge-retrieval.service';
import {
  cosine,
  LOCAL_EMBEDDING_MODEL,
  SemanticEmbeddingService,
  TITAN_DIMENSIONS,
  TITAN_EMBEDDING_MODEL,
  TITAN_MODEL_ID,
} from './semantic-embedding.service';

function config(overrides: Record<string, unknown> = {}) {
  return {
    embeddingProvider: 'bedrock-titan-v2',
    embeddingRegion: 'ca-central-1',
    embeddingTimeoutMs: 1000,
    embeddingBackfillBatch: 10,
    rolesAnywhereSessionSeconds: 900,
    awsProfile: 'test',
    awsConfigFile: '/dev/null',
    maxResults: 8,
    assertEmbeddingActivation() {
      if (this.embeddingRegion !== 'ca-central-1') throw new Error('region');
    },
    ...overrides,
  } as any;
}

/** Vecteur Titan factice : une direction par « sens ». */
function vector(axis: number) {
  const values = Array<number>(TITAN_DIMENSIONS).fill(0);
  values[axis] = 1;
  values[(axis + 1) % TITAN_DIMENSIONS] = 0.2;
  return values;
}

function titanClient(byText: (text: string) => number[] | Error) {
  const send = jest.fn(async (command: any) => {
    const body = JSON.parse(command.input.body);
    const result = byText(body.inputText);
    if (result instanceof Error) throw result;
    return { body: new TextEncoder().encode(JSON.stringify({ embedding: result })) };
  });
  return { send };
}

describe('SemanticEmbeddingService (CORO Knowledge)', () => {
  let stderr: jest.SpyInstance;
  beforeEach(() => {
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });
  afterEach(() => stderr.mockRestore());

  it('uses the local projection when Titan is not selected', async () => {
    const service = new SemanticEmbeddingService(
      config({ embeddingProvider: 'deterministic' }),
      new DeterministicEmbeddingService(),
    );
    const result = await service.embedDocument('Plan des issues');
    expect(result.model).toBe(LOCAL_EMBEDDING_MODEL);
    expect(result.vector).toHaveLength(DeterministicEmbeddingService.dimension);
    expect(await service.embedQuery('Plan des issues')).toBeNull();
  });

  it('calls Titan V2 in ca-central-1 with 512 normalized dimensions', async () => {
    const service = new SemanticEmbeddingService(config(), new DeterministicEmbeddingService());
    const client = titanClient(() => vector(3));
    service.setClientForTesting(client as any);
    const result = await service.embedDocument('Évacuation par escalier nord');
    expect(result).toEqual({ model: TITAN_EMBEDDING_MODEL, vector: vector(3) });
    const input = client.send.mock.calls[0][0].input;
    expect(input.modelId).toBe(TITAN_MODEL_ID);
    expect(JSON.parse(input.body)).toEqual({
      inputText: 'Évacuation par escalier nord',
      dimensions: 512,
      normalize: true,
    });
  });

  it('caches question vectors', async () => {
    const service = new SemanticEmbeddingService(config(), new DeterministicEmbeddingService());
    const client = titanClient(() => vector(1));
    service.setClientForTesting(client as any);
    await service.embedQuery('Où est la sortie ?');
    await service.embedQuery('Où est la sortie ?');
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  it('falls back locally and opens the circuit after repeated failures', async () => {
    const service = new SemanticEmbeddingService(config(), new DeterministicEmbeddingService());
    const client = titanClient(() => Object.assign(new Error('denied'), { name: 'AccessDeniedException' }));
    service.setClientForTesting(client as any);
    for (let attempt = 0; attempt < 3; attempt += 1)
      expect((await service.embedDocument('Texte')).model).toBe(LOCAL_EMBEDDING_MODEL);
    expect(service.titanAvailable()).toBe(false);
    await service.embedDocument('Texte');
    expect(client.send).toHaveBeenCalledTimes(3);
    const log = String(stderr.mock.calls[0][0]);
    expect(log).toContain('AccessDeniedException');
    expect(log).not.toContain('Texte');
  });

  it('rejects malformed Titan vectors', async () => {
    const service = new SemanticEmbeddingService(config(), new DeterministicEmbeddingService());
    service.setClientForTesting(titanClient(() => [1, 2, 3]) as any);
    expect((await service.embedDocument('Texte')).model).toBe(LOCAL_EMBEDDING_MODEL);
  });

  it('refuses any region other than ca-central-1', async () => {
    const service = new SemanticEmbeddingService(
      config({ embeddingRegion: 'us-east-1' }),
      new DeterministicEmbeddingService(),
    );
    const client = titanClient(() => vector(1));
    service.setClientForTesting(client as any);
    expect((await service.embedDocument('Texte')).model).toBe(LOCAL_EMBEDDING_MODEL);
    expect(client.send).not.toHaveBeenCalled();
  });

  it('maps cosine similarity to a bounded semantic score', () => {
    expect(cosine(vector(2), vector(2))).toBeCloseTo(1);
    expect(titanSemanticScore(0.1)).toBe(0);
    expect(titanSemanticScore(0.8)).toBeCloseTo(1);
    expect(titanSemanticScore(0.525)).toBeCloseTo(0.5);
  });
});

describe('KnowledgeRetrievalService with Titan vectors', () => {
  const now = new Date();
  function chunk(id: string, text: string, axis: number) {
    return {
      id,
      text,
      embedding: vector(axis),
      embeddingModel: TITAN_EMBEDDING_MODEL,
      pageStart: 1,
      pageEnd: 1,
      sectionPath: null,
      createdAt: now,
      ingestion: {
        buildingId: 'b1',
        projectFile: { id: `file-${id}`, version: 1, name: 'PMU', sha256: 'a'.repeat(64) },
      },
      citations: [{ id: `cit-${id}` }],
    };
  }

  it('finds a chunk by meaning even without shared words', async () => {
    const chunks = [
      chunk('evac', "Rassemblement au stationnement après l'évacuation.", 7),
      chunk('cafe', 'Horaire de la cafétéria.', 90),
    ];
    const prisma: any = {
      $queryRaw: jest.fn(async () => []),
      projectFileKnowledgeChunk: { findMany: jest.fn(async () => chunks) },
    };
    const authorization: any = {
      scope: jest.fn(async () => ({ organizationId: 'org', buildingIds: undefined })),
      where: jest.fn(() => ({ organizationId: 'org' })),
    };
    const semantic: any = { embedQuery: jest.fn(async () => vector(7)) };
    const service = new KnowledgeRetrievalService(
      prisma,
      authorization,
      new DeterministicEmbeddingService(),
      { maxResults: 8 } as any,
      { search: jest.fn(async () => []) } as any,
      semantic,
    );
    const hits = await service.search(
      { type: 'INTERNAL_USER', id: 'u', organizationId: 'org', role: 'ADMIN' } as any,
      'Où doit-on se regrouper dehors ?',
    );
    expect(hits[0].chunkId).toBe('evac');
    expect(hits[0].score).toBeGreaterThanOrEqual(0.25);
    expect(hits.find((hit) => hit.chunkId === 'cafe')?.score ?? 0).toBeLessThan(0.25);
  });

  it('widens recall with recent Titan chunks when full text finds few', async () => {
    const prisma: any = {
      $queryRaw: jest.fn(async () => [{ id: 'fts', rank: 0.5 }]),
      projectFileKnowledgeChunk: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'recent-1' }, { id: 'recent-2' }])
          .mockResolvedValueOnce([]),
      },
    };
    const service = new KnowledgeRetrievalService(
      prisma,
      {
        scope: jest.fn(async () => ({ organizationId: 'org', buildingIds: undefined })),
        where: jest.fn(() => ({ organizationId: 'org' })),
      } as any,
      new DeterministicEmbeddingService(),
      { maxResults: 8 } as any,
      { search: jest.fn(async () => []) } as any,
      { embedQuery: jest.fn(async () => vector(1)) } as any,
    );
    await service.search(
      { type: 'INTERNAL_USER', id: 'u', organizationId: 'org', role: 'ADMIN' } as any,
      'Procédure incendie',
    );
    const recentQuery = prisma.projectFileKnowledgeChunk.findMany.mock.calls[0][0];
    expect(recentQuery.where).toMatchObject({
      organizationId: 'org',
      embeddingModel: TITAN_EMBEDDING_MODEL,
      id: { notIn: ['fts'] },
    });
    const mainQuery = prisma.projectFileKnowledgeChunk.findMany.mock.calls[1][0];
    expect(mainQuery.where.id.in).toEqual(['fts', 'recent-1', 'recent-2']);
  });
});

describe('KnowledgeEmbeddingBackfillService', () => {
  it('converts legacy chunks with a conditional write and skips failures', async () => {
    const prisma: any = {
      projectFileKnowledgeChunk: {
        findMany: jest.fn(async () => [
          { id: 'a', text: 'Plan A', embeddingModel: null },
          { id: 'b', text: 'Plan B', embeddingModel: LOCAL_EMBEDDING_MODEL },
        ]),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
    };
    const semantic: any = {
      titanAvailable: () => true,
      embedDocument: jest.fn(async (text: string) =>
        text === 'Plan A'
          ? { model: TITAN_EMBEDDING_MODEL, vector: vector(4) }
          : { model: LOCAL_EMBEDDING_MODEL, vector: [] },
      ),
    };
    const service = new KnowledgeEmbeddingBackfillService(prisma, config(), semantic);
    expect(await service.runBatch(10)).toBe(1);
    expect(prisma.projectFileKnowledgeChunk.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.projectFileKnowledgeChunk.updateMany.mock.calls[0][0]).toEqual({
      where: { id: 'a', embeddingModel: null },
      data: { embedding: vector(4), embeddingModel: TITAN_EMBEDDING_MODEL },
    });
  });

  it('does nothing while Titan is unavailable', async () => {
    const prisma: any = { projectFileKnowledgeChunk: { findMany: jest.fn() } };
    const service = new KnowledgeEmbeddingBackfillService(prisma, config(), {
      titanAvailable: () => false,
    } as any);
    await service.tick();
    expect(prisma.projectFileKnowledgeChunk.findMany).not.toHaveBeenCalled();
  });
});
