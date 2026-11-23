import { Injectable, Optional } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { fromIni } from '@aws-sdk/credential-providers';
import { DeterministicEmbeddingService } from './deterministic-embedding.service';
import { KnowledgeConfig } from './knowledge.config';
import { LocalEmbeddingEngine } from './local-embedding.engine';

type BedrockClient = Pick<BedrockRuntimeClient, 'send'>;

/** Modèle des vecteurs historiques (projection locale par hachage). */
export const LOCAL_EMBEDDING_MODEL = 'LOCAL_DETERMINISTIC_V1';
/** Vecteurs sémantiques Amazon Titan Text Embeddings V2, 512 dimensions, ca-central-1. */
export const TITAN_EMBEDDING_MODEL = 'BEDROCK_TITAN_EMBED_TEXT_V2_512';
export const TITAN_MODEL_ID = 'amazon.titan-embed-text-v2:0';
/** Vecteurs multilingual-e5-small calculés sur le serveur de CORO, 384 dimensions. */
export const LOCAL_E5_EMBEDDING_MODEL = 'LOCAL_E5_SMALL_384';
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
 * Fournit des vecteurs sémantiques : multilingual-e5-small calculé sur le
 * serveur de CORO (par défaut recommandé), ou Titan V2 au Canada quand AWS
 * l'autorise ; sinon, ou en cas d'échec, retombe sur la projection locale
 * déterministe. La recherche ne casse
 * jamais à cause du fournisseur : au pire, elle redevient lexicale.
 */
@Injectable()
export class SemanticEmbeddingService {
  private client?: BedrockClient;
  private consecutiveFailures = 0;
  private openUntil = 0;
  private readonly queryCache = new Map<string, number[]>();
  /** Dernier échec Titan (nom d'erreur AWS et statut HTTP), sans contenu. */
  lastFailure: { errorName: string; httpStatusCode: number | null } | null = null;

  readonly engine: LocalEmbeddingEngine;

  constructor(
    private readonly config: KnowledgeConfig,
    private readonly local: DeterministicEmbeddingService,
    @Optional() engine?: LocalEmbeddingEngine,
  ) {
    this.engine = engine ?? new LocalEmbeddingEngine();
  }

  /** Modèle visé pour les nouveaux extraits. */
  get targetModel() {
    switch (this.config.embeddingProvider) {
      case 'bedrock-titan-v2':
        return TITAN_EMBEDDING_MODEL;
      case 'local-e5-small':
        return LOCAL_E5_EMBEDDING_MODEL;
      default:
        return LOCAL_EMBEDDING_MODEL;
    }
  }

  /** Fournisseur sémantique configuré, disponible et circuit fermé. */
  semanticAvailable(now = Date.now()) {
    const provider = this.config.embeddingProvider;
    if (provider === 'deterministic' || now < this.openUntil) return false;
    return provider !== 'local-e5-small' || this.engine.modelPresent();
  }

  /** @deprecated Conservé pour compatibilité : voir semanticAvailable(). */
  titanAvailable(now = Date.now()) {
    return this.semanticAvailable(now);
  }

  /**
   * Similarité cosinus ramenée entre 0 et 1. Chaque modèle a sa propre
   * échelle : e5 donne des cosinus élevés même entre textes sans lien.
   */
  semanticScore(similarity: number) {
    const [floor, span] =
      this.targetModel === LOCAL_E5_EMBEDDING_MODEL
        ? [this.config.localSimilarityFloor, this.config.localSimilaritySpan]
        : [0.25, 0.55];
    return Math.min(1, Math.max(0, (similarity - floor) / span));
  }

  /** Vecteur d'un extrait à stocker ; repli sur la projection si échec. */
  async embedDocument(text: string): Promise<{ model: string; vector: number[] }> {
    if (this.semanticAvailable()) {
      const vector = await this.provider('passage', text);
      if (vector) return { model: this.targetModel, vector };
    }
    return {
      model: LOCAL_EMBEDDING_MODEL,
      vector: this.local.validate(this.local.embed(text)),
    };
  }

  /** Vecteur sémantique d'une question, ou null si indisponible. */
  async embedQuery(text: string): Promise<number[] | null> {
    if (!this.semanticAvailable()) return null;
    const key = text.trim();
    const cached = this.queryCache.get(key);
    if (cached) {
      this.queryCache.delete(key);
      this.queryCache.set(key, cached);
      return cached;
    }
    const vector = await this.provider('query', key);
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

  private async provider(kind: 'query' | 'passage', text: string): Promise<number[] | null> {
    return this.config.embeddingProvider === 'local-e5-small'
      ? this.guarded(LOCAL_E5_EMBEDDING_MODEL, () => this.engine.embed(kind, text))
      : this.guarded(TITAN_MODEL_ID, () => this.titan(text));
  }

  private async titan(text: string): Promise<number[]> {
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
    return this.validateTitan(payload.embedding);
  }

  private async guarded(
    model: string,
    call: () => Promise<number[]>,
  ): Promise<number[] | null> {
    const started = Date.now();
    try {
      const vector = await call();
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
      this.lastFailure = {
        errorName: /^[A-Za-z0-9_]{1,80}$/.test(failure?.name ?? '') ? failure.name! : 'ERROR',
        httpStatusCode: Number.isInteger(failure?.$metadata?.httpStatusCode)
          ? failure.$metadata!.httpStatusCode!
          : null,
      };
      process.stderr.write(
        JSON.stringify({
          event: 'CORO_KNOWLEDGE_EMBEDDING',
          status: 'PROVIDER_FAILURE',
          elapsedMs: Date.now() - started,
          model,
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
