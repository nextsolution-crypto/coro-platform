import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
} from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import {
  CachedPlan,
  PlayerMode,
  SignedPlayerDisplayManifest,
} from '../display-player/player-contracts';
import { sha256 } from '../display-player/manifest-validator';

async function syncDirectory(path: string): Promise<void> {
  if (process.platform === 'win32') return;
  const handle = await open(path, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function atomicWrite(
  path: string,
  bytes: Uint8Array,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomBytes(8).toString('hex')}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, path);
  await syncDirectory(dirname(path));
}

function validScopeIdentifier(value: string): boolean {
  return (
    value.length <= 128 &&
    value !== '.' &&
    value !== '..' &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
  );
}

function assertContained(root: string, candidate: string): void {
  const child = relative(root, candidate);
  if (child === '' || child === '..' || child.startsWith(`..${sep}`))
    throw new Error('CACHE_SCOPE_ESCAPE');
}

async function rejectSymbolicPath(root: string, target: string): Promise<void> {
  assertContained(root, target);
  try {
    if ((await lstat(root)).isSymbolicLink())
      throw new Error('CACHE_SYMBOLIC_PATH_FORBIDDEN');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const child = relative(root, target);
  let current = root;
  for (const part of child.split(sep)) {
    current = join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error('CACHE_SYMBOLIC_PATH_FORBIDDEN');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}

export interface CacheReadPolicy {
  revokedDocumentVersionIds?: ReadonlySet<string>;
}

export type CachedManifestVerifier = (
  manifest: SignedPlayerDisplayManifest,
  bytes: Uint8Array,
) => void;

const cacheCommitQueues = new Map<string, Promise<void>>();
const emergencyWriteQueues = new Map<string, Promise<void>>();

export class PersistentPlanCache {
  private readonly root: string;
  private readonly scopeRoot: string;

  constructor(
    root: string,
    deviceId: string,
    locationId: string,
    private readonly verifyManifest: CachedManifestVerifier,
  ) {
    if (!validScopeIdentifier(deviceId) || !validScopeIdentifier(locationId))
      throw new Error('INVALID_CACHE_SCOPE');
    this.root = resolve(root);
    this.scopeRoot = resolve(this.root, deviceId, locationId);
    assertContained(this.root, this.scopeRoot);
  }

  async commit(
    manifest: SignedPlayerDisplayManifest,
    bytes: Uint8Array,
    cachedAt: Date,
  ): Promise<void> {
    const previous = cacheCommitQueues.get(this.scopeRoot) ?? Promise.resolve();
    const operation = previous
      .catch(() => undefined)
      .then(() => this.commitExclusive(manifest, bytes, cachedAt));
    const settled = operation.catch(() => undefined);
    cacheCommitQueues.set(this.scopeRoot, settled);
    void settled.finally(() => {
      if (cacheCommitQueues.get(this.scopeRoot) === settled)
        cacheCommitQueues.delete(this.scopeRoot);
    });
    return operation;
  }

  private async commitExclusive(
    manifest: SignedPlayerDisplayManifest,
    bytes: Uint8Array,
    cachedAt: Date,
  ): Promise<void> {
    if (sha256(bytes) !== manifest.payload.documentSha256)
      throw new Error('DOCUMENT_INTEGRITY_MISMATCH');
    this.verifyManifest(manifest, bytes);
    if (
      !Number.isSafeInteger(manifest.payload.sequence) ||
      manifest.payload.sequence < 1
    )
      throw new Error('INVALID_CACHE_SEQUENCE');
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    await rejectSymbolicPath(this.root, this.scopeRoot);
    const existing = await this.readVerified();
    if (
      existing &&
      manifest.payload.sequence <= existing.manifest.payload.sequence
    )
      throw new Error('CACHE_REPLAY_OR_ROLLBACK');
    const next = join(this.scopeRoot, 'next');
    await rejectSymbolicPath(this.root, next);
    await rm(next, { recursive: true, force: true });
    await mkdir(next, { recursive: true, mode: 0o700 });
    await atomicWrite(join(next, 'plan.bin'), bytes);
    await atomicWrite(
      join(next, 'metadata.json'),
      Buffer.from(
        JSON.stringify({ manifest, cachedAt: cachedAt.toISOString() }),
        'utf8',
      ),
    );
    const current = join(this.scopeRoot, 'current');
    const previous = join(this.scopeRoot, 'previous');
    await rejectSymbolicPath(this.root, current);
    await rejectSymbolicPath(this.root, previous);
    await rm(previous, { recursive: true, force: true });
    try {
      await stat(current);
      await rename(current, previous);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    try {
      await rename(next, current);
      await syncDirectory(this.scopeRoot);
    } catch (error) {
      try {
        await rename(previous, current);
      } catch {
        // Recovery is retried by readVerified() on the next start.
      }
      throw error;
    }
  }

  async readVerified(policy: CacheReadPolicy = {}): Promise<CachedPlan | null> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    await rejectSymbolicPath(this.root, this.scopeRoot);
    for (const directory of ['current', 'previous']) {
      try {
        const candidate = join(this.scopeRoot, directory);
        await rejectSymbolicPath(this.root, candidate);
        await rejectSymbolicPath(this.root, join(candidate, 'metadata.json'));
        await rejectSymbolicPath(this.root, join(candidate, 'plan.bin'));
        const metadata = JSON.parse(
          await readFile(join(candidate, 'metadata.json'), 'utf8'),
        ) as {
          manifest: SignedPlayerDisplayManifest;
          cachedAt: string;
        };
        const bytes = await readFile(join(candidate, 'plan.bin'));
        if (
          !metadata.manifest.payload.knownRevoked &&
          !policy.revokedDocumentVersionIds?.has(
            metadata.manifest.payload.documentVersionId,
          ) &&
          sha256(bytes) === metadata.manifest.payload.documentSha256
        ) {
          this.verifyManifest(metadata.manifest, bytes);
          return {
            manifest: metadata.manifest,
            cachedAt: metadata.cachedAt,
            bytes,
          };
        }
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message === 'CACHE_SYMBOLIC_PATH_FORBIDDEN' ||
            error.message === 'CACHE_SCOPE_ESCAPE')
        )
          throw error;
        // Try the retained previous generation.
      }
    }
    return null;
  }
}

