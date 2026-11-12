import { createServer, Server } from 'node:http';
import { spawn } from 'node:child_process';
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  type KeyObject,
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
  private readonly privateKey: KeyObject;
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

/**
 * Production adapter for an OS/TPM/PKCS#11 signer. The private key remains in
 * the provider process; only the payload and resulting signature cross IPC.
 */
export class CommandDeviceKeyStore implements DeviceKeyStore {
  constructor(
    private readonly id: string,
    private readonly publicKey: string,
    private readonly command: string,
    private readonly commandArgs: string[] = [],
    private readonly providerHardwareBacked = true,
  ) {
    if (!id || !command) throw new Error('DEVICE_SIGNER_CONFIGURATION_INVALID');
    const parsed = createPublicKey(publicKey);
    if (parsed.asymmetricKeyType !== 'ed25519')
      throw new Error('DEVICE_KEY_INVALID');
  }
  keyId() {
    return Promise.resolve(this.id);
  }
  publicKeyPem() {
    return Promise.resolve(this.publicKey);
  }
  hardwareBacked() {
    return this.providerHardwareBacked;
  }
  sign(payload: Uint8Array): Promise<string> {
    return new Promise((resolveSignature, reject) => {
      const child = spawn(this.command, this.commandArgs, {
        stdio: ['pipe', 'pipe', 'ignore'],
        windowsHide: true,
        timeout: 10_000,
      });
      const chunks: Buffer[] = [];
      child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      child.once('error', () => reject(new Error('DEVICE_SIGNER_UNAVAILABLE')));
      child.once('close', (code) => {
        if (code !== 0) return reject(new Error('DEVICE_SIGNER_FAILED'));
        const signature = Buffer.concat(chunks).toString('utf8').trim();
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(signature))
          return reject(new Error('DEVICE_SIGNER_RESPONSE_INVALID'));
        resolveSignature(signature);
      });
      child.stdin.end(Buffer.from(payload).toString('base64'));
    });
  }
}

export interface ChromiumLauncher {
  launch(options: {
    headless: boolean;
    args: string[];
    defaultViewport: null;
  }): Promise<{
    newPage(): Promise<{
      goto(url: string): Promise<unknown>;
      setDefaultNavigationTimeout?(timeout: number): void;
      setRequestInterception?(enabled: boolean): Promise<void>;
      on?(
        event: 'request',
        handler: (request: InterceptedRequest) => void,
      ): unknown;
    }>;
    close(): Promise<void>;
  }>;
}

interface InterceptedRequest {
  url(): string;
  abort(): Promise<void>;
  continue(): Promise<void>;
}

export class LocalPlayerOrigin {
  private server?: Server;
  private allowedHost?: string;
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
      const remoteAddress = request.socket.remoteAddress;
      if (
        request.method !== 'GET' ||
        request.headers.host !== this.allowedHost ||
        !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress ?? '')
      ) {
        response.statusCode = 403;
        response.end();
        return;
      }
      if (request.url === '/render') {
        void (async () => {
          try {
            const bytes =
              typeof this.renderSource === 'string'
                ? await readFile(resolve(this.renderSource))
                : await this.renderSource();
            const prefix = bytes.subarray(0, 256).toString('utf8').trimStart();
            response.setHeader(
              'Content-Type',
              prefix.startsWith('<svg') || prefix.startsWith('<?xml')
                ? 'image/svg+xml'
                : 'image/webp',
            );
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
      if (request.url === '/') {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(
          '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"></head><body><main><img src="/render" alt="Plan CORO"></main></body></html>',
        );
        return;
      }
      response.statusCode = 404;
      response.end();
    });
    await new Promise<void>((resolveStart, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(0, '127.0.0.1', () => resolveStart());
    });
    const address = this.server.address();
    if (!address || typeof address === 'string')
      throw new Error('PLAYER_BIND_FAILED');
    this.allowedHost = `127.0.0.1:${address.port}`;
    return `http://127.0.0.1:${address.port}/`;
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolveStop, reject) =>
      this.server!.close((error) => (error ? reject(error) : resolveStop())),
    );
    this.server = undefined;
    this.allowedHost = undefined;
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
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-prompt-on-repost',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    '--password-store=basic',
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
  page.setDefaultNavigationTimeout?.(15_000);
  await page.setRequestInterception?.(true);
  page.on?.('request', (request) => {
    try {
      const requested = new URL(String(request.url()));
      const application = new URL(applicationUrl);
      if (requested.origin !== application.origin) void request.abort();
      else void request.continue();
    } catch {
      void request.abort();
    }
  });
  await page.goto(applicationUrl);
  return browser;
}
