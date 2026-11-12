import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { DeviceKeyStore } from './connected-player-runtime';
import { atomicWrite } from './persistent-runtime';
import { canonicalize } from '../display-player/manifest-validator';

export type RuntimeComponentHealth = 'HEALTHY' | 'DEGRADED' | 'FAILED';

export interface RuntimeHealthSnapshot {
  observedAt: string;
  player: RuntimeComponentHealth;
  chromium: RuntimeComponentHealth;
  renderResponsive: boolean;
  cache: 'HEALTHY' | 'DEGRADED' | 'CORRUPT';
  emergencyActive: boolean;
  lastActivatedSequence: number;
}

export type WatchdogDecision =
  | { action: 'NONE' }
  | { action: 'RESTART_CHROMIUM'; delayMs: number; reason: string }
  | { action: 'RESTART_PLAYER'; delayMs: number; reason: string }
  | { action: 'CIRCUIT_OPEN'; reason: string };

/** Pure policy. The OS supervisor remains responsible for process control. */
export class OperationalWatchdog {
  private readonly attempts: number[] = [];

  constructor(
    private readonly maximumRestarts = 4,
    private readonly windowMs = 10 * 60_000,
    private readonly baseBackoffMs = 1_000,
  ) {}

  evaluate(
    snapshot: RuntimeHealthSnapshot,
    now = new Date(),
  ): WatchdogDecision {
    if (!Number.isFinite(Date.parse(snapshot.observedAt)))
      return { action: 'CIRCUIT_OPEN', reason: 'HEALTH_TIMESTAMP_INVALID' };
    const unhealthy =
      snapshot.player !== 'HEALTHY' ||
      snapshot.chromium !== 'HEALTHY' ||
      !snapshot.renderResponsive;
    if (!unhealthy) return { action: 'NONE' };

    const threshold = now.getTime() - this.windowMs;
    while (this.attempts.length && this.attempts[0] < threshold)
      this.attempts.shift();
    if (this.attempts.length >= this.maximumRestarts)
      return { action: 'CIRCUIT_OPEN', reason: 'RESTART_BUDGET_EXHAUSTED' };
    const delayMs = Math.min(
      this.baseBackoffMs * 2 ** this.attempts.length,
      60_000,
    );
    this.attempts.push(now.getTime());
    if (snapshot.player === 'HEALTHY')
      return {
        action: 'RESTART_CHROMIUM',
        delayMs,
        reason: snapshot.renderResponsive
          ? 'CHROMIUM_UNHEALTHY'
          : 'RENDER_UNRESPONSIVE',
      };
    return { action: 'RESTART_PLAYER', delayMs, reason: 'PLAYER_UNHEALTHY' };
  }
}

export interface NonExportableSigner {
  keyId(): Promise<string>;
  publicKeyPem(): Promise<string>;
  sign(payload: Uint8Array): Promise<string>;
  provider: 'WINDOWS_CNG' | 'LINUX_PKCS11' | 'LINUX_TPM2' | 'TEST_SYNTHETIC';
  hardwareBacked: boolean;
}

/** Delegates signing to an OS provider and intentionally exposes no export API. */
export class NonExportableDeviceKeyStore implements DeviceKeyStore {
  constructor(private readonly signer: NonExportableSigner) {}
  keyId() {
    return this.signer.keyId();
  }
  publicKeyPem() {
    return this.signer.publicKeyPem();
  }
  sign(payload: Uint8Array) {
    return this.signer.sign(payload);
  }
  hardwareBacked() {
    return this.signer.hardwareBacked;
  }
  protectionProvider() {
    return this.signer.provider;
  }
}

export type LocalOperationalEventType =
  | 'BOOT'
  | 'SHUTDOWN'
  | 'CRASH'
  | 'RESTART'
  | 'SYNC'
  | 'ACTIVATION'
  | 'HEARTBEAT'
  | 'NETWORK_LOST'
  | 'NETWORK_RESTORED'
  | 'ERROR'
  | 'EMERGENCY'
  | 'GOVERNED_CLEAR'
  | 'REVOCATION'
  | 'TRUST_UPDATED';

export interface LocalOperationalEvent {
  id: string;
  sequence: number;
  occurredAt: string;
  type: LocalOperationalEventType;
  details: Record<string, string | number | boolean | null>;
  previousHash: string;
  hash: string;
  reconciledAt?: string;
}

interface JournalEnvelope {
  version: 1;
  events: LocalOperationalEvent[];
  mac: string;
}

interface RevocationEnvelope {
  version: 1;
  updatedAt: string;
  documentVersionIds: string[];
  mac: string;
}

const journalQueues = new Map<string, Promise<void>>();

function hashEvent(
  event: Omit<LocalOperationalEvent, 'hash' | 'reconciledAt'>,
) {
  return createHash('sha256').update(canonicalize(event)).digest('hex');
}

/** Bounded, hash-chained, HMAC-protected local journal. No secret is logged. */
export class DurableLocalJournal {
  constructor(
    private readonly path: string,
    private readonly integrityKey: Uint8Array,
    private readonly maximumEvents = 5_000,
  ) {
    if (integrityKey.length < 32) throw new Error('JOURNAL_KEY_TOO_SHORT');
  }

