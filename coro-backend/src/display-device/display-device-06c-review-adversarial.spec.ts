import { generateKeyPairSync, sign } from 'node:crypto';
import {
  canonicalize,
  validateManifest,
} from '../display-player/manifest-validator';
import { DeviceGatewayService } from './device-gateway.service';

describe('DISPLAY-06C independent adversarial review', () => {
  const signingKeys = generateKeyPairSync('ed25519');
  const signingPublicKey = signingKeys.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString();
  const device = {
    id: 'device-review',
    organizationId: 'organization-review',
    buildingId: 'building-review',
    locationId: 'location-review',
    profile: 'WIDESCREEN_16X9',
    status: 'ACTIVE',
    publicKey: 'unused',
    revokedAt: null,
  };

  it('produces the exact signed Player contract accepted by the independent validator', async () => {
    const assignment = {
      id: 'assignment-review',
      publicationId: 'publication-review',
      profile: 'SCREEN_16X9',
    };
    const publication = {
      id: 'publication-review',
      projectFileId: 'project-file-review',
      sourceVersion: 4,
      versionNumber: 7,
      variantVersion: 3,
      variantSha256: 'a'.repeat(64),
      variantMimeType: 'image/webp',
      widthPixels: 3840,
      heightPixels: 2160,
    };
    const transaction = {
      displayDeviceAssignment: {
        findFirst: jest.fn().mockResolvedValue(assignment),
      },
      displayPlanPublication: {
        findFirst: jest.fn().mockResolvedValue(publication),
      },
      displayDeviceManifestSequence: {
        upsert: jest.fn().mockResolvedValue({ nextSequence: BigInt(2) }),
      },
      displayDeviceSync: {
        create: jest.fn().mockResolvedValue({ id: 'manifest-review' }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (operation: (tx: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    };
    const signer = {
      keyId: 'review-signing-key',
      sign: jest.fn(async (payload: unknown) =>
        sign(
          null,
          Buffer.from(
            // The production signer uses this same canonicalizer.
            canonicalize(payload),
          ),
          signingKeys.privateKey,
        ).toString('base64'),
      ),
    };
    const service = new DeviceGatewayService(
      prisma as never,
      {} as never,
      signer,
    );
    jest
      .spyOn(service as never, 'authenticate')
      .mockResolvedValue(device as never);

    const result = (await service.manifest({
      requestId: 'manifest-request-review',
      proof: {} as never,
    })) as Awaited<ReturnType<DeviceGatewayService['manifest']>>;

    expect(() =>
      validateManifest(result.manifest, {
        device: {
          deviceId: device.id,
          organizationId: device.organizationId,
          buildingId: device.buildingId,
          locationId: device.locationId,
          displayProfile: 'WIDESCREEN_16X9',
          softwareVersion: 'review',
        },
        trustedKeys: [
          {
            keyId: signer.keyId,
            publicKeyPem: signingPublicKey,
            activeFrom: new Date(Date.now() - 60_000).toISOString(),
          },
        ],
        now: new Date(),
        highestAcceptedSequence: 0,
        expectedAssignmentId: assignment.id,
      }),
    ).not.toThrow();
    expect(result.manifest.payload.renderReference).toBe(
      'private://device-gateway/renders/publication-review',
    );
  });

  it('refuses a late confirmation that would roll back the accepted sequence', async () => {
    const transaction = {
      displayDeviceSync: {
        findFirst: jest.fn().mockResolvedValue({ id: 'sync-old' }),
        updateMany: jest.fn(),
      },
      displayPlanPublication: {
        findFirst: jest.fn().mockResolvedValue({ id: 'publication-review' }),
      },
      displayDevice: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (operation: (tx: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    };
    const service = new DeviceGatewayService(prisma as never, {} as never, {
      keyId: 'review',
      sign: jest.fn(),
    });
    jest
      .spyOn(service as never, 'authenticate')
      .mockResolvedValue(device as never);

    await expect(
      service.confirm({
        requestId: 'confirm-old-sequence',
        syncId: 'sync-old',
        manifestSequence: 4,
        publicationId: 'publication-review',
        publicationVersion: 7,
        proof: {} as never,
      }),
    ).rejects.toThrow('SYNC_SEQUENCE_REPLAY_OR_ROLLBACK');
    expect(transaction.displayDeviceSync.updateMany).not.toHaveBeenCalled();
  });
});
