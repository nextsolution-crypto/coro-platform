import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { canonicalize } from '../display-player/manifest-validator';
import { DeviceGatewayService } from './device-gateway.service';

describe('DeviceGatewayService machine authentication', () => {
  const keys = generateKeyPairSync('ed25519');
  const publicKey = keys.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString();
  const device = {
    id: 'device-a',
    organizationId: 'org-a',
    buildingId: 'building-a',
    locationId: 'location-a',
    status: 'ACTIVE',
    publicKey,
    revokedAt: null,
  };

  function fixture() {
    const nonces = new Map<string, any>();
    const prisma: any = {
      displayDevice: {
        findUnique: jest.fn(async () => device),
        update: jest.fn(async () => device),
      },
      displayDeviceNonce: {
        create: jest.fn(async ({ data }: any) => {
          nonces.set(data.nonceHash, { ...data, consumedAt: null });
          return data;
        }),
        findUnique: jest.fn(async ({ where }: any) =>
          nonces.get(where.nonceHash),
        ),
        updateMany: jest.fn(async ({ where, data }: any) => {
          const nonce = [...nonces.values()].find(
            (entry) => entry.id === where.id,
          );
          if (!nonce || nonce.consumedAt) return { count: 0 };
          nonce.consumedAt = data.consumedAt;
          return { count: 1 };
        }),
      },
      displayDeviceEvent: { create: jest.fn(async ({ data }: any) => data) },
      $transaction: jest.fn(async (items: Promise<unknown>[]) =>
        Promise.all(items),
      ),
    };
    const service = new DeviceGatewayService(
      prisma,
      { downloadPrivate: jest.fn() } as any,
      { keyId: 'manifest-test', sign: jest.fn(async () => 'signature') },
    );
    return { service, prisma };
  }

  async function signedTelemetry(
    service: DeviceGatewayService,
    mutate: any = {},
  ) {
    const payload = {
      requestId: 'request-telemetry-0001',
      softwareVersion: '0.6.0-test',
      publicationId: 'publication-a',
      publicationVersion: 1,
      mode: 'NORMAL',
      errors: [],
      restartCount: 0,
      cacheHealth: 'HEALTHY',
    };
    const path = '/device-gateway/telemetry';
    const bodySha256 = createHash('sha256')
      .update(canonicalize(payload))
      .digest('hex');
    const challenge = await service.challenge({
      deviceId: device.id,
      operation: 'telemetry',
      method: 'POST',
      path,
      bodySha256,
    });
    const timestamp = new Date().toISOString();
    const statement = Buffer.from(
      [
        'CORO-DISPLAY-REQUEST',
        device.id,
        timestamp,
        challenge.nonce,
        'POST',
        path,
        bodySha256,
      ].join('\n'),
    );
    const proof = {
      deviceId: device.id,
      timestamp,
      nonce: challenge.nonce,
      method: 'POST',
      path,
      bodySha256,
      signature: sign(null, statement, keys.privateKey).toString('base64'),
      ...mutate,
    };
    return { dto: { ...payload, proof }, proof };
  }

  it('accepts an Ed25519 proof once and records declared telemetry separately', async () => {
    const { service, prisma } = fixture();
    const { dto } = await signedTelemetry(service);
    await expect(service.telemetry(dto as any)).resolves.toEqual({
      accepted: true,
      observation: 'DECLARED_NOT_PHYSICALLY_VERIFIED',
    });
    expect(prisma.displayDeviceEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'TELEMETRY_DECLARED' }),
      }),
    );
    await expect(service.telemetry(dto as any)).rejects.toThrow(
      'DEVICE_NONCE_INVALID',
    );
  });

  it('rejects a proof rebound to another path before consuming the nonce', async () => {
    const { service, prisma } = fixture();
    const { dto } = await signedTelemetry(service, {
      path: '/device-gateway/manifest',
    });
    await expect(service.telemetry(dto as any)).rejects.toThrow(
      'DEVICE_REQUEST_SCOPE_MISMATCH',
    );
    expect(prisma.displayDeviceNonce.updateMany).not.toHaveBeenCalled();
  });
});
