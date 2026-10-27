import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { DeterministicEmbeddingService } from '../knowledge/deterministic-embedding.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicKnowledgeConfig } from './public-knowledge.config';
import { PublicKnowledgeSecurity } from './public-knowledge-security';
import {
  PUBLIC_KNOWLEDGE_CORPUS_VERSION,
  PUBLIC_KNOWLEDGE_ENGINE_VERSION,
  PublicKnowledgeSeed,
  toDbLanguage,
} from './public-knowledge.types';

export interface PublicKnowledgeSyncResult {
  correlationId: string;
  sourceCount: number;
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  withdrawnCount: number;
  rejectedCount: number;
}

@Injectable()
export class PublicKnowledgeIngestionService {
  private readonly logger = new Logger(PublicKnowledgeIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: DeterministicEmbeddingService,
    private readonly security: PublicKnowledgeSecurity,
    private readonly config: PublicKnowledgeConfig,
  ) {}

  async synchronize(
    entries: PublicKnowledgeSeed[],
    options: { reconcile?: boolean; correlationId?: string } = {},
  ): Promise<PublicKnowledgeSyncResult> {
    const correlationId = options.correlationId ?? randomUUID();
    const result: PublicKnowledgeSyncResult = {
      correlationId,
      sourceCount: entries.length,
      createdCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      withdrawnCount: 0,
      rejectedCount: 0,
    };
    await this.prisma.publicKnowledgeSyncEvent.create({
      data: {
        correlationId,
        engineVersion: PUBLIC_KNOWLEDGE_ENGINE_VERSION,
        corpusVersion: PUBLIC_KNOWLEDGE_CORPUS_VERSION,
        status: 'PROCESSING',
        sourceCount: entries.length,
      },
    });
    try {
      const normalized = entries.map((entry) => this.validateEntry(entry));
      this.assertUniqueEntries(normalized);
      for (const entry of normalized) await this.synchronizeOne(entry, result);
      if (options.reconcile) {
        const keys = [...new Set(normalized.map((entry) => entry.sourceKey))];
        const withdrawal = await this.prisma.publicKnowledgeSource.updateMany({
          where: {
            sourceKey: { notIn: keys },
            publicationStatus: 'PUBLISHED',
          },
          data: { publicationStatus: 'UNPUBLISHED', indexedAt: null },
        });
        result.withdrawnCount = withdrawal.count;
      }
      await this.prisma.publicKnowledgeSyncEvent.update({
        where: { correlationId },
        data: {
          status: 'SUCCEEDED',
          sourceCount: result.sourceCount,
          createdCount: result.createdCount,
          updatedCount: result.updatedCount,
          unchangedCount: result.unchangedCount,
          withdrawnCount: result.withdrawnCount,
          rejectedCount: result.rejectedCount,
          completedAt: new Date(),
        },
      });
      this.logger.log(
        `Public knowledge sync completed correlation=${correlationId} sources=${entries.length} changed=${result.createdCount + result.updatedCount}`,
      );
      return result;
    } catch (error) {
      await this.prisma.publicKnowledgeSyncEvent.update({
        where: { correlationId },
        data: {
          status: 'FAILED',
          rejectedCount: result.rejectedCount + 1,
          errorCode: this.errorCode(error),
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  async revoke(sourceKey: string, language: 'fr-CA' | 'en-CA') {
    return this.prisma.publicKnowledgeSource.update({
      where: {
        sourceKey_language: { sourceKey, language: toDbLanguage(language) },
      },
      data: {
        authorityStatus: 'REVOKED',
        revokedAt: new Date(),
        indexedAt: null,
      },
    });
  }

  private async synchronizeOne(
    entry: PublicKnowledgeSeed,
    result: PublicKnowledgeSyncResult,
  ) {
    const language = toDbLanguage(entry.language);
    const contentHash = this.hash(entry.content);
    const existing = await this.prisma.publicKnowledgeSource.findUnique({
      where: {
        sourceKey_language: { sourceKey: entry.sourceKey, language },
      },
    });
    if (existing?.contentHash === contentHash) {
      await this.prisma.publicKnowledgeSource.update({
        where: { id: existing.id },
        data: {
          canonicalUrl: entry.canonicalUrl,
          title: entry.title,
          sourceType: entry.sourceType,
          authorityRank: entry.authorityRank,
          publicationStatus: 'PUBLISHED',
          authorityStatus: 'APPROVED',
          expiresAt: entry.expiresAt,
          lastSeenAt: new Date(),
          revokedAt: null,
        },
      });
      await this.upsertCapability(existing.id, entry);
      result.unchangedCount += 1;
      return;
    }
    const chunks = this.chunks(entry.content);
    await this.prisma.$transaction(async (tx) => {
      const source = existing
        ? await tx.publicKnowledgeSource.update({
            where: { id: existing.id },
            data: {
              sourceType: entry.sourceType,
              canonicalUrl: entry.canonicalUrl,
              title: entry.title,
              authorityRank: entry.authorityRank,
              version: { increment: 1 },
              contentHash,
              content: entry.content,
              publicationStatus: 'PUBLISHED',
              authorityStatus: 'APPROVED',
              publishedAt: entry.publishedAt,
              sourceUpdatedAt: entry.sourceUpdatedAt,
              indexedAt: new Date(),
              expiresAt: entry.expiresAt,
              revokedAt: null,
              lastSeenAt: new Date(),
            },
          })
        : await tx.publicKnowledgeSource.create({
            data: {
              sourceKey: entry.sourceKey,
              sourceType: entry.sourceType,
              canonicalUrl: entry.canonicalUrl,
              title: entry.title,
              language,
              authorityRank: entry.authorityRank,
              contentHash,
              content: entry.content,
              publicationStatus: 'PUBLISHED',
              authorityStatus: 'APPROVED',
              publishedAt: entry.publishedAt,
              sourceUpdatedAt: entry.sourceUpdatedAt,
              indexedAt: new Date(),
              expiresAt: entry.expiresAt,
            },
          });
      await tx.publicKnowledgeChunk.deleteMany({
        where: { sourceId: source.id },
      });
      for (const [ordinal, text] of chunks.entries()) {
        await tx.publicKnowledgeChunk.create({
          data: {
            sourceId: source.id,
            ordinal,
            text,
            contentHash: this.hash(text),
            tokenCountApprox: Math.ceil(text.length / 4),
            characterCount: text.length,
            embedding: this.embeddings.validate(this.embeddings.embed(text)),
            containsPromptInjection: this.security.suspicious(text),
          },
        });
      }
      await this.upsertCapability(source.id, entry, tx);
    });
    if (existing) result.updatedCount += 1;
    else result.createdCount += 1;
  }

  private async upsertCapability(
    sourceId: string,
    entry: PublicKnowledgeSeed,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (!entry.capability) return;
    const language = toDbLanguage(entry.language);
    await client.publicKnowledgeCapability.upsert({
      where: {
        capabilityKey_language: {
          capabilityKey: entry.capability.capabilityKey,
          language,
        },
      },
      create: {
        sourceId,
        capabilityKey: entry.capability.capabilityKey,
        language,
        name: entry.capability.name,
        description: entry.capability.description,
        status: entry.capability.status,
        canonicalUrl: entry.canonicalUrl,
        approvedBy: entry.capability.approvedBy,
        approvedAt: entry.capability.approvedAt,
      },
      update: {
        sourceId,
        name: entry.capability.name,
        description: entry.capability.description,
        status: entry.capability.status,
        canonicalUrl: entry.canonicalUrl,
        approvedBy: entry.capability.approvedBy,
        approvedAt: entry.capability.approvedAt,
      },
    });
  }

  private validateEntry(entry: PublicKnowledgeSeed): PublicKnowledgeSeed {
    if (!entry.sourceKey.match(/^[A-Za-z0-9][A-Za-z0-9-]{2,79}$/))
      throw new Error('PUBLIC_KNOWLEDGE_SOURCE_KEY_INVALID');
    const content = this.security.normalizeText(entry.content);
    if (content.length < 40 || content.length > 100_000)
      throw new Error('PUBLIC_KNOWLEDGE_CONTENT_INVALID');
    const canonicalUrl = this.security.assertCanonicalPublicUrl(
      entry.canonicalUrl,
    );
    if (
      (entry.language === 'en-CA') !==
      (new URL(canonicalUrl).searchParams.get('lang') === 'en')
    )
      throw new Error('PUBLIC_KNOWLEDGE_LANGUAGE_URL_MISMATCH');
    return {
      ...entry,
      canonicalUrl,
      content,
      title: this.security.normalizeText(entry.title),
    };
  }

  private assertUniqueEntries(entries: PublicKnowledgeSeed[]) {
    const keys = new Set<string>();
    for (const entry of entries) {
      const key = `${entry.sourceKey}:${entry.language}`;
      if (keys.has(key)) throw new Error('PUBLIC_KNOWLEDGE_DUPLICATE_SOURCE');
      keys.add(key);
    }
  }

  private chunks(content: string): string[] {
    const paragraphs = content.split(/\n{2,}|(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let current = '';
    for (const paragraph of paragraphs) {
      if (
        current &&
        current.length + paragraph.length + 1 > this.config.chunkCharacters
      ) {
        chunks.push(current.trim());
        current = '';
      }
      current = `${current} ${paragraph}`.trim();
    }
    if (current) chunks.push(current);
    return chunks;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private errorCode(error: unknown): string {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    return message.startsWith('PUBLIC_KNOWLEDGE_') ? message : 'INTERNAL_ERROR';
  }
}
