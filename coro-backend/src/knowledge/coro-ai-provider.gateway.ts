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
    const usableHits = hits.filter(
      (hit) => !this.deterministic.suspicious(hit.text) && hit.score >= 0.25,
    );
    if (this.config.aiProvider === 'bedrock' && usableHits.length) {
      const admittedHits = this.deterministic.admissibleHits(question, usableHits);
      const admission = this.deterministic.answer(question, admittedHits);
      if (admission.missingInformation.length || admission.conflicts.length)
        return { provider: 'DOCUMENTARY_POLICY' as const, grounded: admission };
      return {
        provider: this.providerName(),
        grounded: await this.bedrock.answer(question, admittedHits),
      };
    }
    return {
      provider: 'DETERMINISTIC_SIMULATED' as const,
      grounded: this.deterministic.answer(question, hits),
    };
  }
}
