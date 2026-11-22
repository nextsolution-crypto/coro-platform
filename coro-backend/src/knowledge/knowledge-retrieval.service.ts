import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DeterministicEmbeddingService } from './deterministic-embedding.service';
import { KnowledgeAuthorizationService } from './knowledge-authorization.service';
import { KnowledgeConfig } from './knowledge.config';
import { KnowledgeActor, KnowledgeSearchHit } from './knowledge.types';
import { LibraryKnowledgeRetrievalService } from './library-knowledge-retrieval.service';

/** Extraits évalués au plus par question. */
const CANDIDATE_LIMIT = 500;

@Injectable()
export class KnowledgeRetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: KnowledgeAuthorizationService,
    private readonly embeddings: DeterministicEmbeddingService,
    private readonly config: KnowledgeConfig,
    private readonly library: LibraryKnowledgeRetrievalService,
  ) {}

  async search(
    actor: KnowledgeActor,
    question: string,
    buildingId?: string,
    limit = 8,
    projectId?: string,
  ): Promise<KnowledgeSearchHit[]> {
    const normalized = question.trim();
    if (normalized.length < 3 || normalized.length > 2000)
      throw new BadRequestException('Question invalide.');
    const scope = await this.authorization.scope(actor);
    if (
      buildingId &&
      scope.buildingIds &&
      !scope.buildingIds.includes(buildingId)
    )
      return [];
    const now = new Date();
    // Audit M9-02 : classement plein texte PostgreSQL (français, racines de
    // mots) AVANT la limite de 500 extraits, au lieu des 500 premiers au
    // hasard. Sans aucune correspondance lexicale, repli sur les extraits
    // les plus récents.
    const ranked = await this.rankedCandidates(scope.organizationId, normalized);
    const candidateIds = ranked.map((row) => row.id);
    const topRank = ranked[0]?.rank || 1;
    const fullTextScore = new Map(ranked.map((row) => [row.id, row.rank / topRank]));
    const chunks = await this.prisma.projectFileKnowledgeChunk.findMany({
      where: {
        organizationId: scope.organizationId,
        ...(candidateIds.length > 0 ? { id: { in: candidateIds } } : {}),
        ingestion: {
          status: 'READY',
          ...(buildingId ? { buildingId } : {}),
          ...(!buildingId && scope.buildingIds !== undefined
            ? { buildingId: { in: scope.buildingIds } }
            : {}),
          projectFile: {
            ...this.authorization.where(scope),
            lifecycleState: 'APPROVED',
            sha256: { not: null },
            OR: [{ effectiveAt: null }, { effectiveAt: { lte: now } }],
            AND: [
              ...((this.authorization.where(scope).AND as any[]) ?? []),
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
            projectFile: {
              select: { id: true, version: true, name: true, sha256: true },
            },
          },
        },
        citations: { take: 1 },
      },
      ...(candidateIds.length > 0 ? {} : { orderBy: { createdAt: 'desc' as const } }),
      take: CANDIDATE_LIMIT,
    });
    const queryTerms = this.terms(normalized);
    const queryVector = this.embeddings.embed(normalized);
    const projectFileHits: KnowledgeSearchHit[] = chunks
      .map((chunk) => {
        const documentVector = this.embeddings.embed(chunk.text);
        const semantic = documentVector.reduce(
          (sum, value, index) => sum + value * queryVector[index],
          0,
        );
        const terms = this.terms(chunk.text);
        const lexical = queryTerms.size
          ? [...queryTerms].filter((term) => terms.has(term)).length /
            queryTerms.size
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
              // Plein texte (racines françaises) + mots exacts + signal vectoriel.
              score:
                (fullTextScore.get(chunk.id) ?? 0) * 0.45 +
                lexical * 0.4 +
                Math.max(0, semantic) * 0.15,
              sourceType: 'PROJECT_FILE' as const,
              sourceReference: `project-file-citation:${citation.id}`,
              sourceVersion: String(chunk.ingestion.projectFile.version),
              sourceFingerprint: chunk.ingestion.projectFile.sha256!,
              sourceScope: 'PROJECT' as const,
              href: `/knowledge/sources/${chunk.ingestion.projectFile.id}`,
              sourceSha256: chunk.ingestion.projectFile.sha256!,
            }
          : null;
      })
      .filter((hit): hit is NonNullable<typeof hit> =>
        Boolean(hit && hit.score > 0),
      )
      .sort(
        (left, right) =>
          right.score - left.score || left.chunkId.localeCompare(right.chunkId),
      );
    const libraryHits = await this.library.search(actor, normalized, projectId);
    return [...projectFileHits, ...libraryHits]
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.citationId.localeCompare(right.citationId),
      )
      .slice(0, Math.min(limit, this.config.maxResults));
  }

  /**
   * Extraits classés par pertinence plein texte (colonne générée
   * searchVector, index GIN, configuration « french » :
   * pluriels et conjugaisons ramenés à leur racine). Les mots de la question
   * sont combinés en OU pour ne pas exiger qu'ils soient tous présents.
   */
  private async rankedCandidates(
    organizationId: string,
    question: string,
  ): Promise<Array<{ id: string; rank: number }>> {
    const words = [...this.terms(question)]
      .map((word) => word.replace(/[^0-9a-zàâäçéèêëîïôöùûüÿœæ-]/gi, ''))
      .filter((word) => word.length >= 2)
      .slice(0, 20);
    if (words.length === 0) return [];
    const query = words.join(' | ');
    try {
      const rows = await this.prisma.$queryRaw<Array<{ id: string; rank: number }>>`
        SELECT "id", ts_rank("searchVector", to_tsquery('french', ${query}))::float8 AS "rank"
        FROM "ProjectFileKnowledgeChunk"
        WHERE "organizationId" = ${organizationId}
          AND "searchVector" @@ to_tsquery('french', ${query})
        ORDER BY "rank" DESC, "id"
        LIMIT ${CANDIDATE_LIMIT}`;
      return rows.map((row) => ({ id: row.id, rank: Number(row.rank) || 0 }));
    } catch {
      return [];
    }
  }

  questionFingerprint(question: string) {
    return createHash('sha256').update(question.trim()).digest('hex');
  }

  private terms(text: string) {
    const stopWords = new Set([
      'au',
      'aux',
      'ce',
      'ces',
      'dans',
      'de',
      'des',
      'du',
      'elle',
      'en',
      'est',
      'et',
      'il',
      'la',
      'le',
      'les',
      'ou',
      'pour',
      'quel',
      'quelle',
      'se',
      'un',
      'une',
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
