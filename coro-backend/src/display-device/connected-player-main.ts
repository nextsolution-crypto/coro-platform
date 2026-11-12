import puppeteer from 'puppeteer';
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
  const persistedEmergency = await emergency.read();
  if (persistedEmergency) player.setMode(persistedEmergency.mode);
  await player.restore();
  try {
    await synchronizeWithBackoff(player);
    await player.heartbeat('ONLINE');
  } catch (error) {
    if (!(await player.restore())) throw error;
    await player.heartbeat('DEGRADED').catch(() => undefined);
  }
  const origin = new LocalPlayerOrigin(async () => player.activeBytes());
  const url = await origin.start();
  const browser = await launchKioskPlayer(puppeteer, url);
  const shutdown = async () => {
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
