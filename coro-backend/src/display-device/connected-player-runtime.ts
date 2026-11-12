import { createServer, Server } from 'node:http';
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
} from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PLAYER_CSP, validateKioskLaunchConfiguration } from './kiosk-policy';

export interface DeviceKeyStore {
  keyId(): Promise<string>;
  publicKeyPem(): Promise<string>;
  sign(payload: Uint8Array): Promise<string>;
  hardwareBacked(): boolean;
}

/** Test/local-only adapter. It must never be presented as hardware-backed. */
export class SyntheticDeviceKeyStore implements DeviceKeyStore {
  private readonly pair = generateKeyPairSync('ed25519');
  private readonly id = createHash('sha256')
    .update(this.publicPem())
    .digest('hex')
    .slice(0, 32);

  keyId() {
    return Promise.resolve(this.id);
  }
  publicKeyPem() {
    return Promise.resolve(this.publicPem());
  }
  sign(payload: Uint8Array) {
    return Promise.resolve(
      sign(null, payload, this.pair.privateKey).toString('base64'),
    );
  }
  hardwareBacked() {
    return false;
  }
  private publicPem() {
    return this.pair.publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString();
  }
}

/** Process-local adapter. Production must replace it with an OS/hardware keystore. */
export class EnvironmentDeviceKeyStore implements DeviceKeyStore {
  private readonly privateKey;
  constructor(
    private readonly id: string,
    privateKeyPem: string,
  ) {
    this.privateKey = createPrivateKey(privateKeyPem);
    if (this.privateKey.asymmetricKeyType !== 'ed25519')
      throw new Error('DEVICE_KEY_INVALID');
  }
  keyId() {
    return Promise.resolve(this.id);
  }
  publicKeyPem() {
    return Promise.resolve(
      createPublicKey(this.privateKey)
        .export({ type: 'spki', format: 'pem' })
        .toString(),
    );
  }
  sign(payload: Uint8Array) {
    return Promise.resolve(
      sign(null, payload, this.privateKey).toString('base64'),
    );
  }
  hardwareBacked() {
    return false;
  }
}

export interface ChromiumLauncher {
  launch(options: {
    headless: boolean;
    args: string[];
    defaultViewport: null;
  }): Promise<{
    newPage(): Promise<{ goto(url: string): Promise<unknown> }>;
    close(): Promise<void>;
  }>;
}

export class LocalPlayerOrigin {
  private server?: Server;
  constructor(
    private readonly renderSource: string | (() => Promise<Buffer>),
  ) {}

  async start(): Promise<string> {
    if (this.server) throw new Error('PLAYER_ORIGIN_ALREADY_STARTED');
    this.server = createServer((request, response) => {
      response.setHeader('Content-Security-Policy', PLAYER_CSP);
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Referrer-Policy', 'no-referrer');
      response.setHeader('Cache-Control', 'no-store');
      if (request.url === '/render') {
        void (async () => {
          try {
            const bytes =
              typeof this.renderSource === 'string'
                ? await readFile(resolve(this.renderSource))
                : await this.renderSource();
            response.setHeader('Content-Type', 'image/webp');
            response.end(bytes);
          } catch {
            response.statusCode = 503;
            response.end();
          }
        })();
        return;
      }
      if (request.url === '/style.css') {
        response.setHeader('Content-Type', 'text/css; charset=utf-8');
        response.end(
          'html,body,main{width:100%;height:100%;margin:0;background:#000;overflow:hidden}main{display:flex;align-items:center;justify-content:center}img{display:block;width:100%;height:100%;object-fit:contain}',
        );
        return;
      }
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(
        '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"></head><body><main><img src="/render" alt="Plan CORO"></main></body></html>',
      );
    });
    await new Promise<void>((resolveStart, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(0, '127.0.0.1', () => resolveStart());
    });
    const address = this.server.address();
    if (!address || typeof address === 'string')
      throw new Error('PLAYER_BIND_FAILED');
    return `http://127.0.0.1:${address.port}/`;
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolveStop, reject) =>
      this.server!.close((error) => (error ? reject(error) : resolveStop())),
    );
    this.server = undefined;
  }
}

export async function launchKioskPlayer(
  launcher: ChromiumLauncher,
  applicationUrl: string,
) {
  const args = [
    '--kiosk',
    '--disable-extensions',
    '--disable-features=Translate,AutofillServerCommunication',
    '--no-first-run',
  ];
  validateKioskLaunchConfiguration({
    args,
    applicationUrl,
    localBindAddress: '127.0.0.1',
    devToolsEnabled: false,
    downloadsEnabled: false,
  });
  const browser = await launcher.launch({
    headless: false,
    args,
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.goto(applicationUrl);
  return browser;
}
