import { Injectable } from '@nestjs/common';
import { DeterministicEmbeddingService } from '../knowledge/deterministic-embedding.service';
import { PublicKnowledgeConfig } from './public-knowledge.config';
import { PublicKnowledgeDatabaseService } from './public-knowledge-database.service';
import { PublicKnowledgeSecurity } from './public-knowledge-security';
import {
  fromDbLanguage,
  PublicKnowledgeAnswerContext,
  PublicKnowledgeLanguageDb,
  PublicKnowledgeSearchResult,
  toDbLanguage,
} from './public-knowledge.types';

type SearchableSource = {
  id: string;
  sourceKey: string;
  title: string;
  canonicalUrl: string;
  language: PublicKnowledgeLanguageDb;
  version: number;
  authorityRank: number;
  chunks: Array<{
    id: string;
    text: string;
    embedding: number[];
    containsPromptInjection: boolean;
  }>;
  capabilities: Array<{
    capabilityKey: string;
    status:
      | 'AVAILABLE'
      | 'PILOT'
      | 'IN_DEVELOPMENT'
      | 'PLANNED'
      | 'RETIRED'
      | 'UNKNOWN';
  }>;
};

@Injectable()
export class PublicKnowledgeSearchService {
  constructor(
    private readonly prisma: PublicKnowledgeDatabaseService,
    private readonly embeddings: DeterministicEmbeddingService,
    private readonly security: PublicKnowledgeSecurity,
    private readonly config: PublicKnowledgeConfig,
  ) {}

  async search(
    question: string,
    language: 'fr-CA' | 'en-CA',
    limit = this.config.maxResults,
  ): Promise<PublicKnowledgeSearchResult[]> {
    const normalized = this.security.normalizeText(question);
    if (
      normalized.length < 2 ||
      normalized.length > this.config.maxQuestionLength ||
      this.security.suspicious(normalized)
    )
      return [];
    const now = new Date();
    const sources = (await this.prisma.publicKnowledgeSource.findMany({
      where: {
        language: toDbLanguage(language),
        publicationStatus: 'PUBLISHED',
        authorityStatus: 'APPROVED',
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        chunks: {
          where: { containsPromptInjection: false },
          orderBy: { ordinal: 'asc' },
        },
        capabilities: true,
      },
    })) as SearchableSource[];
    return this.rank(
      normalized,
      sources,
      Math.min(limit, this.config.maxResults),
    );
  }

  async answerContext(
    question: string,
    language: 'fr-CA' | 'en-CA',
    limit = this.config.maxResults,
  ): Promise<PublicKnowledgeAnswerContext> {
    if (this.security.suspicious(question))
      return { question, language, sources: [], status: 'BLOCKED' };
    const sources = await this.search(question, language, limit);
    if (!sources.length)
      return {
        question,
        language,
        sources,
        status: 'INSUFFICIENT_INFORMATION',
      };
    if (this.hasCapabilityConflict(sources))
      return { question, language, sources, status: 'CONFLICTING_SOURCES' };
    return {
      question,
      language,
      sources,
      status:
        sources[0].relevance >= 0.42 ? 'SUPPORTED' : 'PARTIALLY_SUPPORTED',
    };
  }

