import { GeocodingError } from './geocoding.errors';
import { GeocodingProvider } from './geocoding-provider.interface';
import { GeocodingService } from './geocoding.service';
import {
  GeocodingAddress,
  GeocodingResult,
  ProviderGeocodingCandidate,
} from './geocoding.types';
import { MemoryGeocodingCache } from './memory-geocoding-cache';

const address: GeocodingAddress = {
  addressLine: '123 Rue Principale',
  city: 'Montréal',
  province: 'QC',
  postalCode: 'H2X 1Y4',
  country: 'CA',
};

const candidate: ProviderGeocodingCandidate = {
  latitude: 45.508,
  longitude: -73.561,
  normalizedAddress: {
    addressLine: '123 Rue Principale',
    city: 'Montréal',
    province: 'QC',
    postalCode: 'H2X 1Y4',
    country: 'CA',
  },
};

function providerWith(
  candidates = [candidate],
): jest.Mocked<GeocodingProvider> {
  return {
    name: 'mock-provider',
    geocode: jest.fn().mockResolvedValue({ candidates }),
  };
}

function expectCode(error: unknown, code: string): void {
  expect(error).toBeInstanceOf(GeocodingError);
  expect((error as GeocodingError).code).toBe(code);
}

describe('GeocodingService', () => {
  const originalTimeout = process.env.GEOCODING_TIMEOUT_MS;

  afterEach(() => {
    jest.useRealTimers();
    if (originalTimeout === undefined) {
      delete process.env.GEOCODING_TIMEOUT_MS;
    } else {
      process.env.GEOCODING_TIMEOUT_MS = originalTimeout;
    }
  });

  it('normalise une adresse canadienne sans transformation agressive', () => {
    const service = new GeocodingService(providerWith());
    expect(
      service.normalizeAddress({
        addressLine: '  123   Rue Principale  ',
        city: '  Montréal ',
        province: 'qc' as 'QC',
        postalCode: ' h2x1y4 ',
        country: 'ca' as 'CA',
      }),
    ).toEqual(address);
  });

  it.each([
    [{ ...address, addressLine: ' ' }, 'adresse vide'],
    [{ ...address, addressLine: 'x'.repeat(201) }, 'adresse trop longue'],
    [{ ...address, city: 'x'.repeat(101) }, 'ville trop longue'],
    [{ ...address, province: 'XX' as 'QC' }, 'province invalide'],
  ])('rejette une entrée invalide: %s', (invalidAddress) => {
    const service = new GeocodingService(providerWith());
    expect(() => service.normalizeAddress(invalidAddress)).toThrow(
      'GEOCODING_INVALID_INPUT',
    );
  });

  it('normalise raisonnablement le code postal', () => {
    const service = new GeocodingService(providerWith());
    expect(
      service.normalizeAddress({ ...address, postalCode: 'h2x1y4' }).postalCode,
    ).toBe('H2X 1Y4');
  });

  it('retourne uniquement le résultat interne contrôlé', async () => {
    const rawCandidate = { ...candidate, raw: { secret: 'provider-payload' } };
    const service = new GeocodingService(providerWith([rawCandidate]));
    const result = await service.geocode(address);

    expect(result).toEqual({ ...candidate, provider: 'mock-provider' });
    expect(result).not.toHaveProperty('raw');
    expect(JSON.stringify(result)).not.toContain('provider-payload');
  });

  it('rejette zéro résultat', async () => {
    await expect(
      new GeocodingService(providerWith([])).geocode(address),
    ).rejects.toMatchObject({
      code: 'GEOCODING_NO_RESULT',
    });
  });

  it('rejette plusieurs résultats', async () => {
    await expect(
      new GeocodingService(providerWith([candidate, candidate])).geocode(
        address,
      ),
    ).rejects.toMatchObject({ code: 'GEOCODING_AMBIGUOUS_RESULT' });
  });

  it('applique un timeout explicite au provider', async () => {
    jest.useFakeTimers();
    process.env.GEOCODING_TIMEOUT_MS = '25';
    const provider = providerWith();
    provider.geocode.mockReturnValue(new Promise(() => undefined));
    const promise = new GeocodingService(provider).geocode(address);
    const assertion = expect(promise).rejects.toMatchObject({
      code: 'GEOCODING_TIMEOUT',
    });

    await jest.advanceTimersByTimeAsync(25);
    await assertion;
    expect(provider.geocode).toHaveBeenCalledWith(address, { timeoutMs: 25 });
  });

  it('assainit les erreurs provider', async () => {
    const provider = providerWith();
    provider.geocode.mockRejectedValue(
      new Error(
        `Failure for ${address.addressLine} ${address.postalCode} api-key`,
      ),
    );

    try {
      await new GeocodingService(provider).geocode(address);
      fail('Expected geocoding to fail');
    } catch (error) {
      expectCode(error, 'GEOCODING_PROVIDER_UNAVAILABLE');
      expect(JSON.stringify(error)).not.toContain(address.addressLine);
      expect(JSON.stringify(error)).not.toContain(address.postalCode!);
      expect(JSON.stringify(error)).not.toContain('api-key');
    }
  });

  it.each([
    [Number.NaN, -73, 'coordonnée NaN'],
    [Number.POSITIVE_INFINITY, -73, 'coordonnée infinie'],
    [91, -73, 'latitude hors limites'],
    [45, -181, 'longitude hors limites'],
  ])('rejette un résultat invalide: %s', async (latitude, longitude) => {
    const provider = providerWith([{ ...candidate, latitude, longitude }]);
    await expect(
      new GeocodingService(provider).geocode(address),
    ).rejects.toMatchObject({
      code: 'GEOCODING_INVALID_RESULT',
    });
  });

  it('rejette un pays différent du Canada', async () => {
    const provider = providerWith([
      {
        ...candidate,
        normalizedAddress: { ...candidate.normalizedAddress, country: 'US' },
      },
    ]);
    await expect(
      new GeocodingService(provider).geocode(address),
    ).rejects.toMatchObject({
      code: 'GEOCODING_COUNTRY_MISMATCH',
    });
  });

  it('rejette une province incohérente', async () => {
    const provider = providerWith([
      {
        ...candidate,
        normalizedAddress: { ...candidate.normalizedAddress, province: 'ON' },
      },
    ]);
    await expect(
      new GeocodingService(provider).geocode(address),
    ).rejects.toMatchObject({
      code: 'GEOCODING_PROVINCE_MISMATCH',
    });
  });

  it('rejette une réponse provider incomplète', async () => {
    const provider = providerWith([
      {
        ...candidate,
        normalizedAddress: { ...candidate.normalizedAddress, province: '' },
      },
    ]);
    await expect(
      new GeocodingService(provider).geocode(address),
    ).rejects.toMatchObject({
      code: 'GEOCODING_INVALID_RESULT',
    });
  });

  it('retourne un cache hit sans rappeler le provider', async () => {
    const cache = new MemoryGeocodingCache({ secret: 'cache-secret' });
    const provider = providerWith();
    const service = new GeocodingService(provider, cache);

    await service.geocode(address);
    await service.geocode(address);
    expect(provider.geocode).toHaveBeenCalledTimes(1);
  });

  it('appelle le provider après un cache miss', async () => {
    const provider = providerWith();
    await new GeocodingService(
      provider,
      new MemoryGeocodingCache({ secret: 'cache-secret' }),
    ).geocode(address);
    expect(provider.geocode).toHaveBeenCalledTimes(1);
  });

  it('fonctionne sans cache', async () => {
    await expect(
      new GeocodingService(providerWith()).geocode(address),
    ).resolves.toMatchObject({
      latitude: candidate.latitude,
    });
  });

  it('échoue explicitement sans provider configuré', async () => {
    await expect(
      new GeocodingService(null).geocode(address),
    ).rejects.toMatchObject({
      code: 'GEOCODING_NOT_CONFIGURED',
    });
  });
});

