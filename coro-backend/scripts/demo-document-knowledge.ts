import { createHash } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { ProjectFilesService } from '../src/project-files/project-files.service';
import { KnowledgeAuthorizationService } from '../src/knowledge/knowledge-authorization.service';
import { KnowledgeConfig } from '../src/knowledge/knowledge.config';
import { KnowledgeExtractorService } from '../src/knowledge/knowledge-extractor.service';
import { KnowledgeNormalizer } from '../src/knowledge/knowledge-normalizer';
import { KnowledgeChunkerService } from '../src/knowledge/knowledge-chunker.service';
import { DeterministicEmbeddingService } from '../src/knowledge/deterministic-embedding.service';
import { KnowledgeIngestionService } from '../src/knowledge/knowledge-ingestion.service';
import { LibraryKnowledgeRetrievalService } from '../src/knowledge/library-knowledge-retrieval.service';
import { KnowledgeRetrievalService } from '../src/knowledge/knowledge-retrieval.service';

const ORGANIZATION_ID = '916f54ec-af22-45e0-99db-a369d9630002';
const PROJECT_ID = 'd3000003-0000-4000-8000-000000000001';
const BUILDING_ID = 'd3000002-0000-4000-8000-000000000001';
const REFERENCE_EMAIL = 'demo@getcoro.io';
const NAMESPACE = 'coro-demo-documents-v1';
const FILE_KEYS = ['knowledge-boreal-v1', 'knowledge-boreal-v2'] as const;
const FILE_NAMES = [
  'Consignes Boréales — Démo — v1.txt',
  'Consignes Boréales — Démo — v2.txt',
] as const;
const PAYLOADS = [
  [
    'DÉMONSTRATION — DONNÉES FICTIVES — NON UTILISABLE POUR UNE INTERVENTION RÉELLE',
    'Version 1 — Point de rassemblement',
    'Le point de rassemblement fictif est la zone Boréale Alpha.',
    'La validation terrain demeure obligatoire avant toute intervention.',
  ].join('\n'),
  [
    'DÉMONSTRATION — DONNÉES FICTIVES — NON UTILISABLE POUR UNE INTERVENTION RÉELLE',
    'Version 2 — Point de rassemblement',
    'Le point de rassemblement fictif courant est la zone Boréale Bravo.',
    'Le responsable fictif vérifie le registre Boréal-2026 avant le dénombrement.',
    'La validation terrain demeure obligatoire avant toute intervention.',
  ].join('\n'),
] as const;

type Command = 'dry-run' | 'prepare' | 'verify' | 'reset';

function sha(value: Buffer | string) {
  return createHash('sha256').update(value).digest('hex');
}

async function target(prisma: PrismaService, allowPaused = false) {
  const user = await prisma.user.findUnique({
    where: { email: REFERENCE_EMAIL },
    select: { id: true, organizationId: true, role: true, isActive: true },
  });
  const project = await prisma.project.findFirst({
    where: {
      id: PROJECT_ID,
      organizationId: ORGANIZATION_ID,
      buildingId: BUILDING_ID,
      isActive: true,
      status: { not: 'ARCHIVED' },
    },
    select: { id: true },
  });
  const environment = await prisma.demoEnvironment.findUnique({
    where: { organizationId: ORGANIZATION_ID },
    select: {
      status: true,
      communicationMode: true,
      externalProvidersDisabled: true,
    },
  });
  if (
    !user ||
    user.organizationId !== ORGANIZATION_ID ||
    user.role !== 'ADMIN' ||
    !user.isActive ||
    !project
  )
    throw new Error('DEMO_DOCUMENT_TARGET_NOT_VERIFIED');
  const safeEnvironment =
    environment &&
    environment.externalProvidersDisabled &&
    ((environment.status === 'ACTIVE' &&
      environment.communicationMode === 'SIMULATE') ||
      (allowPaused &&
        environment.status === 'PAUSED' &&
        environment.communicationMode === 'BLOCK'));
  if (!safeEnvironment)
    throw new Error('DEMO_COMMUNICATION_ISOLATION_NOT_VERIFIED');
  return user;
}

function services(prisma: PrismaService) {
  const files = new ProjectFilesService(prisma, new StorageService(), {
    create: async () => undefined,
  } as any);
  const config = new KnowledgeConfig();
  const authorization = new KnowledgeAuthorizationService(prisma);
  const embeddings = new DeterministicEmbeddingService();
  const ingestion = new KnowledgeIngestionService(
    prisma,
    files,
    authorization,
    new KnowledgeExtractorService(config),
    new KnowledgeChunkerService(config, new KnowledgeNormalizer()),
    embeddings,
    config,
  );
  const retrieval = new KnowledgeRetrievalService(
    prisma,
    authorization,
    embeddings,
    config,
    new LibraryKnowledgeRetrievalService(prisma, embeddings),
  );
  return { files, ingestion, retrieval };
}

