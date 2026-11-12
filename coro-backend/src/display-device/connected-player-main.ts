import puppeteer from 'puppeteer';
import { createPublicKey, randomUUID, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type {
  PlayerDeviceIdentity,
  TrustedManifestKey,
} from '../display-player/player-contracts';
import { ConnectedPlayerService } from './connected-player-service';
import { DeviceGatewayHttpClient } from './device-gateway-http-client';
import {
  CommandDeviceKeyStore,
  LocalPlayerOrigin,
  launchKioskPlayer,
} from './connected-player-runtime';
import { EmergencyStateStore } from './persistent-runtime';
import { canonicalize } from '../display-player/manifest-validator';
import {
  DurableLocalJournal,
  FileMonotonicAnchor,
  KnownRevocationStore,
  OperationalWatchdog,
  RuntimeWatchdogController,
  verifyAuthenticatedRuntimeManifest,
  type AuthenticatedRuntimeManifest,
} from './operational-resilience';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

async function synchronizeWithBackoff(player: ConnectedPlayerService) {
  const delays = [0, 1_000, 3_000];
  let failure: unknown;
  for (const delay of delays) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      return await player.synchronize();
    } catch (error) {
      failure = error;
    }
  }
  throw failure;
}

function unreconciledPayload<T extends { reconciledAt?: string }>(value: T) {
  const copy = { ...value };
  delete copy.reconciledAt;
  return copy;
}

