import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeConfig } from './knowledge.config';
import { KnowledgeIngestionService } from './knowledge-ingestion.service';

@Injectable()
export class KnowledgeReconciliationService {
  private readonly logger = new Logger(KnowledgeReconciliationService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestion: KnowledgeIngestionService,
    private readonly config: KnowledgeConfig,
  ) {}

  @Interval(60_000)
  async reconcile() {
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      await this.prisma.projectFileKnowledgeIngestion.updateMany({
        where: { status: 'PROCESSING', updatedAt: { lt: new Date(now.getTime() - Math.max(900_000, this.config.extractionTimeoutMs + 120_000)) } },
        data: { status: 'FAILED', lastErrorCode: 'INTERRUPTED_INGESTION' },
      });
      const invalid = await this.prisma.projectFile.findMany({
        where: {
          knowledgeIngestions: { some: { status: 'READY' } },
          OR: [
            { lifecycleState: { in: ['REVOKED', 'SUPERSEDED'] } },
            { expiresAt: { lte: now } },
            { supersededEffectiveAt: { lte: now } },
          ],
        },
        select: { id: true },
        take: 100,
      });
      for (const file of invalid) await this.ingestion.reconcile(file.id);

      const eligible = await this.prisma.projectFile.findMany({
        where: {
          lifecycleState: 'APPROVED',
          sha256: { not: null },
          url: 'private:project-file',
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
          NOT: { knowledgeIngestions: {
            some: {
              pipelineVersion: this.config.pipelineVersion,
              OR: [ { status: { in: ['READY', 'PROCESSING'] } },
                { status: 'FAILED', attemptCount: { gte: this.config.maxAutoAttempts } },
                { status: 'FAILED', updatedAt: { gt: new Date(now.getTime() - this.config.retryDelayMs) } } ],
            },
          } },
        },
        select: { id: true },
        orderBy: { approvedAt: 'asc' },
        take: 10,
      });
      for (const file of eligible) {
        try {
          await this.ingestion.indexCanonical(file.id);
        } catch (error) {
          this.logger.warn(
            `Indexation ProjectFile echouee (${file.id}): ${error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'EXTRACTION_FAILED'}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }
}
