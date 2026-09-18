import {
  BadRequestException,
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

describe('PopulationService location resolution', () => {
  const prisma = {
    populationProgram: { findUnique: jest.fn() },
    rueFacilityProfile: { findUnique: jest.fn() },
    populationSubscriber: { findFirst: jest.fn() },
  };
  const geocoding = { geocode: jest.fn() };
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
    geocoding.geocode.mockResolvedValue({
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
    });
    service = new PopulationService(
      prisma as any,
      {} as any,
      {} as any,
      geocoding as any,
    );
  });

  it('returns only a confirmation address and an opaque token', async () => {
    const result = await service.resolveSubscriberLocation(
      'slug',
      'subscriber-1',
      dto(),
    );
    expect(Object.keys(result).sort()).toEqual(
      ['expiresAt', 'location', 'resolutionToken'].sort(),
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
    expect(first.resolutionToken).not.toBe(second.resolutionToken);
    expect(first.resolutionToken.split('.')[1]).not.toBe(
      second.resolutionToken.split('.')[1],
    );
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
    expect(geocoding.geocode).not.toHaveBeenCalled();
  });

  it('rejects incompatible access identities before geocoding', async () => {
    await expect(
      service.resolveSubscriberLocation('slug', 'subscriber-1', {
        ...dto(),
        accessToken: accessToken('subscriber-2'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(geocoding.geocode).not.toHaveBeenCalled();
  });

  it('sanitizes provider failures', async () => {
    geocoding.geocode.mockRejectedValue(
      new Error('123 Rue Principale H2X 1Y4 45.508 -73.561 secret'),
    );
    await expect(
      service.resolveSubscriberLocation('slug', 'subscriber-1', dto()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
