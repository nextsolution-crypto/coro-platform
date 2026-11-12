/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { generateKeyPairSync } from 'node:crypto';
import { DisplayWebService } from './display-web.service';

describe('DisplayWebService security', () => {
  const location = {
    id: 'location-a',
    organizationId: 'org-a',
    buildingId: 'building-a',
    status: 'ACTIVE',
  };
  const tx: any = {
    $executeRaw: jest.fn(),
    displayLocation: { findUnique: jest.fn() },
    displayWebActivation: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    displayWebSession: { create: jest.fn() },
  };
  const prisma: any = {
    displayLocation: { findUnique: jest.fn() },
    $transaction: jest.fn((action: (client: any) => unknown) => action(tx)),
  };
  const authorization: any = { require: jest.fn() };
  const audit: any = { record: jest.fn() };
  const storage: any = { downloadPrivate: jest.fn() };
  const service = new DisplayWebService(prisma, authorization, audit, storage);
  const validPublicJwk = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  }).publicKey.export({ format: 'jwk' });

  beforeEach(() => jest.clearAllMocks());

  it('returns the same generic response for malformed and unknown public ids', async () => {
    await expect(service.publicStatus('not-an-id')).resolves.toEqual({
      available: false,
      activationRequired: false,
    });
    prisma.displayLocation.findUnique.mockResolvedValue(null);
    await expect(service.publicStatus('A'.repeat(18))).resolves.toEqual({
      available: false,
      activationRequired: false,
    });
  });

  it('does not expose a private plan before enrollment', async () => {
    prisma.displayLocation.findUnique.mockResolvedValue({
      id: location.id,
      status: 'ACTIVE',
      label: 'Corridor Est',
      floor: { name: 'Étage 3' },
    });
    await expect(service.publicStatus('A'.repeat(18))).resolves.toEqual({
      available: true,
      activationRequired: true,
      location: { label: 'Corridor Est', floor: 'Étage 3' },
      capability: 'WEB_VIEW_ONLY',
      emergencyEligible: false,
    });
  });

  it('persists a failed activation attempt and returns a generic refusal', async () => {
    tx.displayLocation.findUnique.mockResolvedValue(location);
    tx.displayWebActivation.findMany.mockResolvedValue([
      {
        id: 'activation-a',
        codeHash: '0'.repeat(64),
      },
    ]);
    await expect(
      service.activate('A'.repeat(18), {
        code: '123456',
        keyId: 'browser-key-a',
        publicKeyJwk: validPublicJwk,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tx.displayWebActivation.update).toHaveBeenCalledWith({
      where: { id: 'activation-a' },
      data: { failedAttempts: { increment: 1 } },
    });
    expect(tx.displayWebSession.create).not.toHaveBeenCalled();
  });

  it('rejects a JWK containing an exportable private component before database mutation', async () => {
    await expect(
      service.activate('A'.repeat(18), {
        code: '123456',
        keyId: 'browser-key-a',
        publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y', d: 'private' },
      }),
    ).rejects.toThrow('Clé navigateur invalide.');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects malformed P-256 coordinates before database mutation', async () => {
    await expect(
      service.activate('A'.repeat(18), {
        code: '123456',
        keyId: 'browser-key-a',
        publicKeyJwk: {
          kty: 'EC',
          crv: 'P-256',
          x: 'A'.repeat(43),
          y: 'A'.repeat(43),
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
