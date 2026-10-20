import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { generateKeyPairSync, verify } from 'crypto';
import { OfflineDocumentsService } from './offline-documents.service';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
}));

describe('OfflineDocumentsService', () => {
  const previousKey = process.env.OFFLINE_LEASE_ED25519_PRIVATE_KEY;

  afterEach(() => {
    if (previousKey === undefined)
      delete process.env.OFFLINE_LEASE_ED25519_PRIVATE_KEY;
    else process.env.OFFLINE_LEASE_ED25519_PRIVATE_KEY = previousKey;
  });

  function harness() {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    process.env.OFFLINE_LEASE_ED25519_PRIVATE_KEY = privateKey
      .export({ format: 'pem', type: 'pkcs8' })
      .toString();
    process.env.OFFLINE_WEBAUTHN_RP_ID = 'localhost';
    process.env.OFFLINE_WEBAUTHN_ORIGIN = 'http://localhost:3003';
    const device = {
      id: 'device-a',
      clientUserId: 'client-a',
      organizationId: 'org-a',
      credentialIdHash: 'credential-hash',
      prfSupported: true,
      revokedAt: null,
    };
    const projectFile = {
      id: 'file-a',
      organizationId: 'org-a',
      version: 2,
      sha256: 'a'.repeat(64),
      lifecycleState: 'APPROVED',
      offlineClassification: 'NON_SENSITIVE_EMERGENCY',
      effectiveAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + 86_400_000),
      project: { buildingId: 'building-a' },
    };
    const prisma: any = {
      offlineDocumentDevice: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(device),
        upsert: jest.fn().mockResolvedValue(device),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      projectFile: { findFirst: jest.fn().mockResolvedValue(projectFile) },
      offlineDocumentLease: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      offlineDocumentAuditEvent: { upsert: jest.fn() },
    };
    return {
      service: new OfflineDocumentsService(prisma),
      prisma,
      publicKey,
      projectFile,
    };
  }

  it('requires fresh MFA and proven PRF for device registration', async () => {
    const h = harness();
    await expect(
      h.service.registerDevice({
        clientUserId: 'client-a',
        organizationId: 'org-a',
        mfaVerifiedAt: null,
        credentialId: 'abcdefghijklmnop',
        label: 'Chrome',
        prfSupported: true,
        registrationResponse: {} as never,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      h.service.registerDevice({
        clientUserId: 'client-a',
        organizationId: 'org-a',
        mfaVerifiedAt: new Date().toISOString(),
        credentialId: 'abcdefghijklmnop',
        label: 'Chrome',
        prfSupported: false,
        registrationResponse: {} as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists a device only after a server-verified WebAuthn PRF ceremony', async () => {
    const h = harness();
    jest.mocked(generateRegistrationOptions).mockResolvedValue({
      challenge: 'challenge-a',
    } as never);
    jest.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        userVerified: true,
        credential: {
          id: 'abcdefghijklmnop',
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
          transports: ['internal'],
        },
      },
    } as never);
    await h.service.registrationOptions({
      clientUserId: 'client-a',
      email: 'client-a@example.test',
      displayName: 'Client A',
    });
    await h.service.registerDevice({
      clientUserId: 'client-a',
      organizationId: 'org-a',
      mfaVerifiedAt: new Date().toISOString(),
      credentialId: 'abcdefghijklmnop',
      label: 'Chrome',
      prfSupported: true,
      registrationResponse: {
        id: 'abcdefghijklmnop',
        rawId: 'abcdefghijklmnop',
        type: 'public-key',
        clientExtensionResults: { prf: { enabled: true } },
        response: {
          clientDataJSON: 'client-data',
          attestationObject: 'attestation',
          transports: ['internal'],
        },
      } as never,
    });
    expect(verifyRegistrationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: 'challenge-a',
        expectedOrigin: 'http://localhost:3003',
        expectedRPID: 'localhost',
        requireUserVerification: true,
      }),
    );
    expect(h.prisma.offlineDocumentDevice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          credentialPublicKey: Buffer.from([1, 2, 3]),
          webauthnVerifiedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('issues an Ed25519 lease bound to identity, building, version, hash and device for 24h', async () => {
    const h = harness();
    const result = await h.service.issueLease({
      clientUserId: 'client-a',
      organizationId: 'org-a',
      permittedBuildingIds: ['building-a'],
      deviceId: 'device-a',
      fileId: 'file-a',
    });
    expect(result.payload).toMatchObject({
      clientUserId: 'client-a',
      organizationId: 'org-a',
      buildingId: 'building-a',
      projectFileId: 'file-a',
      projectFileVersion: 2,
      documentSha256: 'a'.repeat(64),
      deviceId: 'device-a',
    });
    expect(
      new Date(result.payload.expiresAt).getTime() -
        new Date(result.payload.issuedAt).getTime(),
    ).toBe(86_400_000);
    expect(
      verify(
        null,
        Buffer.from(JSON.stringify(result.payload)),
        h.publicKey,
        Buffer.from(result.signature, 'base64'),
      ),
    ).toBe(true);
  });

  it('fails closed when the canonical query rejects classification, lifecycle or scope', async () => {
    const h = harness();
    h.prisma.projectFile.findFirst.mockResolvedValue(null);
    await expect(
      h.service.issueLease({
        clientUserId: 'client-a',
        organizationId: 'org-a',
        permittedBuildingIds: [],
        deviceId: 'device-a',
        fileId: 'file-a',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(h.prisma.offlineDocumentLease.create).not.toHaveBeenCalled();
  });

  it('publishes only the verification key and never the private key', () => {
    const h = harness();
    const config = h.service.getPublicConfiguration();
    expect(config).toMatchObject({
      available: true,
      algorithm: 'Ed25519',
      leaseMaxSeconds: 86400,
    });
    expect(config).toHaveProperty('publicKeySpki');
    expect(JSON.stringify(config)).not.toContain('PRIVATE KEY');
  });

  it('reconciles an authorized current lease and records an idempotent audit event', async () => {
    const h = harness();
    h.prisma.offlineDocumentLease.findMany.mockResolvedValue([
      {
        id: 'lease-row-a',
        leaseId: 'lease-a',
        expiresAt: new Date(Date.now() + 60_000),
        projectFileVersion: h.projectFile.version,
        documentSha256: h.projectFile.sha256,
        projectFile: h.projectFile,
      },
    ]);
    const result = await h.service.reconcile({
      clientUserId: 'client-a',
      organizationId: 'org-a',
      permittedBuildingIds: ['building-a'],
      deviceId: 'device-a',
      leaseIds: ['lease-a'],
      events: [
        {
          requestId: 'request-1234',
          leaseId: 'lease-a',
          eventType: 'OFFLINE_OPENED',
          occurredAt: new Date().toISOString(),
        },
      ],
    });
    expect(result.keep).toEqual(['lease-a']);
    expect(result.purge).toEqual([]);
    expect(h.prisma.offlineDocumentAuditEvent.upsert).toHaveBeenCalledTimes(1);
    expect(h.prisma.offlineDocumentLease.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'RECONCILED' }),
      }),
    );
  });

  it('purges a lease immediately after building access is revoked', async () => {
    const h = harness();
    h.prisma.offlineDocumentLease.findMany.mockResolvedValue([
      {
        id: 'lease-row-a',
        leaseId: 'lease-a',
        expiresAt: new Date(Date.now() + 60_000),
        projectFileVersion: h.projectFile.version,
        documentSha256: h.projectFile.sha256,
        projectFile: h.projectFile,
      },
    ]);
    const result = await h.service.reconcile({
      clientUserId: 'client-a',
      organizationId: 'org-a',
      permittedBuildingIds: [],
      deviceId: 'device-a',
      leaseIds: ['lease-a'],
      events: [],
    });
    expect(result.keep).toEqual([]);
    expect(result.purge).toEqual(['lease-a']);
    expect(h.prisma.offlineDocumentLease.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REVOKED' }),
      }),
    );
  });

  it('rejects an audit event that is not bound to the authenticated device lease', async () => {
    const h = harness();
    await expect(
      h.service.reconcile({
        clientUserId: 'client-a',
        organizationId: 'org-a',
        permittedBuildingIds: ['building-a'],
        deviceId: 'device-a',
        leaseIds: [],
        events: [
          {
            requestId: 'request-1234',
            leaseId: 'foreign-lease',
            eventType: 'OFFLINE_OPENED',
            occurredAt: new Date().toISOString(),
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(h.prisma.offlineDocumentAuditEvent.upsert).not.toHaveBeenCalled();
  });
});
