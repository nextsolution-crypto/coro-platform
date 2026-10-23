import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { ProjectFilesService } from '../project-files/project-files.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeterministicEmbeddingService } from './deterministic-embedding.service';
import { KnowledgeAuthorizationService } from './knowledge-authorization.service';
import { KnowledgeChunkerService } from './knowledge-chunker.service';
import { KnowledgeConfig } from './knowledge.config';
import { KnowledgeExtractorService } from './knowledge-extractor.service';
import { KnowledgeActor } from './knowledge.types';

@Injectable()
export class KnowledgeIngestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: ProjectFilesService,
    private readonly authorization: KnowledgeAuthorizationService,
    private readonly extractor: KnowledgeExtractorService,
    private readonly chunker: KnowledgeChunkerService,
    private readonly embeddings: DeterministicEmbeddingService,
    private readonly config: KnowledgeConfig,
  ) {}

  async index(actor: KnowledgeActor, projectFileId: string) {
    return this.indexCanonical(projectFileId, actor);
  }

  async indexCanonical(projectFileId: string, actor?: KnowledgeActor) {
    const now = new Date();
    const file = await this.prisma.projectFile.findFirst({
      where: {
        id: projectFileId,
        ...(actor ? { organizationId: actor.organizationId } : {}),
        lifecycleState: 'APPROVED',
        sha256: { not: null },
        OR: [{ effectiveAt: null }, { effectiveAt: { lte: now } }],
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          {
            OR: [
              { supersededEffectiveAt: null },
              { supersededEffectiveAt: { gt: now } },
            ],
          },
        ],
      },
      include: { project: { select: { buildingId: true } } },
    });
    if (!file) throw new NotFoundException('Version ProjectFile non admissible.');
    if (actor) await this.authorization.assertInternalProject(actor, file.projectId);
    const idempotencyKey = createHash('sha256')
      .update(`${file.id}:${file.sha256}:${this.config.pipelineVersion}`)
      .digest('hex');
    const existing = await this.prisma.projectFileKnowledgeIngestion.findUnique({
      where: { idempotencyKey },
      include: { chunks: true },
    });
    if (existing?.status === 'READY') return existing;
    if (existing?.status === 'PROCESSING')
      throw new ConflictException('Indexation deja en cours.');

    const ingestion = existing
      ? await this.prisma.projectFileKnowledgeIngestion.update({
          where: { id: existing.id },
          data: {
            status: 'PROCESSING',
            attemptCount: { increment: 1 },
            lastErrorCode: null,
          },
        })
      : await this.prisma.projectFileKnowledgeIngestion.create({
          data: {
            organizationId: file.organizationId,
            projectFileId: file.id,
            projectId: file.projectId,
            buildingId: file.project.buildingId,
            sourceVersion: file.version,
            sourceSha256: file.sha256!,
            sourceLifecycle: file.lifecycleState!,
            sourceEffectiveAt: file.effectiveAt,
            sourceExpiresAt: file.expiresAt,
            sourceVisibility: file.visibility,
            status: 'PROCESSING',
            extractorName: file.mimeType === 'application/pdf' ? 'pdfjs-dist' : 'utf8',
            extractorVersion: file.mimeType === 'application/pdf' ? '6.3.289' : '1',
            pipelineVersion: this.config.pipelineVersion,
            idempotencyKey,
            attemptCount: 1,
          },
        });
    try {
      const downloaded = await this.files.downloadPrivateFile(
        file.id,
        file.organizationId,
      );
      const digest = createHash('sha256').update(downloaded.buffer).digest('hex');
      if (digest !== file.sha256) throw new Error('SOURCE_INTEGRITY_MISMATCH');
      const pages = await this.extractor.extract(downloaded.buffer, file.mimeType);
      const chunks = this.chunker.chunks(pages);
      if (!chunks.length) throw new Error('NO_EXTRACTABLE_CONTENT');
      const rootId = file.parentId ?? file.id;
      const chain = await this.prisma.projectFile.findMany({
        where: {
          organizationId: file.organizationId,
          OR: [{ id: rootId }, { parentId: rootId }],
        },
        select: { id: true },
      });
      await this.prisma.$transaction(async (tx) => {
        await tx.projectFileKnowledgeIngestion.updateMany({
          where: {
            projectFileId: { in: chain.map((item) => item.id) },
            id: { not: ingestion.id },
            status: { in: ['READY', 'QUEUED', 'FAILED'] },
          },
          data: { status: 'STALE', staleAt: now },
        });
        await tx.projectFileKnowledgeChunk.deleteMany({
          where: { ingestionId: ingestion.id },
        });
        for (const chunk of chunks) {
          const citationId = randomUUID();
          const embedding = this.embeddings.validate(
            this.embeddings.embed(chunk.text),
          );
          await tx.projectFileKnowledgeChunk.create({
            data: {
              ...chunk,
              embedding,
              organizationId: file.organizationId,
              ingestionId: ingestion.id,
              citations: {
                create: {
                  id: citationId,
                  organizationId: file.organizationId,
                  projectFileId: file.id,
                  ingestionId: ingestion.id,
                  sourceSha256: file.sha256!,
                  pageStart: chunk.pageStart,
                  pageEnd: chunk.pageEnd,
                  sectionPath: chunk.sectionPath,
                  contentHash: chunk.contentHash,
                },
              },
            },
          });
        }
        await tx.projectFileKnowledgeIngestion.update({
          where: { id: ingestion.id },
          data: { status: 'READY', indexedAt: now, lastErrorCode: null },
        });
      });
      return this.prisma.projectFileKnowledgeIngestion.findUnique({
        where: { id: ingestion.id },
        include: { chunks: { orderBy: { ordinal: 'asc' } } },
      });
    } catch (error) {
      const code = error instanceof Error ? error.message.slice(0, 120) : 'UNKNOWN';
      await this.prisma.projectFileKnowledgeIngestion.update({
        where: { id: ingestion.id },
        data: { status: 'FAILED', lastErrorCode: code },
      });
      throw error;
    }
  }

  async reconcile(projectFileId: string) {
    const file = await this.prisma.projectFile.findUnique({
      where: { id: projectFileId },
      select: {
        lifecycleState: true,
        effectiveAt: true,
        expiresAt: true,
        supersededEffectiveAt: true,
      },
    });
    if (!file) return;
    const now = new Date();
    const eligible =
      file.lifecycleState === 'APPROVED' &&
      (!file.effectiveAt || file.effectiveAt <= now) &&
      (!file.expiresAt || file.expiresAt > now) &&
      (!file.supersededEffectiveAt || file.supersededEffectiveAt > now);
    if (eligible) return;
    await this.prisma.projectFileKnowledgeIngestion.updateMany({
      where: { projectFileId, status: 'READY' },
      data: {
        status: file.lifecycleState === 'REVOKED' ? 'REVOKED' : 'STALE',
        staleAt: now,
      },
    });
  }
}