describe('MemoryGeocodingCache', () => {
  const result: GeocodingResult = {
    ...candidate,
    normalizedAddress: { ...candidate.normalizedAddress, country: 'CA' },
    provider: 'mock-provider',
  };

  it('expire les entrées selon le TTL', () => {
    let now = 1_000;
    const cache = new MemoryGeocodingCache({
      secret: 'cache-secret',
      ttlSeconds: 2,
      now: () => now,
    });
    cache.set(address, result);
    expect(cache.get(address)).toEqual(result);
    now = 3_000;
    expect(cache.get(address)).toBeUndefined();
  });

  it('respecte la limite maximale en supprimant la plus ancienne entrée', () => {
    const cache = new MemoryGeocodingCache({
      secret: 'cache-secret',
      maxEntries: 1,
    });
    const secondAddress = { ...address, addressLine: '456 Rue Secondaire' };
    cache.set(address, result);
    cache.set(secondAddress, result);
    expect(cache.get(address)).toBeUndefined();
    expect(cache.get(secondAddress)).toEqual(result);
  });

  it('utilise une clé HMAC déterministe sans adresse lisible', () => {
    const cache = new MemoryGeocodingCache({ secret: 'cache-secret' });
    cache.set(address, result);
    cache.set(address, result);
    const keys = [...((cache as any).entries as Map<string, unknown>).keys()];

    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(keys[0]).not.toContain(address.addressLine);
    expect(keys[0]).not.toContain(address.postalCode!);
  });

  it('est désactivé sans secret HMAC', () => {
    const cache = new MemoryGeocodingCache();
    cache.set(address, result);
    expect(cache.get(address)).toBeUndefined();
    expect((cache as any).entries.size).toBe(0);
  });
});
