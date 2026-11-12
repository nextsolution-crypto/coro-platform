import puppeteer from 'puppeteer';
import { randomUUID } from 'node:crypto';
import type {
  PlayerDeviceIdentity,
  TrustedManifestKey,
} from '../display-player/player-contracts';
import { ConnectedPlayerService } from './connected-player-service';
import { DeviceGatewayHttpClient } from './device-gateway-http-client';
import {
  EnvironmentDeviceKeyStore,
  LocalPlayerOrigin,
  launchKioskPlayer,
} from './connected-player-runtime';
import { EmergencyStateStore } from './persistent-runtime';
import {
  DurableLocalJournal,
  KnownRevocationStore,
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
  const identity = JSON.parse(
    required('CORO_DISPLAY_DEVICE_IDENTITY_JSON'),
  ) as PlayerDeviceIdentity;
  const trustedKeys = JSON.parse(
    required('CORO_DISPLAY_TRUSTED_KEYS_JSON'),
  ) as TrustedManifestKey[];
  const keyStore = new EnvironmentDeviceKeyStore(
    required('CORO_DISPLAY_DEVICE_KEY_ID'),
    required('CORO_DISPLAY_DEVICE_PRIVATE_KEY_PEM'),
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
  const revocations = await new KnownRevocationStore(
    required('CORO_DISPLAY_REVOCATION_STATE_PATH'),
    Buffer.from(required('CORO_DISPLAY_REVOCATION_INTEGRITY_KEY_HEX'), 'hex'),
  ).read();
  await journal.append('BOOT', {
    softwareVersion: identity.softwareVersion,
    keyProvider: 'LEGACY_ENVIRONMENT',
    hardwareBacked: keyStore.hardwareBacked(),
  });
  const persistedEmergency = await emergency.read();
  if (persistedEmergency) player.setMode(persistedEmergency.mode);
  await player.restore(revocations.ids);
  try {
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
  const browser = await launchKioskPlayer(puppeteer, url);
  const shutdown = async () => {
    await journal.append('SHUTDOWN');
    await browser.close();
    await origin.stop();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'PLAYER_START_FAILED'}\n`,
  );
  process.exitCode = 1;
});
