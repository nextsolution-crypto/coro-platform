const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const MIN_REQUEST_INTERVAL_MS = 1_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1_000;

type Coordinates = { latitude: number; longitude: number };
type CacheEntry = { expiresAt: number; value: Coordinates | null };

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<Coordinates | null>>();
let requestQueue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

function normalizedKey(address: string, city: string, province: string) {
  return [address, city, province]
    .map((value) =>
      value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-CA'),
    )
    .join('|');
}

function enabled() {
  return process.env.BUILDING_PUBLIC_GEOCODING_ENABLED === 'true';
}

async function reserveProviderSlot() {
  const previous = requestQueue;
  let release: () => void = () => undefined;
  requestQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  const waitMs = Math.max(
    0,
    MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt),
  );
  if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
  lastRequestAt = Date.now();
  release();
}

function validCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

async function requestCoordinates(
  address: string,
  city: string,
  province: string,
): Promise<Coordinates | null> {
  await reserveProviderSlot();
  const query = `${address.trim()}, ${city.trim()}, ${province.trim()}, Canada`;
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'ca');

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CORO-Platform/1.0 (info@getcoro.io)',
      },
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) return null;

    const rows = (await response.json()) as Array<{
      lat?: unknown;
      lon?: unknown;
    }>;
    const latitude = Number(rows[0]?.lat);
    const longitude = Number(rows[0]?.lon);
    return validCoordinates(latitude, longitude)
      ? { latitude, longitude }
      : null;
  } catch {
    return null;
  }
}

export async function geocodeBuildingAddress(
  address: string,
  city: string,
  province: string,
): Promise<Coordinates | null> {
  if (
    !enabled() ||
    process.env.NODE_ENV === 'test' ||
    process.env.CORO_QA_MODE === 'true'
  ) {
    return null;
  }

  const key = normalizedKey(address, city, province);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = requestCoordinates(address, city, province)
    .then((value) => {
      cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
      return value;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

export function resetBuildingGeocodingForTests() {
  cache.clear();
  inFlight.clear();
  requestQueue = Promise.resolve();
  lastRequestAt = 0;
}
