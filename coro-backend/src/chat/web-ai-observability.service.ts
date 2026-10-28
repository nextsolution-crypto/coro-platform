import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WEB_AI_CLASSIFIER_VERSION, type WebAIIntent } from './web-ai-intent.classifier';
import type { PublicAssistantLanguage } from './public-assistant.types';

type EventInput = {
  eventType: string;
  intent: WebAIIntent;
  language: PublicAssistantLanguage;
  result: 'SUCCESS' | 'ABSTENTION' | 'REJECTED' | 'FAILURE';
  correlationId: string;
  sessionId?: string;
  providerMode?: string;
  durationMs?: number;
  sourceCount?: number;
  suggestedLinkCount?: number;
  errorCode?: string;
};

@Injectable()
export class WebAIObservabilityService {
  private readonly logger = new Logger(WebAIObservabilityService.name);
  constructor(private readonly prisma: PrismaService) {}

  async record(input: EventInput): Promise<void> {
    if (process.env.WEB_AI_OBSERVABILITY_ENABLED !== 'true') return;
    try {
      await this.prisma.webAITelemetryEvent.create({
        data: {
          eventKey: randomUUID(),
          sessionPseudonym: this.pseudonym(input.sessionId),
          correlationId: input.correlationId,
          eventType: input.eventType,
          category: input.intent,
          language: input.language === 'fr-CA' ? 'FR_CA' : 'EN_CA',
          result: input.result,
          providerMode: input.providerMode,
          durationMs: input.durationMs,
          sourceCount: input.sourceCount,
          suggestedLinkCount: input.suggestedLinkCount,
          errorCode: input.errorCode,
          classifierVersion: WEB_AI_CLASSIFIER_VERSION,
        },
      });
      if (input.result === 'ABSTENTION') await this.upsertGap(input.intent);
    } catch (error) {
      // Telemetry is deliberately non-blocking and the log contains no visitor input.
      this.logger.warn(`WEB_AI_TELEMETRY_WRITE_FAILED code=${error instanceof Error ? error.name : 'UNKNOWN'}`);
    }
  }

  async dashboard() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const [eventCount, events, byCategory, byResult, commercial, recommendations, sourceCount, sync] = await Promise.all([
      this.prisma.webAITelemetryEvent.count({ where: { createdAt: { gte: since } } }),
      this.prisma.webAITelemetryEvent.findMany({ where: { createdAt: { gte: since } }, select: { durationMs: true, eventType: true, providerMode: true, sessionPseudonym: true }, orderBy: { createdAt: 'desc' }, take: 10_000 }),
      this.prisma.webAITelemetryEvent.groupBy({ by: ['category'], where: { createdAt: { gte: since } }, _count: { _all: true }, orderBy: { _count: { category: 'desc' } } }),
      this.prisma.webAITelemetryEvent.groupBy({ by: ['result'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.webAICommercialRequest.groupBy({ by: ['status'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.webAIImprovementRecommendation.findMany({ orderBy: [{ proposedPriority: 'asc' }, { lastObservedAt: 'desc' }], take: 50 }),
      this.prisma.publicKnowledgeSource.count({ where: { publicationStatus: 'PUBLISHED', authorityStatus: 'APPROVED' } }),
      this.prisma.publicKnowledgeSyncEvent.findFirst({ orderBy: { startedAt: 'desc' } }),
    ]);
    const durations = events.map((event) => event.durationMs).filter((value): value is number => value !== null).sort((a, b) => a - b);
    return {
      periodDays: 30,
      service: { enabled: process.env.WEB_AI_INTELLIGENT_ASSISTANT_ENABLED === 'true', observabilityEnabled: process.env.WEB_AI_OBSERVABILITY_ENABLED === 'true', provider: process.env.WEB_AI_PROVIDER ?? 'documentary', bedrockInvocationEnabled: process.env.WEB_AI_BEDROCK_INVOCATION_ENABLED === 'true' },
      corpus: { sourceCount, lastSync: sync ? { status: sync.status, startedAt: sync.startedAt, completedAt: sync.completedAt } : null },
      totals: { events: eventCount, sessions: new Set(events.map((event) => event.sessionPseudonym).filter(Boolean)).size, sessionSampleLimited: eventCount > events.length },
      byCategory,
      byResult,
      commercial,
      latency: { p50Ms: percentile(durations, 0.5), p95Ms: percentile(durations, 0.95) },
      recommendations,
      unavailableMetrics: ['REAL_GENERATIVE_QUALITY', 'REAL_TOKEN_USAGE', 'REAL_PROVIDER_COST'],
    };
  }

  private pseudonym(sessionId?: string): string | null {
    const key = process.env.WEB_AI_TELEMETRY_PSEUDONYM_KEY;
    if (!sessionId || !key) return null;
    return createHmac('sha256', key).update(sessionId).digest('hex');
  }

  private async upsertGap(intent: WebAIIntent) {
    await this.prisma.webAIImprovementRecommendation.upsert({
      where: { category_findingCode: { category: intent, findingCode: 'INSUFFICIENT_PUBLIC_SOURCE' } },
      create: { category: intent, findingCode: 'INSUFFICIENT_PUBLIC_SOURCE', description: 'La documentation publique approuvée ne permet pas de répondre avec une source suffisante.', sourceStatistic: 'WEB_AI_ABSTENTION', proposedPriority: 'REVIEW' },
      update: { frequencyObserved: { increment: 1 }, lastObservedAt: new Date() },
    });
  }
}

function percentile(values: number[], ratio: number): number | null {
  if (!values.length) return null;
  return values[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)];
}
