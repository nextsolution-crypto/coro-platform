import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DeterministicEmbeddingService } from './deterministic-embedding.service';
import { KnowledgeAuthorizationService } from './knowledge-authorization.service';
import { KnowledgeConfig } from './knowledge.config';
import { KnowledgeActor, KnowledgeSearchHit } from './knowledge.types';

@Injectable()
export class KnowledgeRetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: KnowledgeAuthorizationService,
    private readonly embeddings: DeterministicEmbeddingService,
    private readonly config: KnowledgeConfig,
  ) {}

  async search(
    actor: KnowledgeActor,
    question: string,
    buildingId?: string,
    limit = 8,
  ): Promise<KnowledgeSearchHit[]> {
    const normalized = question.trim();
    if (normalized.length < 3 || normalized.length > 2000)
      throw new BadRequestException('Question invalide.');
    const scope = await this.authorization.scope(actor);
    if (buildingId && scope.buildingIds && !scope.buildingIds.includes(buildingId))
      return [];
    const now = new Date();
    const chunks = await this.prisma.projectFileKnowledgeChunk.findMany({
      where: {
        organizationId: scope.organizationId,
        ingestion: {
          status: 'READY',
          ...(buildingId ? { buildingId } : {}),
          ...(scope.buildingIds !== undefined
            ? { buildingId: { in: scope.buildingIds } }
            : {}),
          projectFile: {
            ...this.authorization.where(scope),
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
        },
      },
      include: {
        ingestion: {
          include: {
            projectFile: { select: { id: true, version: true, name: true, sha256: true } },
          },
        },
        citations: { take: 1 },
      },
      take: 500,
    });
    const queryTerms = this.terms(normalized);
    const queryVector = this.embeddings.embed(normalized);
    return chunks
      .map((chunk) => {
        const documentVector = this.embeddings.embed(chunk.text);
        const semantic = documentVector.reduce(
          (sum, value, index) => sum + value * queryVector[index],
          0,
        );
        const terms = this.terms(chunk.text);
        const lexical = queryTerms.size
          ? [...queryTerms].filter((term) => terms.has(term)).length / queryTerms.size
          : 0;
        const citation = chunk.citations[0];
        return citation
          ? {
              chunkId: chunk.id,
              citationId: citation.id,
              projectFileId: chunk.ingestion.projectFile.id,
              projectFileVersion: chunk.ingestion.projectFile.version,
              documentName: chunk.ingestion.projectFile.name,
              buildingId: chunk.ingestion.buildingId,
              pageStart: chunk.pageStart,
              pageEnd: chunk.pageEnd,
              sectionPath: chunk.sectionPath,
              text: chunk.text,
              score: lexical * 0.65 + Math.max(0, semantic) * 0.35,
              sourceSha256: chunk.ingestion.projectFile.sha256!,
            }
          : null;
      })
      .filter((hit): hit is KnowledgeSearchHit => Boolean(hit && hit.score > 0))
      .sort((left, right) => right.score - left.score || left.chunkId.localeCompare(right.chunkId))
      .slice(0, Math.min(limit, this.config.maxResults));
  }

  questionFingerprint(question: string) {
    return createHash('sha256').update(question.trim()).digest('hex');
  }

  private terms(text: string) {
    const stopWords = new Set([
      'au', 'aux', 'ce', 'ces', 'dans', 'de', 'des', 'du', 'elle', 'en', 'est',
      'et', 'il', 'la', 'le', 'les', 'ou', 'pour', 'quel', 'quelle', 'se', 'un', 'une',
    ]);
    return new Set(
      text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .match(/[a-z0-9]{2,}/g)
        ?.filter((term) => !stopWords.has(term)) ?? [],
    );
  }
}
