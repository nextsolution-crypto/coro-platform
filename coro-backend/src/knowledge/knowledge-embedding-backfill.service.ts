import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeConfig } from './knowledge.config';
import { SemanticEmbeddingService } from './semantic-embedding.service';

/**
 * Rattrapage des vecteurs CORO Knowledge.
 *
 * Quand Titan est actif, les extraits indexés avant (projection locale)
 * reçoivent leur vecteur sémantique par petits lots, sans réindexer les
 * documents ni toucher aux citations. Si Titan échoue, l'extrait garde son
 * ancien vecteur et sera repris à une passe suivante.
 */
@Injectable()
export class KnowledgeEmbeddingBackfillService {
  private readonly logger = new Logger(KnowledgeEmbeddingBackfillService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: KnowledgeConfig,
    private readonly semantic: SemanticEmbeddingService,
  ) {}

  @Interval(60_000)
  async tick() {
    if (this.running || !this.semantic.semanticAvailable()) return;
    if (this.config.embeddingBackfillBatch === 0) return;
    this.running = true;
    try {
      await this.runBatch(this.config.embeddingBackfillBatch);
    } catch (error) {
      this.logger.warn(
        `Rattrapage des vecteurs interrompu : ${(error as Error)?.name ?? 'ERROR'}`,
      );
    } finally {
      this.running = false;
    }
  }

  /** Une passe ; retourne le nombre d'extraits convertis. */
  async runBatch(batch: number) {
    const chunks = await this.prisma.projectFileKnowledgeChunk.findMany({
      where: {
        OR: [
          { embeddingModel: null },
          { embeddingModel: { not: this.semantic.targetModel } },
        ],
        ingestion: { status: 'READY' },
      } as any,
      select: { id: true, text: true, embeddingModel: true } as any,
      orderBy: { createdAt: 'desc' },
      take: batch,
    }) as unknown as Array<{
      id: string;
      text: string;
      embeddingModel: string | null;
    }>;
    let converted = 0;
    for (const chunk of chunks) {
      if (!this.semantic.semanticAvailable()) break;
      const result = await this.semantic.embedDocument(chunk.text);
      if (result.model !== this.semantic.targetModel) continue;
      // Écriture conditionnelle : un extrait réindexé entre-temps n'est
      // pas écrasé.
      const updated = await this.prisma.projectFileKnowledgeChunk.updateMany({
        where: { id: chunk.id, embeddingModel: chunk.embeddingModel } as any,
        data: { embedding: result.vector, embeddingModel: result.model } as any,
      });
      converted += updated.count;
    }
    if (converted)
      this.logger.log(`Vecteurs sémantiques ajoutés à ${converted} extrait(s).`);
    return converted;
  }

  /** Avancement, pour la vérification d'exploitation. */
  async progress() {
    const [total, titan] = await Promise.all([
      this.prisma.projectFileKnowledgeChunk.count({
        where: { ingestion: { status: 'READY' } },
      }),
      this.prisma.projectFileKnowledgeChunk.count({
        where: {
          ingestion: { status: 'READY' },
          embeddingModel: this.semantic.targetModel,
        } as any,
      }),
    ]);
    return { total, titan, remaining: total - titan };
  }
}
