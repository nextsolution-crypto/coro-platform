import {
  geocodeBuildingAddress,
  resetBuildingGeocodingForTests,
} from './building-geocoding';

describe('building public geocoding governance', () => {
  const originalEnabled = process.env.BUILDING_PUBLIC_GEOCODING_ENABLED;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetBuildingGeocodingForTests();
    process.env.NODE_ENV = 'development';
    delete process.env.BUILDING_PUBLIC_GEOCODING_ENABLED;
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env.BUILDING_PUBLIC_GEOCODING_ENABLED = originalEnabled;
    process.env.NODE_ENV = originalNodeEnv;
    global.fetch = originalFetch;
  });

  it('fails closed without the explicit privacy/provider opt-in', async () => {
    await expect(
      geocodeBuildingAddress('1 Rue Synthétique', 'Montréal', 'QC'),
    ).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('uses the governed endpoint and accepts valid zero coordinates', async () => {
    process.env.BUILDING_PUBLIC_GEOCODING_ENABLED = 'true';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '0', lon: '0' }],
    });

    await expect(
      geocodeBuildingAddress('1 Rue Synthétique', 'Montréal', 'QC'),
    ).resolves.toEqual({ latitude: 0, longitude: 0 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toMatch(
      /^https:\/\/nominatim\.openstreetmap\.org\/search\?/,
    );
  });

  it('deduplicates identical requests and caches the result', async () => {
    process.env.BUILDING_PUBLIC_GEOCODING_ENABLED = 'true';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '45.5', lon: '-73.5' }],
    });

    const address = ['1 Rue Synthétique', 'Montréal', 'QC'] as const;
    const [first, second] = await Promise.all([
      geocodeBuildingAddress(...address),
      geocodeBuildingAddress(...address),
    ]);
    expect(first).toEqual(second);
    await expect(geocodeBuildingAddress(...address)).resolves.toEqual(first);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects provider coordinates outside geographic bounds', async () => {
    process.env.BUILDING_PUBLIC_GEOCODING_ENABLED = 'true';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '91', lon: '-73.5' }],
    });

    await expect(
      geocodeBuildingAddress('1 Rue Synthétique', 'Montréal', 'QC'),
    ).resolves.toBeNull();
  });
});