async function main() {
  if (process.getuid?.() === 0) throw new Error('PLAYER_MUST_NOT_RUN_AS_ROOT');
  const runtimeManifest = JSON.parse(
    await readFile(required('CORO_DISPLAY_RUNTIME_MANIFEST_PATH'), 'utf8'),
  ) as AuthenticatedRuntimeManifest;
  await verifyAuthenticatedRuntimeManifest(
    required('CORO_DISPLAY_RUNTIME_ROOT'),
    runtimeManifest,
    {
      keyId: required('CORO_DISPLAY_RUNTIME_AUTHORITY_KEY_ID'),
      publicKeyPem: required('CORO_DISPLAY_RUNTIME_AUTHORITY_PUBLIC_KEY_PEM'),
    },
    required('CORO_DISPLAY_SOFTWARE_VERSION'),
  );
  const identity = JSON.parse(
    required('CORO_DISPLAY_DEVICE_IDENTITY_JSON'),
  ) as PlayerDeviceIdentity;
  const trustedKeys = JSON.parse(
    required('CORO_DISPLAY_TRUSTED_KEYS_JSON'),
  ) as TrustedManifestKey[];
  const keyStore = new CommandDeviceKeyStore(
    required('CORO_DISPLAY_DEVICE_KEY_ID'),
    required('CORO_DISPLAY_DEVICE_PUBLIC_KEY_PEM'),
    required('CORO_DISPLAY_SIGNER_COMMAND'),
    JSON.parse(process.env.CORO_DISPLAY_SIGNER_ARGS_JSON ?? '[]') as string[],
    process.env.CORO_DISPLAY_SIGNER_HARDWARE_BACKED !== 'false',
  );
  const gateway = new DeviceGatewayHttpClient(
    required('CORO_DISPLAY_GATEWAY_URL'),
    identity.deviceId,
    keyStore,
  );
  const player = new ConnectedPlayerService(
    identity,
    trustedKeys,
    required('CORO_DISPLAY_CACHE_ROOT'),
    gateway,
  );
  const emergency = new EmergencyStateStore(
    required('CORO_DISPLAY_EMERGENCY_STATE_PATH'),
    Buffer.from(required('CORO_DISPLAY_EMERGENCY_INTEGRITY_KEY_HEX'), 'hex'),
  );
  const journal = new DurableLocalJournal(
    required('CORO_DISPLAY_LOCAL_JOURNAL_PATH'),
    Buffer.from(required('CORO_DISPLAY_JOURNAL_INTEGRITY_KEY_HEX'), 'hex'),
  );
  const revocationStore = new KnownRevocationStore(
    required('CORO_DISPLAY_REVOCATION_STATE_PATH'),
    Buffer.from(required('CORO_DISPLAY_REVOCATION_INTEGRITY_KEY_HEX'), 'hex'),
    new FileMonotonicAnchor(
      required('CORO_DISPLAY_REVOCATION_ANCHOR_PATH'),
      Buffer.from(required('CORO_DISPLAY_REVOCATION_ANCHOR_KEY_HEX'), 'hex'),
    ),
  );
  let revocations = await revocationStore.read();
  await journal.append('BOOT', {
    softwareVersion: identity.softwareVersion,
    keyProvider: 'EXTERNAL_NON_EXPORTABLE_SIGNER',
    hardwareBacked: keyStore.hardwareBacked(),
  });
  const persistedEmergency = await emergency.read();
  if (persistedEmergency) player.setMode(persistedEmergency.mode);
  await player.restore(revocations.ids);
  try {
    const registry = await gateway.revocations(`revocations-${randomUUID()}`);
    const authority = trustedKeys.find((key) => key.keyId === registry.keyId);
    if (
      !authority ||
      registry.algorithm !== 'Ed25519' ||
      registry.payload.organizationId !== identity.organizationId ||
      registry.payload.buildingId !== identity.buildingId ||
      Math.abs(Date.now() - Date.parse(registry.payload.issuedAt)) > 120_000 ||
      !verify(
        null,
        Buffer.from(canonicalize(registry.payload)),
        createPublicKey(authority.publicKeyPem),
        Buffer.from(registry.signature, 'base64'),
      )
    )
      throw new Error('REVOCATION_REGISTRY_INVALID');
    await revocationStore.write(registry.payload.documentVersionIds);
    revocations = await revocationStore.read();
    await player.restore(revocations.ids);
    await journal.append('REVOCATION', {
      count: revocations.ids.size,
      source: 'AUTHENTICATED_GATEWAY',
    });
    await synchronizeWithBackoff(player);
    await journal.append('SYNC', { result: 'SUCCESS' });
    await player.heartbeat('ONLINE');
    const pendingEvents = await journal.pending();
    if (pendingEvents.length) {
      const reconciliation = await gateway.reconcileEvents({
        requestId: `events-${randomUUID()}`,
        events: pendingEvents.map(unreconciledPayload),
      });
      await journal.acknowledge(new Set(reconciliation.acceptedIds));
    }
  } catch (error) {
    await journal.append('ERROR', {
      code: error instanceof Error ? error.message : 'SYNC_FAILED',
    });
    if (!(await player.restore(revocations.ids))) throw error;
    await journal.append('NETWORK_LOST', { fallback: 'VERIFIED_CACHE' });
    await player.heartbeat('DEGRADED').catch(() => undefined);
  }
  const origin = new LocalPlayerOrigin(() =>
    Promise.resolve(player.activeBytes()),
  );
  const url = await origin.start();
  let browser = await launchKioskPlayer(puppeteer, url);
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    watchdog.stop();
    await journal.append('SHUTDOWN');
    await browser.close();
    await origin.stop();
    if (process.exitCode === undefined) process.exitCode = 0;
  };
  const watchdog = new RuntimeWatchdogController(new OperationalWatchdog(), {
    snapshot: async () => {
      const connected =
        typeof (browser as unknown as { isConnected?: () => boolean })
          .isConnected === 'function'
          ? (browser as unknown as { isConnected: () => boolean }).isConnected()
          : true;
      let renderResponsive = false;
      try {
        const response = await fetch(new URL('/render', url), {
          signal: AbortSignal.timeout(5_000),
        });
        renderResponsive =
          response.ok && (await response.arrayBuffer()).byteLength > 0;
      } catch {
        /* watchdog records the degraded state */
      }
      return {
        observedAt: new Date().toISOString(),
        player: shuttingDown ? ('FAILED' as const) : ('HEALTHY' as const),
        chromium: connected ? ('HEALTHY' as const) : ('FAILED' as const),
        renderResponsive,
        cache: renderResponsive ? ('HEALTHY' as const) : ('DEGRADED' as const),
        emergencyActive: Boolean(await emergency.read()),
        lastActivatedSequence: 0,
      };
    },
    restartChromium: async (reason) => {
      await journal.append('RESTART', { component: 'CHROMIUM', reason });
      await browser.close().catch(() => undefined);
      browser = await launchKioskPlayer(puppeteer, url);
    },
    failPlayer: async (reason) => {
      await journal.append('CRASH', { component: 'PLAYER', reason });
      process.exitCode = 1;
      void shutdown();
    },
    audit: (decision) =>
      journal
        .append('ERROR', {
          watchdogAction: decision.action,
          reason: 'reason' in decision ? decision.reason : 'NONE',
        })
        .then(() => undefined),
  });
  watchdog.start();
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'PLAYER_START_FAILED'}\n`,
  );
  process.exitCode = 1;
});
