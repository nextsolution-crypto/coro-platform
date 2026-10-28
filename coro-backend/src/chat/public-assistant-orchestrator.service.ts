import { Injectable, Logger } from '@nestjs/common';
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
  ) {}

  async answer(input: {
    message: string;
    language: PublicAssistantLanguage;
    sessionId?: string;
    pagePath?: string;
  }): Promise<PublicAssistantResponse> {
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
      return this.degraded(requestId, session.id, input.language);
    }
    if (
      context.status === 'BLOCKED' ||
      context.status === 'INSUFFICIENT_INFORMATION' ||
      context.status === 'CONFLICTING_SOURCES'
    ) {
      const response = this.abstention(requestId, session.id, input.language);
      this.sessions.append(
        session.id,
        { role: 'user', content: input.message },
        { role: 'assistant', content: response.message },
      );
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
      return this.degraded(requestId, session.id, input.language);
    }
    const validated = this.validator.validate(raw, sources, input.language);
    if (!validated) {
      this.logger.warn(
        `Grounding rejected provider output requestId=${requestId}`,
      );
      return this.abstention(requestId, session.id, input.language);
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
    };
    this.sessions.append(
      session.id,
      { role: 'user', content: input.message },
      { role: 'assistant', content: response.message },
    );
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
    };
  }

  private degraded(
    requestId: string,
    sessionId: string,
    language: PublicAssistantLanguage,
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
    };
  }

  private selectedMode(): 'DOCUMENTARY' | 'SIMULATED' | 'BEDROCK' {
    if (this.config.provider === 'documentary') return 'DOCUMENTARY';
    if (this.config.provider === 'bedrock') return 'BEDROCK';
    return 'SIMULATED';
  }
}
