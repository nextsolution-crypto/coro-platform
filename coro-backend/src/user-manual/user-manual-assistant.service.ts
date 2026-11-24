import { Injectable, Logger } from '@nestjs/common';
import { emergencyReply, isLiveEmergency } from '../common/emergency-guard';
import { BedrockProviderAdapter } from '../knowledge/bedrock-provider.adapter';
import { KnowledgeConfig } from '../knowledge/knowledge.config';
import { KnowledgeGroundingService } from '../knowledge/knowledge-grounding.service';
import { KnowledgeSearchHit } from '../knowledge/knowledge.types';
import { ManualAudience } from './user-manual.catalog';
import { UserManualService } from './user-manual.service';

type ManualArticleView = ReturnType<UserManualService['list']>['articles'][number];

/** Texte d'un article tel que CORO AI le lit (aucun chemin de code source). */
export function manualArticleText(a: ManualArticleView): string {
  return [
    `${a.title} (${a.category})`,
    `Résumé : ${a.summary}`,
    `Prérequis : ${a.prerequisites.join(' ')}`,
    'Étapes :',
    ...a.steps.map((step, index) => `${index + 1}. ${step}`),
    `Résultat attendu : ${a.expectedResult}`,
    `Limites : ${a.limits.join(' ')}`,
  ].join('\n');
}

/**
 * CORO AI sur le manuel d'utilisation. Les seules sources sont les articles
 * versionnés du manuel visibles pour l'audience : aucune donnée client.
 * Sans fournisseur IA actif (ou en cas d'échec), la recherche par mots-clés
 * du manuel répond seule.
 */
@Injectable()
export class UserManualAssistantService {
  private readonly logger = new Logger(UserManualAssistantService.name);

  constructor(
    private readonly manual: UserManualService,
    private readonly config: KnowledgeConfig,
    private readonly grounding: KnowledgeGroundingService,
    private readonly bedrock: BedrockProviderAdapter,
  ) {}

  async ask(audience: ManualAudience, question: unknown) {
    const keyword = this.manual.ask(audience, question); // valide la question
    const text = (question as string).trim();
    const base = {
      sourceType: 'PRODUCT_MANUAL' as const,
      version: keyword.version,
    };
    if (isLiveEmergency(text))
      return {
        ...base,
        status: 'EMERGENCY' as const,
        provider: 'EMERGENCY_GUARD',
        answer: emergencyReply(),
        uncertainty: null,
        explanation: 'Urgence en cours : appelez le 911.',
        articles: [],
      };
    if (this.grounding.suspicious(text))
      return {
        ...base,
        status: 'BLOCKED' as const,
        provider: 'SECURITY_POLICY',
        answer: null,
        uncertainty:
          'La demande contient des instructions incompatibles avec la politique de sécurité.',
        explanation: keyword.explanation,
        articles: [],
      };
    const ranked = this.manual.retrieve(audience, text, 4);
    if (this.config.aiProvider === 'bedrock' && ranked.length) {
      const hits: KnowledgeSearchHit[] = ranked.map(({ article, score }) => ({
        sourceType: 'PRODUCT_MANUAL',
        sourceReference: `manual:${article.id}`,
        sourceVersion: article.version,
        sourceFingerprint: article.sha256,
        sourceSha256: article.sha256,
        sourceScope: 'GLOBAL',
        href: article.href,
        chunkId: `manual:${article.id}`,
        citationId: `manual:${article.id}`,
        documentName: article.title,
        buildingId: '',
        pageStart: 1,
        pageEnd: 1,
        sectionPath: article.category,
        text: manualArticleText(article),
        score,
      }));
      try {
        const grounded = await this.bedrock.answer(
          `Question sur l'utilisation du logiciel CORO : ${text}`,
          hits,
        );
        const cited = ranked
          .map((r) => r.article)
          .filter((a) => grounded.usedCitationIds.includes(`manual:${a.id}`));
        if (grounded.answer && cited.length)
          return {
            ...base,
            status: 'ANSWERED' as const,
            provider: 'CORO_AI_MANUAL',
            answer: grounded.answer,
            uncertainty: grounded.uncertainty || null,
            explanation: 'Réponse de CORO AI fondée sur les articles du manuel cités.',
            articles: cited,
          };
      } catch (error) {
        this.logger.warn(
          `CORO AI indisponible pour le manuel : ${(error as Error)?.name ?? 'ERROR'}`,
        );
      }
    }
    const articles = keyword.articles.length
      ? keyword.articles
      : ranked.slice(0, 3).map((r) => r.article);
    return {
      ...base,
      status: articles.length
        ? ('GUIDES_FOUND' as const)
        : ('INSUFFICIENT_EVIDENCE' as const),
      provider: 'USER_MANUAL_EXTRACTIVE',
      answer: null,
      uncertainty: null,
      explanation: articles.length
        ? 'Voici les instructions du manuel correspondant à votre demande.'
        : keyword.explanation,
      articles,
    };
  }

  /** Suggestions du manuel pour un autre assistant (aucune IA). */
  suggestions(audience: ManualAudience, question: string) {
    try {
      return this.manual
        .retrieve(audience, question, 3)
        .filter((r) => r.score >= 0.34)
        .map(({ article }) => ({ id: article.id, title: article.title, href: article.href }));
    } catch {
      return [];
    }
  }
}

