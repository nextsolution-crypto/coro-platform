import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DeterministicEmbeddingService } from './deterministic-embedding.service';
import { KnowledgeAuthorizationService } from './knowledge-authorization.service';
import { KnowledgeConfig } from './knowledge.config';
import { KnowledgeActor, KnowledgeSearchHit } from './knowledge.types';
import { LibraryKnowledgeRetrievalService } from './library-knowledge-retrieval.service';
import {
  cosine,
  SemanticEmbeddingService,
  TITAN_EMBEDDING_MODEL,
} from './semantic-embedding.service';

/** Extraits évalués au plus par question. */
const CANDIDATE_LIMIT = 500;
/**
 * Quand le plein texte trouve peu d'extraits et que les vecteurs Titan sont
 * actifs, on complète avec des extraits récents pour que la recherche par le
 * sens trouve « évacuation » quand on demande « sortie ».
 */
const SEMANTIC_RECALL_THRESHOLD = 100;
/** Similarité cosinus Titan sous laquelle deux textes sont jugés sans lien. */
const TITAN_SIMILARITY_FLOOR = 0.25;
const TITAN_SIMILARITY_SPAN = 0.55;

export function titanSemanticScore(similarity: number) {
  return Math.min(
    1,
    Math.max(0, (similarity - TITAN_SIMILARITY_FLOOR) / TITAN_SIMILARITY_SPAN),
  );
}

@Injectable()
export class KnowledgeRetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: KnowledgeAuthorizationService,
    private readonly embeddings: DeterministicEmbeddingService,
    private readonly config: KnowledgeConfig,
    private readonly library: LibraryKnowledgeRetrievalService,
    @Optional() private readonly semantic?: SemanticEmbeddingService,
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
    const titanQuery = (await this.semantic?.embedQuery(normalized)) ?? null;
    const candidateIds = ranked.map((row) => row.id);
    if (titanQuery && candidateIds.length > 0 && candidateIds.length < SEMANTIC_RECALL_THRESHOLD)
      candidateIds.push(
        ...(await this.recentSemanticCandidates(
          scope.organizationId,
          [...candidateIds],
          CANDIDATE_LIMIT - candidateIds.length,
        )),
      );
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
        const stored = chunk as typeof chunk & {
          embedding?: number[];
          embeddingModel?: string | null;
        };
        const titan =
          titanQuery &&
          stored.embeddingModel === TITAN_EMBEDDING_MODEL &&
          stored.embedding?.length === titanQuery.length;
        const semantic = titan
          ? titanSemanticScore(cosine(titanQuery, stored.embedding!))
          : this.embeddings
              .embed(chunk.text)
              .reduce((sum, value, index) => sum + value * queryVector[index], 0);
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
              // Plein texte (racines françaises) + mots exacts + sens.
              // Avec Titan, le sens pèse davantage ; sans Titan, la
              // projection locale reste un signal d'appoint.
              score: titan
                ? (fullTextScore.get(chunk.id) ?? 0) * 0.3 +
                  lexical * 0.25 +
                  semantic * 0.45
                : (fullTextScore.get(chunk.id) ?? 0) * 0.45 +
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

  /** Extraits récents hors plein texte, pour le rappel sémantique. */
  private async recentSemanticCandidates(
    organizationId: string,
    exclude: string[],
    take: number,
  ): Promise<string[]> {
    if (take <= 0) return [];
    const rows = await this.prisma.projectFileKnowledgeChunk.findMany({
      where: {
        organizationId,
        embeddingModel: TITAN_EMBEDDING_MODEL,
        id: { notIn: exclude },
      } as any,
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map((row) => row.id);
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
