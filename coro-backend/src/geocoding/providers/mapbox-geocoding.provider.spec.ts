import { GeocodingError } from '../geocoding.errors';
import { GeocodingService } from '../geocoding.service';
import { GeocodingAddress } from '../geocoding.types';
import { MapboxGeocodingProvider } from './mapbox-geocoding.provider';

const TOKEN = 'server-side-test-token';
const address: GeocodingAddress = {
  addressLine: '123 Rue Principale',
  city: 'Montréal',
  province: 'QC',
  postalCode: 'H2X 1Y4',
  country: 'CA',
};

function mapboxFeature(overrides: Record<string, unknown> = {}) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-73.561, 45.508] },
    properties: {
      feature_type: 'address',
      name: '123 Rue Principale',
      coordinates: { longitude: -73.561, latitude: 45.508 },
      context: {
        address: { name: '123 Rue Principale' },
        place: { name: 'Montréal' },
        region: {
          name: 'Québec',
          region_code: 'QC',
          region_code_full: 'CA-QC',
        },
        postcode: { name: 'H2X 1Y4' },
        country: { name: 'Canada', country_code: 'CA' },
      },
      ...overrides,
    },
  };
}

function responseWith(features: unknown[], status = 200): Partial<Response> {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue({ type: 'FeatureCollection', features }),
  };
}