async function registered(prisma: PrismaService) {
  return prisma.demoFixtureRecord.findMany({
    where: { organizationId: ORGANIZATION_ID, fixtureNamespace: NAMESPACE },
    select: { fixtureKey: true, entityId: true, state: true },
    orderBy: { fixtureKey: 'asc' },
  });
}

async function dryRun(prisma: PrismaService) {
  await target(prisma);
  const rows = await registered(prisma);
  return {
    command: 'dry-run',
    mutation: false,
    registered: rows.length,
    active: rows.filter((x) => x.state === 'ACTIVE').length,
  };
}

async function advanceFile(
  prisma: PrismaService,
  files: ProjectFilesService,
  ingestion: KnowledgeIngestionService,
  actor: { userId: string; organizationId: string; role: string },
  index: number,
  parentId?: string,
) {
  let file = await prisma.projectFile.findFirst({
    where: {
      organizationId: ORGANIZATION_ID,
      projectId: PROJECT_ID,
      name: FILE_NAMES[index],
    },
  });
  if (!file) {
    const payload = Buffer.from(PAYLOADS[index], 'utf8');
    const created = await files.uploadFile({
      projectId: PROJECT_ID,
      organizationId: ORGANIZATION_ID,
      name: FILE_NAMES[index],
      category: 'documents_reference',
      buffer: payload,
      mimeType: 'text/plain',
      size: payload.length,
      visibility: 'shared',
      uploadedById: actor.userId,
      actor,
      parentId,
    });
    file = await prisma.projectFile.findUniqueOrThrow({
      where: { id: created.id },
    });
  }
  if (file.sha256 !== sha(PAYLOADS[index]))
    throw new Error('DEMO_DOCUMENT_CONTENT_COLLISION');
  if (file.lifecycleState === 'DRAFT') {
    await files.requestReview({
      fileId: file.id,
      organizationId: ORGANIZATION_ID,
      actorId: actor.userId,
      actor,
      reason: 'Soumission documentaire de démonstration',
      requestId: `demo-doc-review:${index}:${file.id}`,
      lockVersion: file.lockVersion,
    });
    file = await prisma.projectFile.findUniqueOrThrow({
      where: { id: file.id },
    });
  }
  if (file.lifecycleState === 'REVIEW') {
    await files.approveFile({
      fileId: file.id,
      organizationId: ORGANIZATION_ID,
      actorId: actor.userId,
      actor,
      reason: 'Approbation documentaire de démonstration',
      requestId: `demo-doc-approve:${index}:${file.id}`,
      lockVersion: file.lockVersion,
      effectiveAt: new Date(
        Date.now() - (index === 0 ? 120_000 : 60_000),
      ).toISOString(),
    });
    file = await prisma.projectFile.findUniqueOrThrow({
      where: { id: file.id },
    });
  }
  if (!['APPROVED', 'SUPERSEDED'].includes(file.lifecycleState ?? ''))
    throw new Error('DEMO_DOCUMENT_NOT_APPROVED');
  if (file.lifecycleState === 'APPROVED')
    await ingestion.index(
      {
        type: 'INTERNAL_USER',
        id: actor.userId,
        organizationId: ORGANIZATION_ID,
        role: actor.role,
      },
      file.id,
    );
  await prisma.demoFixtureRecord.upsert({
    where: {
      organizationId_fixtureNamespace_fixtureKey: {
        organizationId: ORGANIZATION_ID,
        fixtureNamespace: NAMESPACE,
        fixtureKey: FILE_KEYS[index],
      },
    },
    create: {
      organizationId: ORGANIZATION_ID,
      fixtureNamespace: NAMESPACE,
      fixtureKey: FILE_KEYS[index],
      entityType: 'ProjectFile',
      entityId: file.id,
      baseline: {
        projectId: PROJECT_ID,
        buildingId: BUILDING_ID,
        version: index + 1,
        sha256: file.sha256,
      },
    },
    update: { state: 'ACTIVE' },
  });
  return file;
}

async function prepare(prisma: PrismaService) {
  const user = await target(prisma);
  const { files, ingestion } = services(prisma);
  const actor = {
    userId: user.id,
    organizationId: ORGANIZATION_ID,
    role: user.role,
  };
  const first = await advanceFile(prisma, files, ingestion, actor, 0);
  const second = await advanceFile(
    prisma,
    files,
    ingestion,
    actor,
    1,
    first.id,
  );
  await ingestion.reconcile(first.id);
  return {
    command: 'prepare',
    mutation: true,
    registered: (await registered(prisma)).length,
    currentVersion: second.version,
  };
}

