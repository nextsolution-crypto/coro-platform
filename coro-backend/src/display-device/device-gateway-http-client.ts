import { createHash } from 'node:crypto';
import { canonicalize } from '../display-player/manifest-validator';
import type { SignedPlayerDisplayManifest } from '../display-player/player-contracts';
import { deviceEnrollmentStatement } from './device-security';
import type { DeviceKeyStore } from './connected-player-runtime';

type Json = Record<string, unknown>;

export interface GatewayManifestResponse {
  syncId: string;
  publicationVersion: number;
  manifest: SignedPlayerDisplayManifest;
}

export interface SignedRevocationRegistry {
  keyId: string;
  algorithm: 'Ed25519';
  payload: {
    schemaVersion: 1;
    organizationId: string;
    buildingId: string;
    issuedAt: string;
    documentVersionIds: string[];
  };
  signature: string;
}

export class DeviceGatewayHttpClient {
  private readonly base: URL;

  constructor(
    baseUrl: string,
    private readonly deviceId: string,
    private readonly keyStore: DeviceKeyStore,
    private readonly timeoutMs = 10_000,
  ) {
    this.base = new URL(baseUrl);
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(
      this.base.hostname,
    );
    if (
      this.base.protocol !== 'https:' &&
      !(loopback && this.base.protocol === 'http:')
    )
      throw new Error('GATEWAY_TLS_REQUIRED');
    if (
      this.base.username ||
      this.base.password ||
      this.base.search ||
      this.base.hash
    )
      throw new Error('GATEWAY_URL_INVALID');
  }

  async enroll(input: {
    invitationId: string;
    token: string;
    softwareVersion: string;
    requestId: string;
  }) {
    const keyId = await this.keyStore.keyId();
    const publicKeyPem = await this.keyStore.publicKeyPem();
    const signature = await this.keyStore.sign(
      deviceEnrollmentStatement({
        invitationId: input.invitationId,
        deviceId: this.deviceId,
        keyId,
      }),
    );
    return this.postJson('/device-gateway/enroll', {
      ...input,
      deviceId: this.deviceId,
      keyId,
      publicKeyPem,
      signature,
    });
  }

  manifest(requestId: string): Promise<GatewayManifestResponse> {
    return this.signedPost('/device-gateway/manifest', { requestId });
  }

  revocations(requestId: string): Promise<SignedRevocationRegistry> {
    return this.signedPost('/device-gateway/revocations', { requestId });
  }

  async render(publicationId: string, requestId: string): Promise<Buffer> {
    const path = `/device-gateway/renders/${encodeURIComponent(publicationId)}`;
    const response = await this.signedRequest(path, { requestId });
    return Buffer.from(await response.arrayBuffer());
  }

  confirm(payload: Json) {
    return this.signedPost('/device-gateway/sync/confirm', payload);
  }

  heartbeat(payload: Json) {
    return this.signedPost('/device-gateway/heartbeat', payload);
  }

  reconcileEvents(payload: Json) {
    return this.signedPost<{ acceptedIds: string[]; classification: string }>(
      '/device-gateway/events/reconcile',
      payload,
    );
  }

  private async signedPost<T>(path: string, payload: Json): Promise<T> {
    const response = await this.signedRequest(path, payload);
    return (await response.json()) as T;
  }

  private async signedRequest(path: string, payload: Json): Promise<Response> {
    const bodySha256 = createHash('sha256')
      .update(canonicalize(payload))
      .digest('hex');
    const challenge = await this.postJson<{
      nonce: string;
      expiresAt: string;
    }>('/device-gateway/challenge', {
      deviceId: this.deviceId,
      operation: path,
      method: 'POST',
      path,
      bodySha256,
    });
    if (Date.parse(challenge.expiresAt) <= Date.now())
      throw new Error('GATEWAY_CHALLENGE_EXPIRED');
    const timestamp = new Date().toISOString();
    const statement = Buffer.from(
      [
        'CORO-DISPLAY-REQUEST',
        this.deviceId,
        timestamp,
        challenge.nonce,
        'POST',
        path,
        bodySha256,
      ].join('\n'),
    );
    const proof = {
      deviceId: this.deviceId,
      timestamp,
      nonce: challenge.nonce,
      method: 'POST',
      path,
      bodySha256,
      signature: await this.keyStore.sign(statement),
    };
    return this.request(path, { ...payload, proof });
  }

  private async postJson<T = Json>(path: string, payload: Json): Promise<T> {
    const response = await this.request(path, payload);
    return (await response.json()) as T;
  }

  private async request(path: string, payload: Json): Promise<Response> {
    const url = new URL(path, this.base);
    if (url.origin !== this.base.origin)
      throw new Error('GATEWAY_ORIGIN_ESCAPE');
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'error',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`GATEWAY_HTTP_${response.status}`);
    return response;
  }
}
