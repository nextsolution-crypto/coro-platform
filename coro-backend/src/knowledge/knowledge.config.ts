import { Injectable } from '@nestjs/common';

function integer(name: string, fallback: number, min: number, max: number) {
  const value = process.env[name] ? Number(process.env[name]) : fallback;
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${name} invalide`);
  return value;
}

@Injectable()
export class KnowledgeConfig {
  readonly maxPages = integer('KNOWLEDGE_MAX_PAGES', 500, 1, 5000);
  readonly extractionTimeoutMs = integer(
    'KNOWLEDGE_EXTRACTION_TIMEOUT_MS',
    120_000,
    1000,
    3_600_000,
  );
  readonly chunkTargetCharacters = integer(
    'KNOWLEDGE_CHUNK_TARGET_CHARACTERS',
    2500,
    200,
    20_000,
  );
  readonly chunkOverlapCharacters = integer(
    'KNOWLEDGE_CHUNK_OVERLAP_CHARACTERS',
    300,
    0,
    4000,
  );
  readonly maxResults = integer('KNOWLEDGE_MAX_RESULTS', 12, 1, 50);
  readonly pipelineVersion = 'BUILDING_KNOWLEDGE_V3';
  readonly localOcrEnabled = process.env.KNOWLEDGE_LOCAL_OCR_ENABLED === 'true';
  readonly ocrMaxPages = integer('KNOWLEDGE_OCR_MAX_PAGES', 8, 1, 20);
  readonly ocrMinConfidence = integer('KNOWLEDGE_OCR_MIN_CONFIDENCE', 80, 50, 100);
  readonly ocrPageTimeoutMs = integer('KNOWLEDGE_OCR_PAGE_TIMEOUT_MS', 20_000, 1000, 60_000);
  readonly maxExtractionBytes = 10 * 1024 * 1024;
  readonly maxAutoAttempts = integer('KNOWLEDGE_MAX_AUTO_ATTEMPTS', 3, 1, 10);
  readonly retryDelayMs = integer('KNOWLEDGE_RETRY_DELAY_MS', 300_000, 60_000, 3_600_000);
  readonly bedrockTimeoutMs = integer('CORO_AI_BEDROCK_TIMEOUT_MS', 30_000, 1000, 60_000);

  readonly aiProvider = this.enumValue(
    'CORO_AI_PROVIDER',
    'deterministic-simulated',
    ['deterministic-simulated', 'bedrock'] as const,
  );
  readonly bedrockInvocationEnabled =
    process.env.CORO_AI_BEDROCK_INVOCATION_ENABLED === 'true';
  readonly bedrockRegion = process.env.CORO_AI_BEDROCK_REGION ?? 'ca-central-1';
  readonly bedrockModelId =
    process.env.CORO_AI_BEDROCK_MODEL_ID ?? 'ca.amazon.nova-lite-v1:0';
  readonly awsProfile = process.env.AWS_PROFILE ?? 'coro-ai-production';
  readonly awsConfigFile =
    process.env.AWS_CONFIG_FILE ?? '/etc/coro-ai/aws-config';
  readonly rolesAnywhereSessionSeconds = integer(
    'CORO_AI_ROLES_ANYWHERE_SESSION_SECONDS',
    900,
    900,
    3600,
  );

  /** CORO Knowledge : vecteurs sémantiques (Titan V2, Canada) ou projection locale. */
  readonly embeddingProvider = this.enumValue(
    'CORO_KNOWLEDGE_EMBEDDING_PROVIDER',
    'deterministic',
    ['deterministic', 'bedrock-titan-v2', 'local-e5-small'] as const,
  );
  readonly embeddingRegion =
    process.env.CORO_KNOWLEDGE_EMBEDDING_REGION ?? 'ca-central-1';
  readonly embeddingTimeoutMs = integer(
    'CORO_KNOWLEDGE_EMBEDDING_TIMEOUT_MS',
    10_000,
    1000,
    30_000,
  );
  /**
   * Échelle des cosinus e5 (modèle local) : en dessous du plancher, deux
   * textes sont jugés sans lien ; plancher + amplitude = lien maximal.
   */
  readonly localSimilarityFloor =
    integer('CORO_KNOWLEDGE_LOCAL_SIMILARITY_FLOOR_PERMILLE', 780, 500, 950) / 1000;
  readonly localSimilaritySpan =
    integer('CORO_KNOWLEDGE_LOCAL_SIMILARITY_SPAN_PERMILLE', 140, 50, 400) / 1000;
  /** Extraits ré-indexés par passe du rattrapage (0 = rattrapage arrêté). */
  readonly embeddingBackfillBatch = integer(
    'CORO_KNOWLEDGE_EMBEDDING_BACKFILL_BATCH',
    40,
    0,
    500,
  );

  assertEmbeddingActivation() {
    if (this.embeddingProvider !== 'bedrock-titan-v2')
      throw new Error('Vecteurs Titan non selectionnes.');
    if (this.embeddingRegion !== 'ca-central-1')
      throw new Error('La region des vecteurs doit etre ca-central-1.');
    if (this.rolesAnywhereSessionSeconds !== 900)
      throw new Error('La session Roles Anywhere doit etre limitee a 900 secondes.');
  }

  assertBedrockActivation() {
    if (this.aiProvider !== 'bedrock') return;
    if (!this.bedrockInvocationEnabled)
      throw new Error('Invocation Bedrock non autorisee par la configuration.');
    if (this.bedrockRegion !== 'ca-central-1')
      throw new Error('La region Bedrock doit etre ca-central-1.');
    if (this.bedrockModelId !== 'ca.amazon.nova-lite-v1:0')
      throw new Error('Le modele Bedrock demande n est pas autorise.');
    if (this.rolesAnywhereSessionSeconds !== 900)
      throw new Error('La session Roles Anywhere doit etre limitee a 900 secondes.');
  }

  private enumValue<const T extends readonly string[]>(
    name: string,
    fallback: T[number],
    allowed: T,
  ): T[number] {
    const value = process.env[name] ?? fallback;
    if (!allowed.includes(value)) throw new Error(`${name} invalide`);
    return value;
  }
}
