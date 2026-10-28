import { Injectable } from '@nestjs/common';
import type {
  PublicAssistantProvider,
  PublicAssistantProviderInput,
  PublicAssistantProviderOutput,
} from './public-assistant.types';

@Injectable()
export class DocumentaryPublicAssistantProvider implements PublicAssistantProvider {
  async generate(
    input: PublicAssistantProviderInput,
  ): Promise<PublicAssistantProviderOutput> {
    await Promise.resolve();
    const supportingSourceIds = input.sources.map((source) => source.sourceId);
    const message =
      input.language === 'fr-CA'
        ? `Voici ${supportingSourceIds.length === 1 ? 'la ressource officielle CORO la plus pertinente' : 'les ressources officielles CORO les plus pertinentes'} pour votre question.`
        : `Here ${supportingSourceIds.length === 1 ? 'is the most relevant official CORO resource' : 'are the most relevant official CORO resources'} for your question.`;
    return {
      message,
      supportingSourceIds,
      suggestedRouteKeys: [],
      suggestedQuestions:
        input.language === 'fr-CA'
          ? [
              'Souhaitez-vous explorer une autre capacité CORO ?',
              'Voulez-vous communiquer avec notre équipe ?',
            ]
          : [
              'Would you like to explore another CORO capability?',
              'Would you like to contact our team?',
            ],
    };
  }
}
