import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ProjectFilesService } from '../project-files/project-files.service';
import { KnowledgeAuthorizationService } from '../knowledge/knowledge-authorization.service';
import { KnowledgeConfig } from '../knowledge/knowledge.config';
import { KnowledgeExtractorService } from '../knowledge/knowledge-extractor.service';
import { KnowledgeNormalizer } from '../knowledge/knowledge-normalizer';
import { KnowledgeChunkerService } from '../knowledge/knowledge-chunker.service';
import { DeterministicEmbeddingService } from '../knowledge/deterministic-embedding.service';
import { KnowledgeIngestionService } from '../knowledge/knowledge-ingestion.service';
import { LibraryKnowledgeRetrievalService } from '../knowledge/library-knowledge-retrieval.service';
import { KnowledgeRetrievalService } from '../knowledge/knowledge-retrieval.service';

const describeQa =
  process.env.CORO_DEMO_DOCUMENT_QA === 'true' ? describe : describe.skip;

describeQa('CORO Demo private document and Knowledge integration', () => {
  const organizationId = 'd3eeeeee-0000-4000-8000-000000000001';
  const userId = 'd3eeeeee-0000-4000-8000-000000000002';
  const clientId = 'd3eeeeee-0000-4000-8000-000000000003';
  const buildingId = 'd3eeeeee-0000-4000-8000-000000000004';
  const projectId = 'd3eeeeee-0000-4000-8000-000000000005';
  const objects = new Map<string, Buffer>();
  const payload = Buffer.from(
    [
      'DÉMONSTRATION — DONNÉES FICTIVES — NON UTILISABLE POUR UNE INTERVENTION RÉELLE',
      'Section 1 — Point de rassemblement',
      'Le point de rassemblement fictif est la zone Boréale Alpha.',
      'La validation terrain demeure obligatoire avant toute intervention.',
    ].join('\n'),
    'utf8',
  );
  let server: Server;
  let prisma: PrismaService;
  let files: ProjectFilesService;
  let ingestion: KnowledgeIngestionService;
  let retrieval: KnowledgeRetrievalService;
  let fileId: string;

  beforeAll(async () => {
    if (!(process.env.DATABASE_URL ?? '').includes('coro_demo_qa'))
      throw new Error('QA_DATABASE_GUARD_FAILED');
    server = createServer((request, response) => {
      const key = request.url ?? '/';
      if (request.method === 'PUT') {
        const chunks: Buffer[] = [];
        request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        request.on('end', () => {
          objects.set(key, Buffer.concat(chunks));
          response.writeHead(200).end();
        });
        return;
      }
      if (request.method === 'GET' && objects.has(key)) {
        response.writeHead(200).end(objects.get(key));
        return;
      }
      response.writeHead(404).end();
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const port = (server.address() as AddressInfo).port;
    process.env.PRIVATE_STORAGE_QA_MODE = 'true';
    process.env.PRIVATE_STORAGE_QA_ENDPOINT = `http://127.0.0.1:${port}`;
    process.env.PRIVATE_STORAGE_QA_ACCESS_KEY = 'demo-qa-access';
    process.env.PRIVATE_STORAGE_QA_SECRET_KEY = 'demo-qa-secret-isolated';
    process.env.PRIVATE_STORAGE_QA_BUCKET = 'demo-private-fixtures';
    process.env.DO_SPACES_BUCKET = 'production-bucket-not-used';
    process.env.DO_SPACES_KEY = 'production-key-not-used';
    process.env.DO_SPACES_SECRET = 'production-secret-not-used';

    prisma = new PrismaService();
    await prisma.$connect();
    await prisma.organization.upsert({
      where: { id: organizationId },
      create: { id: organizationId, name: 'Organisation documentaire QA' },
      update: { isActive: true },
    });
    await prisma.user.upsert({
      where: { email: 'demo-doc-admin@example.invalid' },
      create: {
        id: userId,
        email: 'demo-doc-admin@example.invalid',
        password: 'not-authenticatable',
        firstName: 'Démo',
        lastName: 'Documentation',
        role: 'ADMIN',
        organizationId,
      },
      update: { organizationId, role: 'ADMIN', isActive: true },
    });
    await prisma.client.upsert({
      where: { id: clientId },
      create: { id: clientId, organizationId, name: 'Client documentaire QA' },
      update: {},
    });
    await prisma.building.upsert({
      where: { id: buildingId },
      create: {
        id: buildingId,
        organizationId,
        clientId,
        name: 'Édifice documentaire QA',
        address: '1, rue QA',
        city: 'Montréal',
        province: 'QC',
        postalCode: 'H0H 0H0',
      },
      update: {},
    });
    await prisma.project.upsert({
      where: { id: projectId },
      create: {
        id: projectId,
        organizationId,
        clientId,
        buildingId,
        userId,
        name: 'PMU documentaire QA',
        documentType: 'PMU',
        status: 'IN_PROGRESS',
        year: 2026,
      },
      update: { isActive: true, status: 'IN_PROGRESS' },
    });

    const storage = new StorageService();
    files = new ProjectFilesService(prisma, storage, {
      create: jest.fn(),
    } as any);
    const config = new KnowledgeConfig();
    const authorization = new KnowledgeAuthorizationService(prisma);
    const embeddings = new DeterministicEmbeddingService();
    ingestion = new KnowledgeIngestionService(
      prisma,
      files,
      authorization,
      new KnowledgeExtractorService(config),
      new KnowledgeChunkerService(config, new KnowledgeNormalizer()),
      embeddings,
      config,
    );
    retrieval = new KnowledgeRetrievalService(
      prisma,
      authorization,
      embeddings,
      config,
      new LibraryKnowledgeRetrievalService(prisma, embeddings),
    );
  });

  afterAll(async () => {
    if (prisma) {
      if (fileId) {
        await prisma.projectFileKnowledgeIngestion.deleteMany({
          where: { projectFileId: fileId },
        });
        await prisma.projectFileLifecycleEvent.deleteMany({
          where: { projectFileId: fileId },
        });
        await prisma.projectFile.deleteMany({ where: { id: fileId } });
      }
      await prisma.project.deleteMany({ where: { id: projectId } });
      await prisma.building.deleteMany({ where: { id: buildingId } });
      await prisma.client.deleteMany({ where: { id: clientId } });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
      await prisma.$disconnect();
    }
    if (server)
      await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('stores, opens, indexes, cites and revokes a canonical private document', async () => {
    const actor = { userId, organizationId, role: 'ADMIN' };
    const knowledgeActor = {
      type: 'INTERNAL_USER' as const,
      id: userId,
      organizationId,
      role: 'ADMIN',
    };
    const uploaded = await files.uploadFile({
      projectId,
      organizationId,
      name: 'Consignes Boréales — Démo.txt',
      category: 'documents_reference',
      buffer: payload,
      mimeType: 'text/plain',
      size: payload.length,
      visibility: 'shared',
      uploadedById: userId,
      actor,
    });
    fileId = uploaded.id;
    expect(uploaded).not.toHaveProperty('storageKey');
    expect(uploaded.url).toBe('private:project-file');
    expect(uploaded.url).not.toMatch(/^https?:/);

    let row = await prisma.projectFile.findUniqueOrThrow({
      where: { id: fileId },
    });
    await files.requestReview({
      fileId,
      organizationId,
      actorId: userId,
      actor,
      reason: 'Soumission documentaire QA',
      requestId: `demo-review:${fileId}`,
      lockVersion: row.lockVersion,
    });
    row = await prisma.projectFile.findUniqueOrThrow({ where: { id: fileId } });
    await files.approveFile({
      fileId,
      organizationId,
      actorId: userId,
      actor,
      reason: 'Approbation documentaire QA',
      requestId: `demo-approve:${fileId}`,
      lockVersion: row.lockVersion,
      effectiveAt: new Date(Date.now() - 60_000).toISOString(),
    });

    const downloaded = await files.downloadPrivateFile(
      fileId,
      organizationId,
      undefined,
      false,
      actor,
    );
    expect(downloaded.buffer).toEqual(payload);
    expect(createHash('sha256').update(downloaded.buffer).digest('hex')).toBe(
      createHash('sha256').update(payload).digest('hex'),
    );

    const indexed = await ingestion.index(knowledgeActor, fileId);
    expect(indexed?.status).toBe('READY');
    const hits = await retrieval.search(
      knowledgeActor,
      'zone Boréale Alpha',
      buildingId,
    );
    const hit = hits.find((candidate) => candidate.projectFileId === fileId);
    expect(hit).toMatchObject({
      projectFileVersion: 1,
      documentName: 'Consignes Boréales — Démo.txt',
      buildingId,
      sourceType: 'PROJECT_FILE',
      href: `/knowledge/sources/${fileId}`,
    });
    expect(hit?.text).toContain('zone Boréale Alpha');
    expect(hit?.citationId).toBeTruthy();

    row = await prisma.projectFile.findUniqueOrThrow({ where: { id: fileId } });
    await files.revokeFile({
      fileId,
      organizationId,
      actorId: userId,
      actor,
      reason: 'Retrait documentaire QA démontré',
      requestId: `demo-revoke:${fileId}`,
      lockVersion: row.lockVersion,
    });
    await ingestion.reconcile(fileId);
    await expect(
      files.downloadPrivateFile(
        fileId,
        organizationId,
        undefined,
        false,
        actor,
      ),
    ).rejects.toThrow();
    expect(
      (
        await retrieval.search(knowledgeActor, 'zone Boréale Alpha', buildingId)
      ).some((candidate) => candidate.projectFileId === fileId),
    ).toBe(false);
  }, 60_000);
});
