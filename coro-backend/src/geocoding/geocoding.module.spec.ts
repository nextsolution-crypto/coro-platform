import { Test } from '@nestjs/testing';
import { GEOCODING_PROVIDER } from './geocoding-provider.interface';
import { GeocodingModule } from './geocoding.module';
import { MapboxGeocodingProvider } from './providers/mapbox-geocoding.provider';

describe('GeocodingModule provider wiring', () => {
  const originalProvider = process.env.GEOCODING_PROVIDER;
  const originalToken = process.env.MAPBOX_GEOCODING_ACCESS_TOKEN;

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.GEOCODING_PROVIDER;
    } else {
      process.env.GEOCODING_PROVIDER = originalProvider;
    }
    if (originalToken === undefined) {
      delete process.env.MAPBOX_GEOCODING_ACCESS_TOKEN;
    } else {
      process.env.MAPBOX_GEOCODING_ACCESS_TOKEN = originalToken;
    }
  });

  async function resolveProvider(): Promise<unknown> {
    const module = await Test.createTestingModule({
      imports: [GeocodingModule],
    }).compile();
    return module.get(GEOCODING_PROVIDER);
  }

  it('sélectionne Mapbox uniquement par configuration explicite', async () => {
    process.env.GEOCODING_PROVIDER = 'mapbox';
    process.env.MAPBOX_GEOCODING_ACCESS_TOKEN = 'server-side-test-token';
    await expect(resolveProvider()).resolves.toBeInstanceOf(
      MapboxGeocodingProvider,
    );
  });

  it.each([undefined, '', 'unknown'])(
    'ne sélectionne aucun provider pour %s',
    async (configuredProvider) => {
      if (configuredProvider === undefined) {
        delete process.env.GEOCODING_PROVIDER;
      } else {
        process.env.GEOCODING_PROVIDER = configuredProvider;
      }
      process.env.MAPBOX_GEOCODING_ACCESS_TOKEN = 'server-side-test-token';
      await expect(resolveProvider()).resolves.toBeNull();
    },
  );

  it('ne sélectionne pas Mapbox sans token dédié', async () => {
    process.env.GEOCODING_PROVIDER = 'mapbox';
    delete process.env.MAPBOX_GEOCODING_ACCESS_TOKEN;
    await expect(resolveProvider()).resolves.toBeNull();
  });
});