  rank(
    question: string,
    sources: SearchableSource[],
    limit: number,
  ): PublicKnowledgeSearchResult[] {
    const queryTerms = new Set(this.security.terms(question));
    const queryVector = this.embeddings.embed(question);
    // Pondération par rareté (IDF) : un mot présent partout, comme « CORO »,
    // pèse peu ; un mot distinctif, comme « évacuation », pèse beaucoup.
    const prepared = sources.map((source) => ({
      source,
      titleTerms: new Set(this.security.terms(source.title)),
      chunks: source.chunks.map((chunk) => ({
        chunk,
        terms: new Set(this.security.terms(`${source.title} ${chunk.text}`)),
      })),
    }));
    const total = Math.max(
      1,
      prepared.reduce((sum, item) => sum + item.chunks.length, 0),
    );
    const idf = new Map<string, number>();
    for (const term of queryTerms) {
      let frequency = 0;
      for (const item of prepared)
        for (const entry of item.chunks) if (entry.terms.has(term)) frequency += 1;
      idf.set(term, Math.log(1 + total / (1 + frequency)));
    }
    const queryWeight = [...queryTerms].reduce(
      (sum, term) => sum + (idf.get(term) ?? 0),
      0,
    );
    const weighted = (terms: Set<string>) =>
      queryWeight
        ? [...queryTerms]
            .filter((term) => terms.has(term))
            .reduce((sum, term) => sum + (idf.get(term) ?? 0), 0) / queryWeight
        : 0;
    const ranked = prepared
      .flatMap(({ source, titleTerms, chunks }) => {
        const capability = source.capabilities[0];
        const titleMatch = weighted(titleTerms);
        return chunks.map(({ chunk, terms }) => {
          const lexical = weighted(terms);
          const semantic = Math.max(
            0,
            this.cosine(queryVector, chunk.embedding),
          );
          const authority = Math.max(0, 1 - source.authorityRank / 100);
          const relevance = Math.min(
            1,
            lexical * 0.5 + titleMatch * 0.18 + semantic * 0.22 + authority * 0.1,
          );
          return {
            sourceId: source.id,
            sourceKey: source.sourceKey,
            title: source.title,
            canonicalUrl: source.canonicalUrl,
            language: fromDbLanguage(source.language),
            excerpt: this.excerpt(chunk.text, queryTerms),
            version: source.version,
            relevance: Number(relevance.toFixed(6)),
            authorityRank: source.authorityRank,
            capabilityKey: capability?.capabilityKey,
            capabilityStatus: capability?.status,
            citation: {
              sourceId: source.id,
              sourceKey: source.sourceKey,
              version: source.version,
              canonicalUrl: source.canonicalUrl,
              language: fromDbLanguage(source.language),
              chunkId: chunk.id,
            },
          } satisfies PublicKnowledgeSearchResult;
        });
      })
      .filter((result) => result.relevance >= this.config.searchThreshold)
      .sort(
        (left, right) =>
          right.relevance - left.relevance ||
          left.authorityRank - right.authorityRank ||
          left.sourceKey.localeCompare(right.sourceKey) ||
          left.citation.chunkId.localeCompare(right.citation.chunkId),
      )
      .filter(
        (result, index, all) =>
          all.findIndex(
            (candidate) => candidate.sourceId === result.sourceId,
          ) === index,
      );
    return this.withCapabilityStatus(ranked, limit);
  }

  /**
   * Une page de module retenue entraîne sa fiche « capacité » (même page
   * publiée), qui porte le statut officiel (disponible, planifié…). Sans
   * elle, l'assistant ne pourrait pas affirmer la disponibilité.
   */
  private withCapabilityStatus(
    ranked: PublicKnowledgeSearchResult[],
    limit: number,
  ): PublicKnowledgeSearchResult[] {
    const path = (url: string) => new URL(url).pathname;
    // Seules les pages propres à une capacité (une seule capacité par page).
    const byPath = new Map<string, Set<string>>();
    for (const result of ranked)
      if (result.capabilityKey)
        byPath.set(path(result.canonicalUrl), (byPath.get(path(result.canonicalUrl)) ?? new Set()).add(result.capabilityKey));
    const capabilityByPath = new Map<string, PublicKnowledgeSearchResult>();
    for (const result of ranked) {
      const key = path(result.canonicalUrl);
      if (result.capabilityKey && byPath.get(key)?.size === 1 && !capabilityByPath.has(key))
        capabilityByPath.set(key, result);
    }
    const selected = ranked.slice(0, limit);
    for (const result of [...selected]) {
      if (result.capabilityKey) continue;
      const capability = capabilityByPath.get(path(result.canonicalUrl));
      if (!capability || selected.includes(capability)) continue;
      selected.splice(selected.indexOf(result) + 1, 0, capability);
    }
    return selected.slice(0, limit);
  }

  private hasCapabilityConflict(results: PublicKnowledgeSearchResult[]) {
    const statuses = new Map<string, Set<string>>();
    for (const result of results) {
      if (!result.capabilityKey || !result.capabilityStatus) continue;
      const values = statuses.get(result.capabilityKey) ?? new Set<string>();
      values.add(result.capabilityStatus);
      statuses.set(result.capabilityKey, values);
    }
    return [...statuses.values()].some((values) => values.size > 1);
  }

  private cosine(left: number[], right: number[]): number {
    if (!left.length || left.length !== right.length) return 0;
    return left.reduce((sum, value, index) => sum + value * right[index], 0);
  }

  private excerpt(text: string, queryTerms: Set<string>): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const ranked = sentences
      .map((sentence, index) => ({
        sentence,
        index,
        overlap: this.security
          .terms(sentence)
          .filter((term) => queryTerms.has(term)).length,
      }))
      .sort(
        (left, right) =>
          right.overlap - left.overlap || left.index - right.index,
      );
    return (ranked[0]?.sentence ?? text).slice(0, 600).trim();
  }
}
