import { Injectable } from '@nestjs/common';
import { BedrockProviderAdapter } from './bedrock-provider.adapter';
import {
  GroundedAnswer,
  KnowledgeGroundingService,
} from './knowledge-grounding.service';
import { KnowledgeConfig } from './knowledge.config';
import { KnowledgeSearchHit } from './knowledge.types';

@Injectable()
export class CoroAiProviderGateway {
  constructor(
    private readonly config: KnowledgeConfig,
    private readonly deterministic: KnowledgeGroundingService,
    private readonly bedrock: BedrockProviderAdapter,
  ) {}

  providerName() {
    return this.config.aiProvider === 'bedrock'
      ? ('AWS_BEDROCK_CA_CENTRAL_1' as const)
      : ('DETERMINISTIC_SIMULATED' as const);
  }

  async answer(question: string, hits: KnowledgeSearchHit[]) {
    if (this.deterministic.suspicious(question))
      return {
        provider: 'SECURITY_POLICY' as const,
        grounded: this.deterministic.answer(question, hits),
      };
    if (this.config.aiProvider === 'bedrock')
      return {
        provider: this.providerName(),
        grounded: await this.bedrock.answer(question, hits),
      };
    return {
      provider: 'DETERMINISTIC_SIMULATED' as const,
      grounded: this.deterministic.answer(question, hits),
    };
  }
}