async function verify(prisma: PrismaService) {
  const user = await target(prisma);
  const { files, retrieval } = services(prisma);
  const actor = {
    userId: user.id,
    organizationId: ORGANIZATION_ID,
    role: user.role,
  };
  const knowledgeActor = {
    type: 'INTERNAL_USER' as const,
    id: user.id,
    organizationId: ORGANIZATION_ID,
    role: user.role,
  };
  const rows = await registered(prisma);
  if (rows.length !== 2 || rows.some((x) => x.state !== 'ACTIVE'))
    throw new Error('DEMO_DOCUMENT_REGISTRY_INCOMPLETE');
  const first = await prisma.projectFile.findUniqueOrThrow({
    where: { id: rows.find((x) => x.fixtureKey === FILE_KEYS[0])!.entityId },
  });
  const second = await prisma.projectFile.findUniqueOrThrow({
    where: { id: rows.find((x) => x.fixtureKey === FILE_KEYS[1])!.entityId },
  });
  if (
    first.version !== 1 ||
    second.version !== 2 ||
    first.lifecycleState !== 'SUPERSEDED' ||
    second.lifecycleState !== 'APPROVED'
  )
    throw new Error('DEMO_DOCUMENT_VERSION_CHAIN_INVALID');
  const downloaded = await files.downloadPrivateFile(
    second.id,
    ORGANIZATION_ID,
    undefined,
    false,
    actor,
  );
  if (
    sha(downloaded.buffer) !== second.sha256 ||
    downloaded.buffer.toString('utf8') !== PAYLOADS[1]
  )
    throw new Error('DEMO_DOCUMENT_INTEGRITY_FAILED');
  const current = await files.resolveCurrentVersion(
    first.id,
    ORGANIZATION_ID,
    new Date(),
    undefined,
    actor,
  );
  if (current.id !== second.id || current.version !== 2)
    throw new Error('DEMO_DOCUMENT_CURRENT_VERSION_INVALID');
  const hits = await retrieval.search(
    knowledgeActor,
    'registre Boréal-2026',
    BUILDING_ID,
  );
  const hit = hits.find((x) => x.projectFileId === second.id);
  if (
    !hit ||
    !hit.citationId ||
    hit.projectFileVersion !== 2 ||
    hit.href !== `/knowledge/sources/${second.id}` ||
    hit.sourceSha256 !== second.sha256
  )
    throw new Error('DEMO_KNOWLEDGE_CITATION_INVALID');
  const ingestionStates = await prisma.projectFileKnowledgeIngestion.findMany({
    where: { projectFileId: { in: [first.id, second.id] } },
    select: { projectFileId: true, status: true },
  });
  if (
    !ingestionStates.some(
      (x) => x.projectFileId === first.id && x.status === 'STALE',
    ) ||
    !ingestionStates.some(
      (x) => x.projectFileId === second.id && x.status === 'READY',
    )
  )
    throw new Error('DEMO_KNOWLEDGE_FRESHNESS_INVALID');
  let crossTenantDenied = false;
  try {
    await retrieval.search(
      {
        type: 'INTERNAL_USER',
        id: user.id,
        organizationId: '00000000-0000-4000-8000-000000000000',
        role: 'ADMIN',
      },
      'registre Boréal-2026',
      BUILDING_ID,
    );
  } catch {
    crossTenantDenied = true;
  }
  if (!crossTenantDenied)
    throw new Error('DEMO_KNOWLEDGE_TENANT_ISOLATION_FAILED');
  return {
    command: 'verify',
    mutation: false,
    ready: true,
    registered: rows.length,
    version: 2,
    integrity: true,
    citation: true,
    freshness: true,
    crossTenantDenied,
  };
}

async function reset(prisma: PrismaService) {
  const user = await target(prisma, true);
  const { files, ingestion } = services(prisma);
  const actor = {
    userId: user.id,
    organizationId: ORGANIZATION_ID,
    role: user.role,
  };
  const rows = await registered(prisma);
  for (const row of rows) {
    const file = await prisma.projectFile.findUnique({
      where: { id: row.entityId },
    });
    if (file?.lifecycleState === 'APPROVED') {
      await files.revokeFile({
        fileId: file.id,
        organizationId: ORGANIZATION_ID,
        actorId: user.id,
        actor,
        reason: 'Réinitialisation documentaire de démonstration',
        requestId: `demo-doc-reset:${file.id}`,
        lockVersion: file.lockVersion,
      });
      await ingestion.reconcile(file.id);
    }
  }
  await prisma.demoFixtureRecord.updateMany({
    where: { organizationId: ORGANIZATION_ID, fixtureNamespace: NAMESPACE },
    data: { state: 'RETIRED' },
  });
  return { command: 'reset', mutation: true, retired: rows.length };
}

async function main() {
  if (process.env.CORO_DEMO_DOCUMENTS_RUN !== 'true')
    throw new Error('DEMO_DOCUMENT_EXECUTION_GUARD');
  const command = process.argv[2] as Command;
  if (!['dry-run', 'prepare', 'verify', 'reset'].includes(command))
    throw new Error('UNKNOWN_DEMO_DOCUMENT_COMMAND');
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const result =
      command === 'dry-run'
        ? await dryRun(prisma)
        : command === 'prepare'
          ? await prepare(prisma)
          : command === 'verify'
            ? await verify(prisma)
            : await reset(prisma);
    process.stdout.write(
      `${JSON.stringify({ schemaVersion: 1, targetFingerprint: sha(ORGANIZATION_ID), namespace: NAMESPACE, ...result })}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module)
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : 'DEMO_DOCUMENT_FAILURE',
    );
    process.exitCode = 1;
  });