export interface PersistedEmergencyState {
  mode: PlayerMode;
  eventId: string;
  source: 'LOCAL_SYNTHETIC' | 'FUTURE_GOVERNED_GATEWAY';
  priority: number;
  occurredAt: string;
  version: number;
  authorizationId: string;
}

export class EmergencyStateStore {
  constructor(
    private readonly path: string,
    private readonly integrityKey: Uint8Array,
  ) {
    if (integrityKey.length < 32)
      throw new Error('EMERGENCY_INTEGRITY_KEY_TOO_SHORT');
  }

  async write(
    state: PersistedEmergencyState,
    options: { governedClear?: boolean } = {},
  ): Promise<void> {
    const previous = emergencyWriteQueues.get(this.path) ?? Promise.resolve();
    const operation = previous
      .catch(() => undefined)
      .then(() => this.writeExclusive(state, options));
    const settled = operation.catch(() => undefined);
    emergencyWriteQueues.set(this.path, settled);
    void settled.finally(() => {
      if (emergencyWriteQueues.get(this.path) === settled)
        emergencyWriteQueues.delete(this.path);
    });
    return operation;
  }

  private async writeExclusive(
    state: PersistedEmergencyState,
    options: { governedClear?: boolean },
  ): Promise<void> {
    const priorityByMode: Record<PlayerMode, number> = {
      NORMAL_CYCLE: 0,
      PERMANENT_PLAN: 1,
      EMERGENCY_EXERCISE: 2,
      EMERGENCY_REAL: 3,
    };
    if (
      state.priority !== priorityByMode[state.mode] ||
      !Number.isSafeInteger(state.version) ||
      state.version < 1 ||
      !state.eventId ||
      !state.authorizationId ||
      !Number.isFinite(Date.parse(state.occurredAt))
    )
      throw new Error('EMERGENCY_STATE_INVALID');
    const current = await this.read();
    if (current) {
      if (state.version <= current.version)
        throw new Error('EMERGENCY_STATE_REPLAY_OR_ROLLBACK');
      if (state.priority < current.priority && !options.governedClear)
        throw new Error('EMERGENCY_GOVERNED_CLEAR_REQUIRED');
    }
    const payload = JSON.stringify(state);
    const mac = createHmac('sha256', this.integrityKey)
      .update(payload)
      .digest('hex');
    await atomicWrite(
      this.path,
      Buffer.from(JSON.stringify({ payload, mac }), 'utf8'),
    );
  }

  async read(): Promise<PersistedEmergencyState | null> {
    try {
      const envelope = JSON.parse(await readFile(this.path, 'utf8')) as {
        payload: string;
        mac: string;
      };
      const expected = createHmac('sha256', this.integrityKey)
        .update(envelope.payload)
        .digest();
      const received = Buffer.from(envelope.mac, 'hex');
      if (
        received.length !== expected.length ||
        !timingSafeEqual(received, expected)
      )
        throw new Error('EMERGENCY_STATE_CORRUPT');
      return JSON.parse(envelope.payload) as PersistedEmergencyState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
}
