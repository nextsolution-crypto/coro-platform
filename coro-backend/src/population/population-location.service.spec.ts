import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PopulationProgramStatus,
  PopulationSubscriberStatus,
  RueAssessmentStatus,
} from '@prisma/client';
import { createCipheriv, createHmac, randomBytes } from 'crypto';
import { PopulationService } from './population.service';

const ACCESS_SECRET = 'test-population-access-secret-not-for-production';
const KEY = Buffer.alloc(32, 7);
const PURPOSE = 'POPULATION_LOCATION_RESOLUTION';
const aad = Buffer.from(`CORO:${PURPOSE}:v1`);
const SELECTION_PURPOSE = 'POPULATION_LOCATION_SELECTION';
const selectionAad = Buffer.from(`CORO:${SELECTION_PURPOSE}:v1`);

describe('PopulationService location resolution', () => {
  const prisma = {
    populationProgram: { findUnique: jest.fn() },
    rueFacilityProfile: { findUnique: jest.fn() },
    populationSubscriber: { findFirst: jest.fn(), updateMany: jest.fn() },
  };
  const geocoding = { geocodeCandidates: jest.fn() };
  const readiness = {
    assertAccessReady: jest.fn(),
    assertLocationTokenReady: jest.fn(),
    assertGeocodingReady: jest.fn(),
  };
  let service: PopulationService;
  const accessToken = (
    subscriberId = 'subscriber-1',
    programId = 'program-1',
  ) => {
    const data = Buffer.from(
      JSON.stringify({ subscriberId, programId, exp: Date.now() + 60_000 }),
    ).toString('base64url');
    return `${data}.${createHmac('sha256', ACCESS_SECRET).update(data).digest('base64url')}`;
  };
  const resolutionToken = (
    overrides: Record<string, unknown> = {},
    key = KEY,
  ) => {
    const payload = {
      purpose: PURPOSE,
      subscriberId: 'subscriber-1',
      programId: 'program-1',
      latitude: 45.508,
      longitude: -73.561,
      iat: Date.now(),
      exp: Date.now() + 600_000,
      jti: 'test-jti',
      ...overrides,
    };
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(payload)),
      cipher.final(),
    ]);
    return [
      'v1',
      iv.toString('base64url'),
      encrypted.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
    ].join('.');
  };
  const selectionToken = (overrides: Record<string, unknown> = {}) => {
    const payload = {
      purpose: SELECTION_PURPOSE,
      subscriberId: 'subscriber-1',
      programId: 'program-1',
      latitude: 45.508,
      longitude: -73.561,
      normalizedAddress: {
        addressLine: '123 Rue Principale',
        city: 'Montreal',
        province: 'QC',
        country: 'CA',
      },
      iat: Date.now(),
      exp: Date.now() + 600_000,
      jti: 'selection-jti',
      ...overrides,
    };
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', KEY, iv);
    cipher.setAAD(selectionAad);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(payload)),
      cipher.final(),
    ]);
    return ['v1', iv.toString('base64url'), encrypted.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
  };
  const dto = () => ({
    accessToken: accessToken(),
    addressLine: '123 Rue Principale',
    city: 'Montreal',
    province: 'QC' as const,
    postalCode: 'H2X 1Y4',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.POPULATION_ACCESS_SECRET = ACCESS_SECRET;
    process.env.POPULATION_LOCATION_TOKEN_SECRET = KEY.toString('base64');
    prisma.populationProgram.findUnique.mockResolvedValue({
      id: 'program-1',
      rueFacilityProfile: { buildingId: 'building-1' },
    });
    prisma.rueFacilityProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      buildingId: 'building-1',
      assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
      populationProgram: {
        id: 'program-1',
        status: PopulationProgramStatus.ACTIVE,
      },
    });
    prisma.populationSubscriber.findFirst.mockResolvedValue({
      id: 'subscriber-1',
      status: PopulationSubscriberStatus.ACTIVE,
    });
    prisma.populationSubscriber.updateMany.mockResolvedValue({ count: 1 });
    geocoding.geocodeCandidates.mockResolvedValue([{
      latitude: 45.508,
      longitude: -73.561,
      normalizedAddress: {
        addressLine: '123 Rue Principale',
        city: 'Montreal',
        province: 'QC',
        postalCode: 'H2X 1Y4',
        country: 'CA',
      },
      provider: 'MOCK',
    }]);
    service = new PopulationService(
      prisma as any,
      {} as any,
      {} as any,
      geocoding as any,
      readiness as any,
      {} as any,
    );
  });

  it('returns only a confirmation address and an opaque token', async () => {
    const result = await service.resolveSubscriberLocation(
      'slug',
      'subscriber-1',
      dto(),
    );
    expect(result.status).toBe('RESOLVED');
    if (result.status !== 'RESOLVED') throw new Error('Expected RESOLVED');
    expect(Object.keys(result).sort()).toEqual(
      ['expiresAt', 'location', 'resolutionToken', 'status'].sort(),
    );
    expect(result.location).toMatchObject({
      postalCode: 'H2X 1Y4',
      country: 'CA',
    });
    const [, , ciphertext] = result.resolutionToken.split('.');
    expect(() =>
      JSON.parse(Buffer.from(ciphertext, 'base64url').toString()),
    ).toThrow();
    for (const value of [
      '45.508',
      '-73.561',
      '123 Rue Principale',
      'Montreal',
      'H2X 1Y4',
    ])
      expect(result.resolutionToken).not.toContain(value);
    expect(
      JSON.stringify(result).replace(JSON.stringify(result.location), ''),
    ).not.toMatch(/latitude|longitude|provider|raw|coordinates|geometry/);
  });

  it('decrypts the bound IDs and coordinates on the backend', async () => {
    const result = await service.resolveSubscriberLocation(
      'slug',
      'subscriber-1',
      dto(),
    );
    if (result.status !== 'RESOLVED') throw new Error('Expected RESOLVED');
    const payload = service.verifyLocationResolutionToken(
      result.resolutionToken,
      'subscriber-1',
      'program-1',
    );
    expect(payload).toMatchObject({
      purpose: PURPOSE,
      subscriberId: 'subscriber-1',
      programId: 'program-1',
      latitude: 45.508,
      longitude: -73.561,
    });
    expect(payload).not.toHaveProperty('normalizedAddress');
    expect(payload.exp - payload.iat).toBe(600_000);
  });

  it('uses a random IV for identical resolutions', async () => {
    const first = await service.resolveSubscriberLocation(
      'slug',
      'subscriber-1',
      dto(),
    );
    const second = await service.resolveSubscriberLocation(
      'slug',
      'subscriber-1',
      dto(),
    );
    if (first.status !== 'RESOLVED' || second.status !== 'RESOLVED') {
      throw new Error('Expected RESOLVED');
    }
    expect(first.resolutionToken).not.toBe(second.resolutionToken);
    expect(first.resolutionToken.split('.')[1]).not.toBe(
      second.resolutionToken.split('.')[1],
    );
  });

  it('returns sanitized opaque choices for multiple candidates', async () => {
    geocoding.geocodeCandidates.mockResolvedValue([
      {
        latitude: 45.508,
        longitude: -73.561,
        normalizedAddress: {
          addressLine: '123 Rue Principale', city: 'Montreal', province: 'QC', postalCode: 'H2X 1Y4', country: 'CA',
        },
        provider: 'MAPBOX',
      },
      {
        latitude: 45.509,
        longitude: -73.562,
        normalizedAddress: {
          addressLine: '125 Rue Principale', city: 'Montreal', province: 'QC', postalCode: 'H2X 1Y4', country: 'CA',
        },
        provider: 'MAPBOX',
      },
    ]);

    const result = await service.resolveSubscriberLocation(
      'slug',
      'subscriber-1',
      dto(),
    );
    expect(result.status).toBe('SELECTION_REQUIRED');
    if (result.status !== 'SELECTION_REQUIRED') throw new Error('Expected selection');
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0]).toEqual({
      label: '123 Rue Principale',
      locality: 'Montreal, QC H2X 1Y4',
      selectionToken: expect.any(String),
    });
    const publicCandidates = result.candidates.map(
      ({ selectionToken: _selectionToken, ...candidate }) => candidate,
    );
    expect(JSON.stringify(publicCandidates)).not.toMatch(
      /latitude|longitude|provider|mapbox|coordinates|geometry|raw/i,
    );
    expect(result.candidates[0].selectionToken).not.toContain('45.508');
    expect(prisma.populationSubscriber.updateMany).not.toHaveBeenCalled();
  });

  it('turns a valid selection into a resolution without geocoding or persistence', async () => {
    geocoding.geocodeCandidates.mockResolvedValue([
      {
        latitude: 45.508,
        longitude: -73.561,
        normalizedAddress: {
          addressLine: '123 Rue Principale', city: 'Montreal', province: 'QC', postalCode: 'H2X 1Y4', country: 'CA',
        },
        provider: 'MAPBOX',
      },
      {
        latitude: 45.509,
        longitude: -73.562,
        normalizedAddress: {
          addressLine: '125 Rue Principale', city: 'Montreal', province: 'QC', postalCode: 'H2X 1Y4', country: 'CA',
        },
        provider: 'MAPBOX',
      },
    ]);
    const choices = await service.resolveSubscriberLocation('slug', 'subscriber-1', dto());
    if (choices.status !== 'SELECTION_REQUIRED') throw new Error('Expected selection');
    geocoding.geocodeCandidates.mockClear();

    const selected = await service.selectSubscriberLocation('slug', 'subscriber-1', {
      accessToken: accessToken(),
      selectionToken: choices.candidates[0].selectionToken,
    });
    expect(selected).toMatchObject({
      status: 'RESOLVED',
      location: { addressLine: '123 Rue Principale', country: 'CA' },
      resolutionToken: expect.any(String),
      expiresAt: expect.any(String),
    });
    expect(geocoding.geocodeCandidates).not.toHaveBeenCalled();
    expect(prisma.populationSubscriber.updateMany).not.toHaveBeenCalled();
  });

  it('rejects modified selection and incompatible access identity', async () => {
    geocoding.geocodeCandidates.mockResolvedValue([
      { latitude: 45.508, longitude: -73.561, normalizedAddress: { addressLine: '123 Rue Principale', city: 'Montreal', province: 'QC', country: 'CA' }, provider: 'MAPBOX' },
      { latitude: 45.509, longitude: -73.562, normalizedAddress: { addressLine: '125 Rue Principale', city: 'Montreal', province: 'QC', country: 'CA' }, provider: 'MAPBOX' },
    ]);
    const choices = await service.resolveSubscriberLocation('slug', 'subscriber-1', dto());
    if (choices.status !== 'SELECTION_REQUIRED') throw new Error('Expected selection');
    const token = choices.candidates[0].selectionToken;
    const parts = token.split('.');
    parts[2] = `${parts[2][0] === 'A' ? 'B' : 'A'}${parts[2].slice(1)}`;
    const modified = parts.join('.');

    await expect(
      service.selectSubscriberLocation('slug', 'subscriber-1', {
        accessToken: accessToken(), selectionToken: modified,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.selectSubscriberLocation('slug', 'subscriber-1', {
        accessToken: accessToken('subscriber-2'), selectionToken: token,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.populationSubscriber.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    [
      'wrong secret',
      () => {
        process.env.POPULATION_LOCATION_TOKEN_SECRET = Buffer.alloc(
          32,
          8,
        ).toString('base64');
        return resolutionToken();
      },
    ],
    [
      'modified ciphertext',
      () => {
        const p = resolutionToken().split('.');
        p[2] = `${p[2][0] === 'A' ? 'B' : 'A'}${p[2].slice(1)}`;
        return p.join('.');
      },
    ],
    [
      'modified tag',
      () => {
        const p = resolutionToken().split('.');
        p[3] = `${p[3][0] === 'A' ? 'B' : 'A'}${p[3].slice(1)}`;
        return p.join('.');
      },
    ],
    ['truncated', () => resolutionToken().slice(0, -8)],
    ['expired', () => resolutionToken({ exp: Date.now() - 1 })],
    ['wrong purpose', () => resolutionToken({ purpose: 'POPULATION_ACCESS' })],
    [
      'wrong subscriber',
      () => resolutionToken({ subscriberId: 'subscriber-2' }),
    ],
    ['wrong program', () => resolutionToken({ programId: 'program-2' })],
    ['access token', () => accessToken()],
  ])('rejects %s', (_label, token) => {
    expect(() =>
      service.verifyLocationResolutionToken(
        token(),
        'subscriber-1',
        'program-1',
      ),
    ).toThrow(BadRequestException);
  });

  it.each([
    ['truncated', () => selectionToken().slice(0, -8)],
    ['expired', () => selectionToken({ exp: Date.now() - 1 })],
    ['wrong purpose', () => selectionToken({ purpose: PURPOSE })],
    ['wrong subscriber', () => selectionToken({ subscriberId: 'subscriber-2' })],
    ['wrong program', () => selectionToken({ programId: 'program-2' })],
  ])('rejects a selection token with %s', (_label, token) => {
    expect(() =>
      service.verifyLocationSelectionToken(
        token(),
        'subscriber-1',
        'program-1',
      ),
    ).toThrow(BadRequestException);
  });

  it.each([
    ['missing', undefined],
    ['invalid', 'dG9vLXNob3J0'],
    ['short hex', 'ab'.repeat(31)],
  ])('is unavailable with a %s secret', async (_label, secret) => {
    if (secret === undefined)
      delete process.env.POPULATION_LOCATION_TOKEN_SECRET;
    else process.env.POPULATION_LOCATION_TOKEN_SECRET = secret;
    await expect(
      service.resolveSubscriberLocation('slug', 'subscriber-1', dto()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(geocoding.geocodeCandidates).not.toHaveBeenCalled();
  });

  it('rejects incompatible access identities before geocoding', async () => {
    await expect(
      service.resolveSubscriberLocation('slug', 'subscriber-1', {
        ...dto(),
        accessToken: accessToken('subscriber-2'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(geocoding.geocodeCandidates).not.toHaveBeenCalled();
  });

  it('sanitizes provider failures', async () => {
    geocoding.geocodeCandidates.mockRejectedValue(
      new Error('123 Rue Principale H2X 1Y4 45.508 -73.561 secret'),
    );
    await expect(
      service.resolveSubscriberLocation('slug', 'subscriber-1', dto()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  describe('confirmation', () => {
    const confirm = (token = resolutionToken()) =>
      service.confirmSubscriberLocation('slug', 'subscriber-1', {
        accessToken: accessToken(),
        resolutionToken: token,
      });

    it('atomically persists only coordinates carried by the token', async () => {
      const issuedAt = Date.now() - 10;
      const result = await confirm(
        resolutionToken({ iat: issuedAt, exp: issuedAt + 600_000 }),
      );

      expect(prisma.populationSubscriber.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'subscriber-1',
          programId: 'program-1',
          status: PopulationSubscriberStatus.ACTIVE,
          OR: [
            { locationResolvedAt: null },
            { locationResolvedAt: { lt: new Date(issuedAt) } },
          ],
        },
        data: {
          latitude: 45.508,
          longitude: -73.561,
          locationSource: 'GEOCODED_ADDRESS',
          locationResolvedAt: new Date(issuedAt),
        },
      });
      expect(result).toEqual({
        confirmed: true,
        locationConfigured: true,
        resolvedAt: new Date(issuedAt).toISOString(),
      });
      expect(JSON.stringify(result)).not.toMatch(
        /latitude|longitude|address|postalCode|provider|coordinates|geometry|raw/,
      );
    });

    it('returns success when the same resolution was already persisted', async () => {
      const issuedAt = Date.now() - 10;
      prisma.populationSubscriber.updateMany.mockResolvedValue({ count: 0 });
      prisma.populationSubscriber.findFirst
        .mockResolvedValueOnce({ id: 'subscriber-1' })
        .mockResolvedValueOnce({
          latitude: 45.508,
          longitude: -73.561,
          locationResolvedAt: new Date(issuedAt),
        });

      await expect(
        confirm(resolutionToken({ iat: issuedAt, exp: issuedAt + 600_000 })),
      ).resolves.toMatchObject({ confirmed: true });
    });

    it('returns 409 and never overwrites a newer location', async () => {
      const issuedAt = Date.now() - 1000;
      prisma.populationSubscriber.updateMany.mockResolvedValue({ count: 0 });
      prisma.populationSubscriber.findFirst
        .mockResolvedValueOnce({ id: 'subscriber-1' })
        .mockResolvedValueOnce({
          latitude: 46,
          longitude: -72,
          locationResolvedAt: new Date(issuedAt + 500),
        });

      await expect(
        confirm(resolutionToken({ iat: issuedAt, exp: issuedAt + 600_000 })),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.populationSubscriber.updateMany).toHaveBeenCalledTimes(1);
    });

    it('requires both token types and an ACTIVE subscriber', async () => {
      await expect(
        service.confirmSubscriberLocation('slug', 'subscriber-1', {
          accessToken: resolutionToken(),
          resolutionToken: accessToken(),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      prisma.populationSubscriber.findFirst.mockResolvedValue(null);
      await expect(confirm()).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.populationSubscriber.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a program that is not operational', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
        populationProgram: {
          id: 'program-1',
          status: PopulationProgramStatus.SUSPENDED,
        },
      });
      await expect(confirm()).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.populationSubscriber.updateMany).not.toHaveBeenCalled();
    });

    it('returns 503 when the location secret is unavailable', async () => {
      delete process.env.POPULATION_LOCATION_TOKEN_SECRET;
      await expect(confirm()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(prisma.populationSubscriber.updateMany).not.toHaveBeenCalled();
    });
  });
});
