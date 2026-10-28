import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PublicKnowledgeSearchService } from '../public-knowledge/public-knowledge-search.service';
import type { PublicKnowledgeAnswerContext } from '../public-knowledge/public-knowledge.types';
import { PublicAssistantConfig } from './public-assistant.config';
import { PublicAssistantNavigationRegistry } from './public-assistant-navigation';
import { PublicAssistantProviderGateway } from './public-assistant-provider.gateway';
import { PublicAssistantSessionService } from './public-assistant-session.service';
import {
  PublicAssistantLanguage,
  PublicAssistantProviderOutput,
  PublicAssistantResponse,
  toAssistantContextSource,
} from './public-assistant.types';
import { PublicAssistantValidator } from './public-assistant-validator';
import { classifyWebAIIntent, commercialPrompt, type WebAIIntent } from './web-ai-intent.classifier';
import { WebAIObservabilityService } from './web-ai-observability.service';

@Injectable()
export class PublicAssistantOrchestratorService {
  private readonly logger = new Logger(PublicAssistantOrchestratorService.name);

  constructor(
    private readonly config: PublicAssistantConfig,
    private readonly search: PublicKnowledgeSearchService,
    private readonly sessions: PublicAssistantSessionService,
    private readonly provider: PublicAssistantProviderGateway,
    private readonly validator: PublicAssistantValidator,
    private readonly navigation: PublicAssistantNavigationRegistry,
    @Optional() private readonly observability?: WebAIObservabilityService,
  ) {}

  async answer(input: {
    message: string;
    language: PublicAssistantLanguage;
    sessionId?: string;
    pagePath?: string;
  }): Promise<PublicAssistantResponse> {
    const startedAt = Date.now();
    const classification = classifyWebAIIntent(input.message);
    this.config.assertProviderConfiguration();
    const requestId = randomUUID();
    const session = this.sessions.open(input.sessionId);
    const pagePath = this.navigation.normalizePagePath(input.pagePath);
    let context: PublicKnowledgeAnswerContext;
    try {
      context = await this.search.answerContext(
        this.contextualQuestion(input.message, session.history),
        input.language,
        this.config.maxSources,
      );
    } catch {
      this.logger.warn(`Public Knowledge unavailable requestId=${requestId}`);
      const response = this.degraded(requestId, session.id, input.language, classification.intent);
      await this.observe(response, classification.intent, startedAt, 0, 'KNOWLEDGE_UNAVAILABLE');
      return response;
    }
    if (
      context.status === 'BLOCKED' ||
      context.status === 'INSUFFICIENT_INFORMATION' ||
      context.status === 'CONFLICTING_SOURCES'
    ) {
      const response = this.abstention(requestId, session.id, input.language, classification.intent);
      this.sessions.append(
        session.id,
        { role: 'user', content: input.message },
        { role: 'assistant', content: response.message },
      );
      await this.observe(response, classification.intent, startedAt, 0);
      return response;
    }
    const sources = context.sources
      .map(toAssistantContextSource)
      .map((source) => ({
        ...source,
        excerpt: source.excerpt.slice(0, this.config.maxContextCharacters),
      }));
    let raw: PublicAssistantProviderOutput;
    let providerMode: 'DOCUMENTARY' | 'SIMULATED' | 'BEDROCK';
    try {
      const generated = await this.provider.generate({
        question: input.message,
        language: input.language,
        history: session.history,
        pagePath,
        sources,
      });
      raw = generated.output;
      providerMode = generated.mode;
    } catch {
      this.logger.warn(`Public provider unavailable requestId=${requestId}`);
      const response = this.degraded(requestId, session.id, input.language, classification.intent);
      await this.observe(response, classification.intent, startedAt, sources.length, 'PROVIDER_UNAVAILABLE');
      return response;
    }
    const validated = this.validator.validate(raw, sources, input.language);
    if (!validated) {
      this.logger.warn(
        `Grounding rejected provider output requestId=${requestId}`,
      );
      const response = this.abstention(requestId, session.id, input.language, classification.intent);
      await this.observe(response, classification.intent, startedAt, sources.length, 'GROUNDING_REJECTED');
      return response;
    }
    const response: PublicAssistantResponse = {
      requestId,
      sessionId: session.id,
      message: validated.message,
      language: input.language,
      status:
        context.status === 'SUPPORTED' ? 'SUPPORTED' : 'PARTIALLY_SUPPORTED',
      citations: validated.citations,
      suggestedLinks: validated.suggestedLinks,
      suggestedQuestions: validated.suggestedQuestions,
      mode: providerMode,
      intent: classification.intent,
      commercialPrompt: commercialPrompt(classification.intent, input.language),
    };
    this.sessions.append(
      session.id,
      { role: 'user', content: input.message },
      { role: 'assistant', content: response.message },
    );
    await this.observe(response, classification.intent, startedAt, sources.length);
    return response;
  }