describe('MapboxGeocodingProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('envoie une requête V6 structurée permanente limitée au Canada', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      responseWith([mapboxFeature()]),
    );

    await new MapboxGeocodingProvider(TOKEN).geocode(address, {
      timeoutMs: 1_000,
    });

    const [requestedUrl, options] = (global.fetch as jest.Mock).mock.calls[0];
    const url = new URL(String(requestedUrl));
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://api.mapbox.com/search/geocode/v6/forward',
    );
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      address_line1: address.addressLine,
      place: address.city,
      region: address.province,
      postcode: address.postalCode,
      country: 'CA',
      types: 'address',
      autocomplete: 'false',
      limit: '5',
      permanent: 'true',
      access_token: TOKEN,
    });
    expect(url.searchParams.has('q')).toBe(false);
    expect(options).toMatchObject({ method: 'GET' });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('convertit uniquement les champs Mapbox nécessaires', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      responseWith([mapboxFeature({ attribution: 'not exposed' })]),
    );

    const result = await new MapboxGeocodingProvider(TOKEN).geocode(address, {
      timeoutMs: 1_000,
    });

    expect(result).toEqual({
      candidates: [
        {
          latitude: 45.508,
          longitude: -73.561,
          normalizedAddress: {
            addressLine: '123 Rue Principale',
            city: 'Montréal',
            province: 'QC',
            postalCode: 'H2X 1Y4',
            country: 'CA',
          },
          featureType: 'address',
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('attribution');
  });

  it('transmet tous les candidats au noyau', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      responseWith([mapboxFeature(), mapboxFeature()]),
    );
    const provider = new MapboxGeocodingProvider(TOKEN);

    await expect(
      provider.geocode(address, { timeoutMs: 1_000 }),
    ).resolves.toHaveProperty('candidates.length', 2);
    await expect(
      new GeocodingService(provider).geocode(address),
    ).rejects.toMatchObject({
      code: 'GEOCODING_AMBIGUOUS_RESULT',
    });
  });

  it('extrait uniquement les métadonnées de plausibilité nécessaires', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      responseWith([
        mapboxFeature({
          mapbox_id: 'address.test-id',
          match_code: {
            confidence: 'medium',
            address_number: 'matched',
            street: 'matched',
            postcode: 'unmatched',
          },
          attribution: 'never exposed',
        }),
      ]),
    );
    const result = await new MapboxGeocodingProvider(TOKEN).geocode(address, {
      timeoutMs: 1_000,
    });
    expect(result.candidates[0]).toMatchObject({
      providerCandidateId: 'address.test-id',
      featureType: 'address',
      confidence: 'medium',
      unmatchedComponents: ['postcode'],
    });
    expect(JSON.stringify(result)).not.toContain('attribution');
  });

  it('retourne zéro candidat sans fabriquer de résultat', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(responseWith([]));
    await expect(
      new MapboxGeocodingProvider(TOKEN).geocode(address, { timeoutMs: 1_000 }),
    ).resolves.toEqual({ candidates: [] });
  });

  it('laisse le noyau rejeter des coordonnées invalides', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      responseWith([
        mapboxFeature({
          coordinates: { longitude: -73.561, latitude: Number.NaN },
        }),
      ]),
    );
    await expect(
      new GeocodingService(new MapboxGeocodingProvider(TOKEN)).geocode(address),
    ).rejects.toMatchObject({ code: 'GEOCODING_INVALID_RESULT' });
  });

  it.each([
    ['Québec', undefined, undefined, 'QC'],
    ['Ontario', undefined, undefined, 'ON'],
    ['British Columbia', undefined, undefined, 'BC'],
    ['Nouvelle-Écosse', undefined, undefined, 'NS'],
    ['Île-du-Prince-Édouard', undefined, undefined, 'PE'],
    ['ignored', 'AB', undefined, 'AB'],
    ['ignored', undefined, 'CA-MB', 'MB'],
  ])(
    'normalise la province Mapbox %s en %s',
    async (name, regionCode, regionCodeFull, expected) => {
      const feature = mapboxFeature();
      feature.properties.context.region = {
        name,
        region_code: regionCode ?? '',
        region_code_full: regionCodeFull ?? '',
      };
      (global.fetch as jest.Mock).mockResolvedValue(responseWith([feature]));

      const result = await new MapboxGeocodingProvider(TOKEN).geocode(address, {
        timeoutMs: 1_000,
      });
      expect(result.candidates[0].normalizedAddress.province).toBe(expected);
    },
  );

  it('laisse le noyau rejeter un pays non canadien', async () => {
    const feature = mapboxFeature();
    feature.properties.context.country.country_code = 'US';
    (global.fetch as jest.Mock).mockResolvedValue(responseWith([feature]));
    await expect(
      new GeocodingService(new MapboxGeocodingProvider(TOKEN)).geocode(address),
    ).rejects.toMatchObject({ code: 'GEOCODING_COUNTRY_MISMATCH' });
  });

  it('abandonne la requête au timeout sans exposer de détails', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockImplementation(
      (_url: URL, options: RequestInit) =>
        new Promise((_, reject) => {
          options.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    const promise = new MapboxGeocodingProvider(TOKEN).geocode(address, {
      timeoutMs: 25,
    });
    const assertion = expect(promise).rejects.toMatchObject({
      code: 'GEOCODING_TIMEOUT',
    });
    await jest.advanceTimersByTimeAsync(25);
    await assertion;
  });

  it.each([
    [401, 'GEOCODING_NOT_CONFIGURED'],
    [403, 'GEOCODING_NOT_CONFIGURED'],
    [429, 'GEOCODING_PROVIDER_UNAVAILABLE'],
    [500, 'GEOCODING_PROVIDER_UNAVAILABLE'],
    [503, 'GEOCODING_PROVIDER_UNAVAILABLE'],
  ])('traduit HTTP %i sans contenu sensible', async (status, code) => {
    (global.fetch as jest.Mock).mockResolvedValue(responseWith([], status));
    await expect(
      new MapboxGeocodingProvider(TOKEN).geocode(address, { timeoutMs: 1_000 }),
    ).rejects.toMatchObject({ code });
  });

  it('rejette un JSON invalide', async () => {
    const response = responseWith([]);
    (response.json as jest.Mock).mockRejectedValue(new SyntaxError('bad json'));
    (global.fetch as jest.Mock).mockResolvedValue(response);
    await expect(
      new MapboxGeocodingProvider(TOKEN).geocode(address, { timeoutMs: 1_000 }),
    ).rejects.toMatchObject({ code: 'GEOCODING_INVALID_RESULT' });
  });

  it.each([
    [null],
    [{}],
    [{ type: 'FeatureCollection' }],
    [{ type: 'FeatureCollection', features: [null] }],
  ])('rejette un payload inattendu', async (payload) => {
    const response = responseWith([]);
    (response.json as jest.Mock).mockResolvedValue(payload);
    (global.fetch as jest.Mock).mockResolvedValue(response);
    await expect(
      new MapboxGeocodingProvider(TOKEN).geocode(address, { timeoutMs: 1_000 }),
    ).rejects.toMatchObject({ code: 'GEOCODING_INVALID_RESULT' });
  });

  it('assainit toute erreur réseau', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error(
        `${address.addressLine} ${address.postalCode} ${TOKEN} full-url`,
      ),
    );

    try {
      await new MapboxGeocodingProvider(TOKEN).geocode(address, {
        timeoutMs: 1_000,
      });
      fail('Expected Mapbox request to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(GeocodingError);
      expect((error as GeocodingError).code).toBe(
        'GEOCODING_PROVIDER_UNAVAILABLE',
      );
      const serialized = JSON.stringify(error);
      expect(serialized).not.toContain(address.addressLine);
      expect(serialized).not.toContain(address.postalCode!);
      expect(serialized).not.toContain(TOKEN);
      expect(serialized).not.toContain('full-url');
    }
  });

  it('refuse un token absent sans appel réseau', async () => {
    await expect(
      new MapboxGeocodingProvider(' ').geocode(address, { timeoutMs: 1_000 }),
    ).rejects.toMatchObject({ code: 'GEOCODING_NOT_CONFIGURED' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('s’intègre au GeocodingService sans réseau réel', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      responseWith([mapboxFeature()]),
    );
    await expect(
      new GeocodingService(new MapboxGeocodingProvider(TOKEN)).geocode(address),
    ).resolves.toEqual({
      latitude: 45.508,
      longitude: -73.561,
      normalizedAddress: {
        addressLine: '123 Rue Principale',
        city: 'Montréal',
        province: 'QC',
        postalCode: 'H2X 1Y4',
        country: 'CA',
      },
      provider: 'MAPBOX',
    });
  });
});
