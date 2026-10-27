import { Injectable } from '@nestjs/common';

@Injectable()
export class PublicAssistantConfig {
  readonly enabled =
    process.env.WEB_AI_INTELLIGENT_ASSISTANT_ENABLED === 'true';
  readonly provider = process.env.WEB_AI_PROVIDER ?? 'simulated';
  readonly maxSources = 4;
  readonly maxContextCharacters = 4_800;
  readonly maxHistoryTurns = 8;
  readonly maxSessionCharacters = 16_000;
  readonly sessionTtlMs = 30 * 60_000;

  assertSafeProvider(): void {
    if (this.provider !== 'simulated')
      throw new Error('WEB_AI_REAL_PROVIDER_NOT_AUTHORIZED');
  }
}
