import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DurableLocalJournal,
  KnownRevocationStore,
  NonExportableDeviceKeyStore,
  OperationalWatchdog,
  verifyRuntimeIntegrity,
} from './operational-resilience';

describe('DISPLAY-06D operational resilience', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'coro-display-06d-'));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('uses bounded exponential restart decisions and opens the circuit', () => {
    const watchdog = new OperationalWatchdog(2, 60_000, 100);
    const snapshot = {
      observedAt: new Date(0).toISOString(),
      player: 'HEALTHY' as const,
      chromium: 'FAILED' as const,
      renderResponsive: false,
      cache: 'HEALTHY' as const,
      emergencyActive: true,
      lastActivatedSequence: 8,
    };
    expect(watchdog.evaluate(snapshot, new Date(0))).toMatchObject({
      action: 'RESTART_CHROMIUM',
      delayMs: 100,
    });
    expect(watchdog.evaluate(snapshot, new Date(1))).toMatchObject({
      action: 'RESTART_CHROMIUM',
      delayMs: 200,
    });
    expect(watchdog.evaluate(snapshot, new Date(2))).toEqual({
      action: 'CIRCUIT_OPEN',
      reason: 'RESTART_BUDGET_EXHAUSTED',
    });
  });

  it('persists, chains and idempotently acknowledges local events', async () => {
    const path = join(root, 'journal.json');
    const journal = new DurableLocalJournal(path, Buffer.alloc(32, 3));
    const first = await journal.append('BOOT', { emergencyRestored: true });
    const second = await journal.append('NETWORK_LOST');
    expect(second.previousHash).toBe(first.hash);
    expect((await journal.pending()).map((event) => event.id)).toEqual([
      first.id,
      second.id,
    ]);
    await journal.acknowledge(new Set([first.id]));
    await journal.acknowledge(new Set([first.id]));
    expect((await journal.pending()).map((event) => event.id)).toEqual([
      second.id,
    ]);
    const raw = await readFile(path, 'utf8');
    await writeFile(path, raw.replace('NETWORK_LOST', 'NETWORK_RESTORED'));
    await expect(journal.read()).rejects.toThrow('JOURNAL_INTEGRITY_FAILED');
  });

  it('delegates signing without exposing private key material', async () => {
    const pair = generateKeyPairSync('ed25519');
    const store = new NonExportableDeviceKeyStore({
      provider: 'TEST_SYNTHETIC',
      hardwareBacked: false,
      keyId: () => Promise.resolve('test-key'),
      publicKeyPem: () =>
        Promise.resolve(
          pair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
        ),
      sign: (payload) =>
        Promise.resolve(
          sign(null, payload, pair.privateKey).toString('base64'),
        ),
    });
    expect(store.protectionProvider()).toBe('TEST_SYNTHETIC');
    expect(store.hardwareBacked()).toBe(false);
    expect(await store.sign(Buffer.from('proof'))).toMatch(
      /^[A-Za-z0-9+/]+=*$/,
    );
    expect('privateKeyPem' in store).toBe(false);
  });

  it('rejects a modified runtime file', async () => {
    const path = join(root, 'player.js');
    await writeFile(path, 'trusted');
    const sha256 = createHash('sha256').update('trusted').digest('hex');
    await expect(
      verifyRuntimeIntegrity(root, [{ path: 'player.js', sha256 }]),
    ).resolves.toBeUndefined();
    await writeFile(path, 'modified');
    await expect(
      verifyRuntimeIntegrity(root, [{ path: 'player.js', sha256 }]),
    ).rejects.toThrow('RUNTIME_INTEGRITY_MISMATCH');
  });

  it('preserves known revocations with integrity while offline', async () => {
    const path = join(root, 'revocations.json');
    const store = new KnownRevocationStore(path, Buffer.alloc(32, 9));
    await store.write(['version-b', 'version-a', 'version-a'], new Date(100));
    await expect(store.read()).resolves.toMatchObject({
      updatedAt: new Date(100).toISOString(),
    });
    expect([...(await store.read()).ids]).toEqual(['version-a', 'version-b']);
    const raw = await readFile(path, 'utf8');
    await writeFile(path, raw.replace('version-a', 'version-c'));
    await expect(store.read()).rejects.toThrow(
      'REVOCATION_STORE_INTEGRITY_FAILED',
    );
  });
});
