import { Injectable } from '@nestjs/common';
import { BedrockWebPublicProvider } from './bedrock-web-public.provider';
import { DocumentaryPublicAssistantProvider } from './documentary-public-assistant.provider';
import { PublicAssistantConfig } from './public-assistant.config';
import type {
  PublicAssistantProviderInput,
  PublicAssistantProviderResult,
} from './public-assistant.types';
import { SimulatedPublicAssistantProvider } from './simulated-public-assistant.provider';

@Injectable()
export class PublicAssistantProviderGateway {
  private requests = 0;
  private concurrent = 0;
  private failures = 0;
  private openUntil = 0;

  constructor(
    private readonly config: PublicAssistantConfig,
    private readonly documentary: DocumentaryPublicAssistantProvider,
    private readonly simulated: SimulatedPublicAssistantProvider,
    private readonly bedrock: BedrockWebPublicProvider,
  ) {}

  async generate(
    input: PublicAssistantProviderInput,
  ): Promise<PublicAssistantProviderResult> {
    this.config.assertProviderConfiguration();
    if (this.config.provider === 'documentary')
      return {
        output: await this.documentary.generate(input),
        mode: 'DOCUMENTARY',
      };
    if (this.config.provider === 'simulated')
      return {
        output: await this.simulated.generate(input),
        mode: 'SIMULATED',
      };
    return this.generateBedrock(input);
  }

  private async generateBedrock(
    input: PublicAssistantProviderInput,
  ): Promise<PublicAssistantProviderResult> {
    if (Date.now() < this.openUntil) throw new Error('WEB_AI_CIRCUIT_OPEN');
    if (this.requests >= this.config.bedrockCampaignLimit)
      throw new Error('WEB_AI_CAMPAIGN_LIMIT_REACHED');
    if (this.concurrent >= this.config.bedrockConcurrency)
      throw new Error('WEB_AI_CONCURRENCY_LIMIT_REACHED');
    this.requests += 1;
    this.concurrent += 1;
    try {
      const output = await this.bedrock.generate(input);
      this.failures = 0;
      return { output, mode: 'BEDROCK' };
    } catch (error) {
      this.failures += 1;
      if (this.failures >= this.config.circuitFailureThreshold) {
        this.openUntil = Date.now() + this.config.circuitCooldownMs;
        this.failures = 0;
      }
      throw error;
    } finally {
      this.concurrent -= 1;
    }
  }
}