  async append(
    type: LocalOperationalEventType,
    details: LocalOperationalEvent['details'] = {},
    now = new Date(),
  ): Promise<LocalOperationalEvent> {
    return this.exclusive(async () => {
      const events = await this.read();
      const previous = events.at(-1);
      const unsigned = {
        id: randomUUID(),
        sequence: (previous?.sequence ?? 0) + 1,
        occurredAt: now.toISOString(),
        type,
        details,
        previousHash: previous?.hash ?? 'GENESIS',
      };
      const event = { ...unsigned, hash: hashEvent(unsigned) };
      const retained = [...events, event].slice(-this.maximumEvents);
      await this.write(retained);
      return event;
    });
  }

  async pending(limit = 100): Promise<LocalOperationalEvent[]> {
    return (await this.read())
      .filter((event) => !event.reconciledAt)
      .slice(0, limit);
  }

  async acknowledge(ids: ReadonlySet<string>, at = new Date()): Promise<void> {
    await this.exclusive(async () => {
      const events = await this.read();
      await this.write(
        events.map((event) =>
          ids.has(event.id) && !event.reconciledAt
            ? { ...event, reconciledAt: at.toISOString() }
            : event,
        ),
      );
    });
  }

  async read(): Promise<LocalOperationalEvent[]> {
    try {
      const envelope = JSON.parse(
        await readFile(this.path, 'utf8'),
      ) as JournalEnvelope;
      if (envelope.version !== 1 || !Array.isArray(envelope.events))
        throw new Error('JOURNAL_INVALID');
      const payload = JSON.stringify({
        version: envelope.version,
        events: envelope.events,
      });
      const expected = createHmac('sha256', this.integrityKey)
        .update(payload)
        .digest();
      const received = Buffer.from(envelope.mac, 'hex');
      if (
        received.length !== expected.length ||
        !timingSafeEqual(received, expected)
      )
        throw new Error('JOURNAL_INTEGRITY_FAILED');
      let previousHash = envelope.events[0]?.previousHash ?? 'GENESIS';
      for (const event of envelope.events) {
        const unsigned = {
          id: event.id,
          sequence: event.sequence,
          occurredAt: event.occurredAt,
          type: event.type,
          details: event.details,
          previousHash: event.previousHash,
        };
        const { hash } = event;
        if (event.previousHash !== previousHash || hashEvent(unsigned) !== hash)
          throw new Error('JOURNAL_CHAIN_INVALID');
        previousHash = hash;
      }
      return envelope.events;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private async write(events: LocalOperationalEvent[]) {
    const payload = JSON.stringify({ version: 1, events });
    const mac = createHmac('sha256', this.integrityKey)
      .update(payload)
      .digest('hex');
    await atomicWrite(
      this.path,
      Buffer.from(JSON.stringify({ version: 1, events, mac }), 'utf8'),
    );
  }

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = journalQueues.get(this.path) ?? Promise.resolve();
    let result!: T;
    const queued = previous
      .catch(() => undefined)
      .then(async () => {
        result = await operation();
      });
    journalQueues.set(
      this.path,
      queued.catch(() => undefined),
    );
    await queued;
    return result;
  }
}

/** Last-known revocations are fail-closed locally; freshness is reported separately. */
export class KnownRevocationStore {
  constructor(
    private readonly path: string,
    private readonly integrityKey: Uint8Array,
  ) {
    if (integrityKey.length < 32) throw new Error('REVOCATION_KEY_TOO_SHORT');
  }

  async write(documentVersionIds: Iterable<string>, updatedAt = new Date()) {
    const ids = [...new Set(documentVersionIds)].sort();
    if (ids.some((id) => !id || id.length > 128))
      throw new Error('REVOCATION_ID_INVALID');
    const payload = JSON.stringify({
      version: 1,
      updatedAt: updatedAt.toISOString(),
      documentVersionIds: ids,
    });
    const mac = createHmac('sha256', this.integrityKey)
      .update(payload)
      .digest('hex');
    await atomicWrite(
      this.path,
      Buffer.from(JSON.stringify({ ...JSON.parse(payload), mac })),
    );
  }

  async read(): Promise<{ ids: ReadonlySet<string>; updatedAt?: string }> {
    try {
      const envelope = JSON.parse(
        await readFile(this.path, 'utf8'),
      ) as RevocationEnvelope;
      const payload = JSON.stringify({
        version: envelope.version,
        updatedAt: envelope.updatedAt,
        documentVersionIds: envelope.documentVersionIds,
      });
      const expected = createHmac('sha256', this.integrityKey)
        .update(payload)
        .digest();
      const received = Buffer.from(envelope.mac, 'hex');
      if (
        envelope.version !== 1 ||
        !Array.isArray(envelope.documentVersionIds) ||
        received.length !== expected.length ||
        !timingSafeEqual(received, expected)
      )
        throw new Error('REVOCATION_STORE_INTEGRITY_FAILED');
      return {
        ids: new Set(envelope.documentVersionIds),
        updatedAt: envelope.updatedAt,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        return { ids: new Set() };
      throw error;
    }
  }
}

export interface RuntimeIntegrityEntry {
  path: string;
  sha256: string;
}

export async function verifyRuntimeIntegrity(
  root: string,
  entries: RuntimeIntegrityEntry[],
): Promise<void> {
  for (const entry of entries) {
    if (!/^[a-f0-9]{64}$/.test(entry.sha256) || entry.path.includes('..'))
      throw new Error('RUNTIME_INTEGRITY_MANIFEST_INVALID');
    const bytes = await readFile(`${root}/${entry.path}`);
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== entry.sha256) throw new Error('RUNTIME_INTEGRITY_MISMATCH');
  }
}
