import { CachedPlan } from './player-contracts';
import { sha256 } from './manifest-validator';

export interface PlayerCacheStore {
  read(): Promise<CachedPlan | null>;
  stage(candidate: CachedPlan): Promise<void>;
  commit(): Promise<void>;
  discardStage(): Promise<void>;
}

export class InMemoryAtomicPlayerCache implements PlayerCacheStore {
  private current: CachedPlan | null = null;
  private staged: CachedPlan | null = null;

  read(): Promise<CachedPlan | null> {
    return Promise.resolve(this.current);
  }

  stage(candidate: CachedPlan): Promise<void> {
    if (sha256(candidate.bytes) !== candidate.manifest.payload.documentSha256) {
      return Promise.reject(new Error('DOCUMENT_INTEGRITY_MISMATCH'));
    }
    this.staged = candidate;
    return Promise.resolve();
  }

  commit(): Promise<void> {
    if (!this.staged) return Promise.reject(new Error('NO_STAGED_PLAN'));
    this.current = this.staged;
    this.staged = null;
    return Promise.resolve();
  }

  discardStage(): Promise<void> {
    this.staged = null;
    return Promise.resolve();
  }
}

export async function replaceCachedPlanAtomically(
  cache: PlayerCacheStore,
  candidate: CachedPlan,
): Promise<void> {
  await cache.stage(candidate);
  try {
    await cache.commit();
  } catch (error) {
    await cache.discardStage();
    throw error;
  }
}
