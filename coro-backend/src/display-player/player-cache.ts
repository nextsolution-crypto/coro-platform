import { CachedPlan } from './player-contracts';
import { sha256 } from './manifest-validator';

export interface PlayerCacheStore {
  read(): Promise<CachedPlan | null>;
  stage(candidate: CachedPlan): Promise<string>;
  commit(stageToken: string): Promise<void>;
  discardStage(stageToken: string): Promise<void>;
}

export class InMemoryAtomicPlayerCache implements PlayerCacheStore {
  private current: CachedPlan | null = null;
  private staged = new Map<string, CachedPlan>();
  private tokenSequence = 0;

  read(): Promise<CachedPlan | null> {
    return Promise.resolve(this.current);
  }

  stage(candidate: CachedPlan): Promise<string> {
    if (sha256(candidate.bytes) !== candidate.manifest.payload.documentSha256) {
      return Promise.reject(new Error('DOCUMENT_INTEGRITY_MISMATCH'));
    }
    const token = `stage-${++this.tokenSequence}`;
    this.staged.set(token, candidate);
    return Promise.resolve(token);
  }

  commit(stageToken: string): Promise<void> {
    const candidate = this.staged.get(stageToken);
    if (!candidate) return Promise.reject(new Error('INVALID_STAGE_TOKEN'));
    this.current = candidate;
    this.staged.delete(stageToken);
    return Promise.resolve();
  }

  discardStage(stageToken: string): Promise<void> {
    this.staged.delete(stageToken);
    return Promise.resolve();
  }
}

export async function replaceCachedPlanAtomically(
  cache: PlayerCacheStore,
  candidate: CachedPlan,
): Promise<void> {
  const stageToken = await cache.stage(candidate);
  try {
    await cache.commit(stageToken);
  } catch (error) {
    await cache.discardStage(stageToken);
    throw error;
  }
}
