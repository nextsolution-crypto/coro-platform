import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
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

async function atomicWrite(path: string, bytes: Uint8Array): Promise<void> {
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

export class PersistentPlanCache {
  private readonly scopeRoot: string;

  constructor(root: string, deviceId: string, locationId: string) {
    if (
      !/^[A-Za-z0-9._-]+$/.test(deviceId) ||
      !/^[A-Za-z0-9._-]+$/.test(locationId)
    )
      throw new Error('INVALID_CACHE_SCOPE');
    this.scopeRoot = resolve(root, deviceId, locationId);
  }

  async commit(
    manifest: SignedPlayerDisplayManifest,
    bytes: Uint8Array,
    cachedAt: Date,
  ): Promise<void> {
    if (sha256(bytes) !== manifest.payload.documentSha256)
      throw new Error('DOCUMENT_INTEGRITY_MISMATCH');
    const next = join(this.scopeRoot, 'next');
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

  async readVerified(): Promise<CachedPlan | null> {
    for (const directory of ['current', 'previous']) {
      try {
        const metadata = JSON.parse(
          await readFile(
            join(this.scopeRoot, directory, 'metadata.json'),
            'utf8',
          ),
        ) as {
          manifest: SignedPlayerDisplayManifest;
          cachedAt: string;
        };
        const bytes = await readFile(
          join(this.scopeRoot, directory, 'plan.bin'),
        );
        if (sha256(bytes) === metadata.manifest.payload.documentSha256) {
          return {
            manifest: metadata.manifest,
            cachedAt: metadata.cachedAt,
            bytes,
          };
        }
      } catch {
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

  async write(state: PersistedEmergencyState): Promise<void> {
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
