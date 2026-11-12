import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { get } from 'node:http';
import {
  launchKioskPlayer,
  LocalPlayerOrigin,
  SyntheticDeviceKeyStore,
} from './connected-player-runtime';
import { PLAYER_CSP } from './kiosk-policy';

describe('connected player runtime', () => {
  it('serves only a loopback origin with the effective restrictive CSP', async () => {
    const root = await mkdtemp(join(tmpdir(), 'coro-player-'));
    const render = join(root, 'render.webp');
    await writeFile(render, Buffer.from('synthetic-render'));
    const origin = new LocalPlayerOrigin(render);
    try {
      const url = await origin.start();
      expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
      const response = await new Promise<{
        csp?: string | string[];
        body: string;
      }>((resolve, reject) => {
        get(url, (result) => {
          const chunks: Buffer[] = [];
          result.on('data', (chunk) => chunks.push(chunk));
          result.on('end', () =>
            resolve({
              csp: result.headers['content-security-policy'],
              body: Buffer.concat(chunks).toString(),
            }),
          );
        }).on('error', reject);
      });
      expect(response.csp).toBe(PLAYER_CSP);
      expect(response.body).not.toContain('http://');
      expect(PLAYER_CSP).toContain("object-src 'none'");
      expect(PLAYER_CSP).not.toContain('unsafe-eval');
    } finally {
      await origin.stop();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('launches kiosk mode without unsafe flags or public debugging', async () => {
    const goto = jest.fn(async () => undefined);
    const launch = jest.fn(
      async (_options: {
        headless: boolean;
        args: string[];
        defaultViewport: null;
      }) => ({
        newPage: async () => ({ goto }),
        close: async () => undefined,
      }),
    );
    await launchKioskPlayer({ launch }, 'http://127.0.0.1:32123/');
    const options = launch.mock.calls[0]![0];
    expect(options.args).toContain('--kiosk');
    expect(options.args).not.toContain('--no-sandbox');
    expect(
      options.args.some((value: string) =>
        value.startsWith('--remote-debugging'),
      ),
    ).toBe(false);
    expect(goto).toHaveBeenCalledWith('http://127.0.0.1:32123/');
  });

  it('labels the local keystore as synthetic and never exports the private key', async () => {
    const store = new SyntheticDeviceKeyStore();
    expect(store.hardwareBacked()).toBe(false);
    expect(await store.publicKeyPem()).toContain('PUBLIC KEY');
    expect(Object.keys(store)).not.toContain('privateKey');
  });
});