  private contextualQuestion(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): string {
    const previous = [...history]
      .reverse()
      .find((turn) => turn.role === 'user')?.content;
    return previous ? `${previous}\n${message}`.slice(0, 2_000) : message;
  }

  private abstention(
    requestId: string,
    sessionId: string,
    language: PublicAssistantLanguage,
    intent: WebAIIntent,
  ): PublicAssistantResponse {
    return {
      requestId,
      sessionId,
      message:
        language === 'fr-CA'
          ? "Je ne dispose pas actuellement d'une information officielle suffisante pour confirmer ce point. Je peux toutefois vous orienter vers notre équipe pour obtenir une réponse précise."
          : 'I do not currently have enough official information to confirm this point. I can direct you to our team for a precise answer.',
      language,
      status: 'INSUFFICIENT_INFORMATION',
      citations: [],
      suggestedLinks: this.navigation.links(['contact'], language),
      suggestedQuestions: [],
      mode: this.selectedMode(),
      intent,
      commercialPrompt: commercialPrompt(intent, language),
    };
  }

  private degraded(
    requestId: string,
    sessionId: string,
    language: PublicAssistantLanguage,
    intent: WebAIIntent,
  ): PublicAssistantResponse {
    return {
      requestId,
      sessionId,
      message:
        language === 'fr-CA'
          ? "L'assistant documentaire est temporairement indisponible. Le site CORO demeure accessible."
          : 'The document assistant is temporarily unavailable. The CORO website remains accessible.',
      language,
      status: 'SERVICE_UNAVAILABLE',
      citations: [],
      suggestedLinks: this.navigation.links(['home', 'contact'], language),
      suggestedQuestions: [],
      mode: 'DEGRADED',
      intent,
      commercialPrompt: commercialPrompt(intent, language),
    };
  }

  private observe(response: PublicAssistantResponse, intent: WebAIIntent, startedAt: number, sourceCount: number, errorCode?: string) {
    if (!this.observability) return Promise.resolve();
    return this.observability.record({
      eventType: 'ASSISTANT_RESPONSE',
      intent,
      language: response.language,
      result: response.status === 'SERVICE_UNAVAILABLE' ? 'FAILURE' : response.status === 'INSUFFICIENT_INFORMATION' ? 'ABSTENTION' : errorCode === 'GROUNDING_REJECTED' ? 'REJECTED' : 'SUCCESS',
      correlationId: response.requestId,
      sessionId: response.sessionId,
      providerMode: response.mode,
      durationMs: Date.now() - startedAt,
      sourceCount,
      suggestedLinkCount: response.suggestedLinks.length,
      errorCode,
    });
  }

  private selectedMode(): 'DOCUMENTARY' | 'SIMULATED' | 'BEDROCK' {
    if (this.config.provider === 'documentary') return 'DOCUMENTARY';
    if (this.config.provider === 'bedrock') return 'BEDROCK';
    return 'SIMULATED';
  }
}
