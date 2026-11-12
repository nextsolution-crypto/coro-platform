import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DurableLocalJournal,
  FileMonotonicAnchor,
  KnownRevocationStore,
  NonExportableDeviceKeyStore,
  OperationalWatchdog,
  RuntimeWatchdogController,
  verifyAuthenticatedRuntimeManifest,
  verifyRuntimeIntegrity,
} from './operational-resilience';
import { canonicalize } from '../display-player/manifest-validator';

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

  it('fails closed on stale or future watchdog observations', () => {
    const watchdog = new OperationalWatchdog();
    const snapshot = {
      observedAt: new Date(0).toISOString(),
      player: 'HEALTHY' as const,
      chromium: 'HEALTHY' as const,
      renderResponsive: true,
      cache: 'HEALTHY' as const,
      emergencyActive: false,
      lastActivatedSequence: 1,
    };
    expect(watchdog.evaluate(snapshot, new Date(120_001))).toEqual({
      action: 'CIRCUIT_OPEN',
      reason: 'HEALTH_TIMESTAMP_STALE',
    });
    expect(
      watchdog.evaluate(
        { ...snapshot, observedAt: new Date(240_001).toISOString() },
        new Date(120_000),
      ),
    ).toEqual({
      action: 'CIRCUIT_OPEN',
      reason: 'HEALTH_TIMESTAMP_STALE',
    });
  });

  it('connects the watchdog to bounded live recovery handlers', async () => {
    const actions: string[] = [];
    const controller = new RuntimeWatchdogController(
      new OperationalWatchdog(1, 60_000, 0),
      {
        snapshot: () =>
          Promise.resolve({
            observedAt: new Date(0).toISOString(),
            player: 'HEALTHY',
            chromium: 'FAILED',
            renderResponsive: false,
            cache: 'HEALTHY',
            emergencyActive: true,
            lastActivatedSequence: 8,
          }),
        restartChromium: () => {
          actions.push('restart');
          return Promise.resolve();
        },
        failPlayer: () => {
          actions.push('fail');
          return Promise.resolve();
        },
        audit: (decision) => {
          actions.push(decision.action);
          return Promise.resolve();
        },
      },
    );
    await controller.tick(new Date(0));
    await controller.tick(new Date(1));
    expect(actions).toEqual([
      'RESTART_CHROMIUM',
      'restart',
      'CIRCUIT_OPEN',
      'fail',
    ]);
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

  it('rejects empty, duplicate, escaping and symbolic runtime entries', async () => {
    const trusted = join(root, 'trusted');
    const outside = join(root, 'outside.js');
    await writeFile(outside, 'outside');
    await writeFile(join(root, 'placeholder'), 'placeholder');
    await mkdir(trusted);
    const path = join(trusted, 'player.js');
    await writeFile(path, 'trusted');
    const sha256 = createHash('sha256').update('trusted').digest('hex');
    await expect(verifyRuntimeIntegrity(trusted, [])).rejects.toThrow(
      'RUNTIME_INTEGRITY_MANIFEST_EMPTY',
    );
    await expect(
      verifyRuntimeIntegrity(trusted, [
        { path: 'player.js', sha256 },
        { path: 'player.js', sha256 },
      ]),
    ).rejects.toThrow('RUNTIME_INTEGRITY_MANIFEST_INVALID');
    await expect(
      verifyRuntimeIntegrity(trusted, [{ path: '../outside.js', sha256 }]),
    ).rejects.toThrow('RUNTIME_INTEGRITY_MANIFEST_INVALID');
    if (process.platform !== 'win32') {
      await symlink(outside, join(trusted, 'linked.js'));
      await expect(
        verifyRuntimeIntegrity(trusted, [{ path: 'linked.js', sha256 }]),
      ).rejects.toThrow('RUNTIME_INTEGRITY_SCOPE_ESCAPE');
    }
  });

  it('requires an authenticated, current runtime manifest', async () => {
    const pair = generateKeyPairSync('ed25519');
    await writeFile(join(root, 'player.js'), 'trusted');
    const payload = {
      version: 1 as const,
      authorityKeyId: 'release-root',
      runtimeVersion: '06d-fix',
      validFrom: new Date(0).toISOString(),
      validUntil: new Date(10_000).toISOString(),
      entries: [
        {
          path: 'player.js',
          sha256: createHash('sha256').update('trusted').digest('hex'),
        },
      ],
    };
    const manifest = {
      payload,
      signature: sign(
        null,
        Buffer.from(canonicalize(payload)),
        pair.privateKey,
      ).toString('base64'),
    };
    const authority = {
      keyId: 'release-root',
      publicKeyPem: pair.publicKey
        .export({ type: 'spki', format: 'pem' })
        .toString(),
    };
    await expect(
      verifyAuthenticatedRuntimeManifest(
        root,
        manifest,
        authority,
        '06d-fix',
        new Date(1),
      ),
    ).resolves.toBeUndefined();
    await expect(
      verifyAuthenticatedRuntimeManifest(
        root,
        { ...manifest, signature: Buffer.alloc(64).toString('base64') },
        authority,
        '06d-fix',
        new Date(1),
      ),
    ).rejects.toThrow('RUNTIME_INTEGRITY_SIGNATURE_INVALID');
    await expect(
      verifyAuthenticatedRuntimeManifest(
        root,
        manifest,
        authority,
        'old',
        new Date(1),
      ),
    ).rejects.toThrow('RUNTIME_INTEGRITY_MANIFEST_INVALID');
  });

  it('preserves known revocations with integrity while offline', async () => {
    const path = join(root, 'revocations.json');
    const store = new KnownRevocationStore(
      path,
      Buffer.alloc(32, 9),
      new FileMonotonicAnchor(join(root, 'anchor.json'), Buffer.alloc(32, 10)),
    );
    await store.write(['version-b', 'version-a', 'version-a'], new Date(100));
    const firstVersion = await readFile(path, 'utf8');
    await expect(store.read()).resolves.toMatchObject({
      updatedAt: new Date(100).toISOString(),
    });
    expect([...(await store.read()).ids]).toEqual(['version-a', 'version-b']);
    await store.write(['version-a', 'version-b', 'version-d'], new Date(200));
    await writeFile(path, firstVersion);
    await expect(store.read()).rejects.toThrow('REVOCATION_STORE_ROLLBACK');
    await store.write(['version-a', 'version-b', 'version-d'], new Date(200));
    const raw = await readFile(path, 'utf8');
    await writeFile(path, raw.replace('version-a', 'version-c'));
    await expect(store.read()).rejects.toThrow(
      'REVOCATION_STORE_INTEGRITY_FAILED',
    );
  });
});
