import { Injectable } from '@nestjs/common';

export type PublicAssistantProviderName =
  | 'documentary'
  | 'simulated'
  | 'bedrock';

function integer(name: string, fallback: number, min: number, max: number) {
  const value = process.env[name] ? Number(process.env[name]) : fallback;
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${name}_INVALID`);
  return value;
}

@Injectable()
export class PublicAssistantConfig {
  readonly enabled =
    process.env.WEB_AI_INTELLIGENT_ASSISTANT_ENABLED === 'true';
  readonly provider = this.providerName(process.env.WEB_AI_PROVIDER);
  readonly bedrockInvocationEnabled =
    process.env.WEB_AI_BEDROCK_INVOCATION_ENABLED === 'true';
  readonly bedrockRegion = process.env.WEB_AI_BEDROCK_REGION ?? 'ca-central-1';
  readonly bedrockModelId =
    process.env.WEB_AI_BEDROCK_MODEL_ID ?? 'ca.amazon.nova-lite-v1:0';
  readonly awsProfile = process.env.AWS_PROFILE ?? 'coro-ai-production';
  readonly awsConfigFile =
    process.env.AWS_CONFIG_FILE ?? '/etc/coro-ai/aws-config';
  readonly bedrockTimeoutMs = integer(
    'WEB_AI_BEDROCK_TIMEOUT_MS',
    15_000,
    1_000,
    30_000,
  );
  readonly bedrockCampaignLimit = integer(
    'WEB_AI_BEDROCK_CAMPAIGN_REQUEST_LIMIT',
    100,
    1,
    100,
  );
  readonly bedrockConcurrency = integer(
    'WEB_AI_BEDROCK_MAX_CONCURRENCY',
    2,
    1,
    4,
  );
  readonly circuitFailureThreshold = integer(
    'WEB_AI_BEDROCK_CIRCUIT_FAILURE_THRESHOLD',
    3,
    1,
    10,
  );
  readonly circuitCooldownMs = integer(
    'WEB_AI_BEDROCK_CIRCUIT_COOLDOWN_MS',
    60_000,
    10_000,
    3_600_000,
  );
  readonly maxSources = 4;
  readonly maxContextCharacters = 4_800;
  readonly maxHistoryTurns = 8;
  readonly maxSessionCharacters = 16_000;
  readonly sessionTtlMs = 30 * 60_000;

  assertProviderConfiguration(): void {
    if (this.provider !== 'bedrock') return;
    if (!this.bedrockInvocationEnabled)
      throw new Error('WEB_AI_REAL_PROVIDER_NOT_AUTHORIZED');
    if (this.bedrockRegion !== 'ca-central-1')
      throw new Error('WEB_AI_BEDROCK_REGION_NOT_ALLOWED');
    if (this.bedrockModelId !== 'ca.amazon.nova-lite-v1:0')
      throw new Error('WEB_AI_BEDROCK_MODEL_NOT_ALLOWED');
  }

  private providerName(value?: string): PublicAssistantProviderName {
    const provider = value ?? 'documentary';
    if (!['documentary', 'simulated', 'bedrock'].includes(provider))
      throw new Error('WEB_AI_PROVIDER_INVALID');
    return provider as PublicAssistantProviderName;
  }
}
