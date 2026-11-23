import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Moteur de vecteurs exécuté sur le serveur de CORO (aucun appel externe).
 *
 * Modèle : multilingual-e5-small (licence MIT), version quantifiée ONNX,
 * 384 dimensions, intégré à l'image Docker au build. Chargé à la première
 * utilisation et déchargé après une période d'inactivité pour libérer la
 * mémoire du serveur. Les appels sont sérialisés (un à la fois).
 */
export const LOCAL_MODEL_NAME = 'Xenova/multilingual-e5-small';
export const LOCAL_DIMENSIONS = 384;
const MAX_INPUT_CHARACTERS = 4_000;

type Extractor = ((
  texts: string | string[],
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ tolist(): number[][] }>) & { dispose?: () => Promise<void> };

export class LocalEmbeddingEngine {
  private extractor?: Promise<Extractor>;
  private queue: Promise<unknown> = Promise.resolve();
  private idleTimer?: NodeJS.Timeout;

  constructor(
    private readonly modelRoot = process.env.CORO_KNOWLEDGE_LOCAL_MODEL_ROOT ?? join(process.cwd(), 'models'),
    private readonly idleMs = 10 * 60_000,
    private readonly loader: (root: string) => Promise<Extractor> = defaultLoader,
  ) {}

  modelPresent() {
    return existsSync(join(this.modelRoot, LOCAL_MODEL_NAME, 'onnx', 'model_quantized.onnx'));
  }

  /** e5 distingue les questions (« query: ») des passages (« passage: »). */
  embed(kind: 'query' | 'passage', text: string): Promise<number[]> {
    const run = this.queue.then(async () => {
      const extractor = await this.load();
      const output = await extractor(`${kind}: ${text.slice(0, MAX_INPUT_CHARACTERS)}`, {
        pooling: 'mean',
        normalize: true,
      });
      const vector = output.tolist()[0];
      if (!Array.isArray(vector) || vector.length !== LOCAL_DIMENSIONS || vector.some((v) => !Number.isFinite(v)))
        throw new Error('INVALID_LOCAL_EMBEDDING');
      return vector;
    });
    this.queue = run.catch(() => undefined).finally(() => this.scheduleUnload());
    return run;
  }

  loaded() {
    return Boolean(this.extractor);
  }

  async unload() {
    const current = this.extractor;
    this.extractor = undefined;
    if (current) await (await current.catch(() => undefined))?.dispose?.();
  }

  private load() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.extractor ??= this.loader(this.modelRoot).catch((error) => {
      this.extractor = undefined;
      throw error;
    });
    return this.extractor;
  }

  private scheduleUnload() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => void this.unload(), this.idleMs);
    this.idleTimer.unref?.();
  }
}

async function defaultLoader(root: string): Promise<Extractor> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const transformers = require('@huggingface/transformers') as {
    env: { allowRemoteModels: boolean; allowLocalModels: boolean; localModelPath: string };
    pipeline: (task: string, model: string, options: Record<string, unknown>) => Promise<Extractor>;
  };
  transformers.env.allowRemoteModels = false;
  transformers.env.allowLocalModels = true;
  transformers.env.localModelPath = root;
  return transformers.pipeline('feature-extraction', LOCAL_MODEL_NAME, {
    dtype: 'q8',
    device: 'cpu',
    session_options: { intraOpNumThreads: 1, interOpNumThreads: 1 },
  });
}
