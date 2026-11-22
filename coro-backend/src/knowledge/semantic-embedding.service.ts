import { Injectable } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { fromIni } from '@aws-sdk/credential-providers';
import { DeterministicEmbeddingService } from './deterministic-embedding.service';
import { KnowledgeConfig } from './knowledge.config';

type BedrockClient = Pick<BedrockRuntimeClient, 'send'>;

/** Modèle des vecteurs historiques (projection locale par hachage). */
export const LOCAL_EMBEDDING_MODEL = 'LOCAL_DETERMINISTIC_V1';
/** Vecteurs sémantiques Amazon Titan Text Embeddings V2, 512 dimensions, ca-central-1. */
export const TITAN_EMBEDDING_MODEL = 'BEDROCK_TITAN_EMBED_TEXT_V2_512';
export const TITAN_MODEL_ID = 'amazon.titan-embed-text-v2:0';
export const TITAN_DIMENSIONS = 512;

/** Titan accepte 8192 jetons ; on borne largement en caractères. */
const MAX_INPUT_CHARACTERS = 20_000;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 5 * 60_000;
const QUERY_CACHE_SIZE = 200;

export function cosine(left: number[], right: number[]) {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

/**
 * CORO Knowledge — recherche par le sens.
 *
 * Fournit des vecteurs Titan V2 (traités au Canada, ca-central-1) quand la
 * politique d'exécution l'autorise ; sinon, ou si AWS est indisponible,
 * retombe sur la projection locale déterministe. La recherche ne casse
 * jamais à cause du fournisseur : au pire, elle redevient lexicale.
 */
@Injectable()
export class SemanticEmbeddingService {
  private client?: BedrockClient;
  private consecutiveFailures = 0;
  private openUntil = 0;
  private readonly queryCache = new Map<string, number[]>();

  constructor(
    private readonly config: KnowledgeConfig,
    private readonly local: DeterministicEmbeddingService,
  ) {}

  /** Modèle visé pour les nouveaux extraits. */
  get targetModel() {
    return this.config.embeddingProvider === 'bedrock-titan-v2'
      ? TITAN_EMBEDDING_MODEL
      : LOCAL_EMBEDDING_MODEL;
  }

  /** Titan configuré et circuit fermé. */
  titanAvailable(now = Date.now()) {
    return (
      this.config.embeddingProvider === 'bedrock-titan-v2' &&
      now >= this.openUntil
    );
  }

  /** Vecteur d'un extrait à stocker ; repli local si Titan échoue. */
  async embedDocument(text: string): Promise<{ model: string; vector: number[] }> {
    if (this.titanAvailable()) {
      const vector = await this.titan(text);
      if (vector) return { model: TITAN_EMBEDDING_MODEL, vector };
    }
    return {
      model: LOCAL_EMBEDDING_MODEL,
      vector: this.local.validate(this.local.embed(text)),
    };
  }

  /** Vecteur Titan d'une question, ou null si Titan n'est pas disponible. */
  async embedQuery(text: string): Promise<number[] | null> {
    if (!this.titanAvailable()) return null;
    const key = text.trim();
    const cached = this.queryCache.get(key);
    if (cached) {
      this.queryCache.delete(key);
      this.queryCache.set(key, cached);
      return cached;
    }
    const vector = await this.titan(key);
    if (vector) {
      this.queryCache.set(key, vector);
      if (this.queryCache.size > QUERY_CACHE_SIZE)
        this.queryCache.delete(this.queryCache.keys().next().value as string);
    }
    return vector;
  }

  validateTitan(vector: unknown): number[] {
    if (
      !Array.isArray(vector) ||
      vector.length !== TITAN_DIMENSIONS ||
      vector.some((value) => typeof value !== 'number' || !Number.isFinite(value))
    )
      throw new Error('INVALID_TITAN_EMBEDDING');
    return vector as number[];
  }

  setClientForTesting(client: BedrockClient) {
    if (process.env.NODE_ENV !== 'test')
      throw new Error('Injection du client reservee aux tests.');
    this.client = client;
  }

  private async titan(text: string): Promise<number[] | null> {
    const started = Date.now();
    try {
      this.config.assertEmbeddingActivation();
      const response = await this.getClient().send(
        new InvokeModelCommand({
          modelId: TITAN_MODEL_ID,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            inputText: text.slice(0, MAX_INPUT_CHARACTERS),
            dimensions: TITAN_DIMENSIONS,
            normalize: true,
          }),
        }),
        { abortSignal: AbortSignal.timeout(this.config.embeddingTimeoutMs) },
      );
      const payload = JSON.parse(
        new TextDecoder().decode(response.body as Uint8Array),
      ) as { embedding?: unknown };
      const vector = this.validateTitan(payload.embedding);
      this.consecutiveFailures = 0;
      return vector;
    } catch (error) {
      this.consecutiveFailures += 1;
      if (this.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
        this.openUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
        this.consecutiveFailures = 0;
      }
      const failure = error as {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };
      process.stderr.write(
        JSON.stringify({
          event: 'CORO_KNOWLEDGE_EMBEDDING',
          status: 'PROVIDER_FAILURE',
          elapsedMs: Date.now() - started,
          model: TITAN_MODEL_ID,
          errorName: /^[A-Za-z0-9_]{1,80}$/.test(failure?.name ?? '')
            ? failure.name
            : 'ERROR',
          httpStatusCode: Number.isInteger(failure?.$metadata?.httpStatusCode)
            ? failure.$metadata!.httpStatusCode
            : null,
          circuitOpen: Date.now() < this.openUntil,
        }) + '\n',
      );
      return null;
    }
  }

  private getClient(): BedrockClient {
    this.client ??= new BedrockRuntimeClient({
      region: this.config.embeddingRegion,
      credentials: fromIni({
        profile: this.config.awsProfile,
        configFilepath: this.config.awsConfigFile,
      }),
    });
    return this.client;
  }
}
