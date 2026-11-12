import puppeteer from 'puppeteer';
import {
  LocalPlayerOrigin,
  launchKioskPlayer,
} from './connected-player-runtime';

async function main() {
  const renderPath = process.env.CORO_DISPLAY_SYNTHETIC_RENDER_PATH;
  if (!renderPath)
    throw new Error('CORO_DISPLAY_SYNTHETIC_RENDER_PATH_REQUIRED');
  if (process.getuid?.() === 0) throw new Error('PLAYER_MUST_NOT_RUN_AS_ROOT');
  const origin = new LocalPlayerOrigin(renderPath);
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
