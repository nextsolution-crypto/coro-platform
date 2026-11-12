import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { get, request } from 'node:http';
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

  it('rejects DNS-rebinding hosts, non-GET methods and unknown paths', async () => {
    const origin = new LocalPlayerOrigin(Buffer.from('synthetic-render'));
    try {
      const url = await origin.start();
      const probe = (path: string, method = 'GET', host?: string) =>
        new Promise<number>((resolve, reject) => {
          const target = new URL(path, url);
          const req = request(
            target,
            { method, headers: host ? { host } : undefined },
            (response) => {
              response.resume();
              response.on('end', () => resolve(response.statusCode ?? 0));
            },
          );
          req.on('error', reject);
          req.end();
        });
      await expect(probe('/', 'GET', 'attacker.invalid')).resolves.toBe(403);
      await expect(probe('/', 'POST')).resolves.toBe(403);
      await expect(probe('/not-a-player-route')).resolves.toBe(404);
    } finally {
      await origin.stop();
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
