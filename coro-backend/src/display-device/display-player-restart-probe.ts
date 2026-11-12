import { writeFile } from 'node:fs/promises';
import type {
  PlayerDeviceIdentity,
  TrustedManifestKey,
} from '../display-player/player-contracts';
import { ConnectedPlayerService } from './connected-player-service';
import { LocalPlayerOrigin } from './connected-player-runtime';
import { EmergencyStateStore } from './persistent-runtime';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

async function main() {
  const identity = JSON.parse(
    required('DISPLAY_RESTART_IDENTITY_JSON'),
  ) as PlayerDeviceIdentity;
  const trustedKeys = JSON.parse(
    required('DISPLAY_RESTART_TRUSTED_KEYS_JSON'),
  ) as TrustedManifestKey[];
  const unavailableGateway = {
    manifest: () => Promise.reject(new Error('GATEWAY_OFFLINE')),
  };
  const player = new ConnectedPlayerService(
    identity,
    trustedKeys,
    required('DISPLAY_RESTART_CACHE_ROOT'),
    unavailableGateway as never,
  );
  const active = await player.restore();
  if (!active) throw new Error('RESTART_CACHE_NOT_RESTORED');
  const emergency = await new EmergencyStateStore(
    required('DISPLAY_RESTART_EMERGENCY_PATH'),
    Buffer.from(required('DISPLAY_RESTART_EMERGENCY_KEY_HEX'), 'hex'),
  ).read();
  if (!emergency) throw new Error('RESTART_EMERGENCY_NOT_RESTORED');
  player.setMode(emergency.mode);

  const origin = new LocalPlayerOrigin(() =>
    Promise.resolve(player.activeBytes()),
  );
  const url = await origin.start();
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    const naturalWidth = await page.$eval('img', (image) => image.naturalWidth);
    if (naturalWidth < 1) throw new Error('RESTART_CHROMIUM_RENDER_FAILED');
    await page.screenshot({
      path: required('DISPLAY_RESTART_SCREENSHOT_PATH'),
    });
    await writeFile(
      required('DISPLAY_RESTART_RESULT_PATH'),
      JSON.stringify({
        pid: process.pid,
        manifestSequence: active.manifest.payload.sequence,
        documentSha256: active.manifest.payload.documentSha256,
        emergencyMode: emergency.mode,
        chromiumNaturalWidth: naturalWidth,
      }),
    );
  } finally {
    await browser.close();
    await origin.stop();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : 'RESTART_PROBE_FAILED'}\n`,
  );
  process.exitCode = 1;
});
