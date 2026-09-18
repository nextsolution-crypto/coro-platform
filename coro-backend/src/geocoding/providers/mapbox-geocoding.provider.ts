import { GeocodingError } from '../geocoding.errors';
import {
  GeocodingProvider,
  GeocodingProviderOptions,
} from '../geocoding-provider.interface';
import {
  CanadianProvinceCode,
  GeocodingAddress,
  ProviderGeocodingCandidate,
  ProviderGeocodingResponse,
} from '../geocoding.types';

const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/search/geocode/v6/forward';
const MAPBOX_RESULT_LIMIT = '5';

const CANADIAN_PROVINCE_NAMES: Record<string, CanadianProvinceCode> = {
  ALBERTA: 'AB',
  'BRITISH COLUMBIA': 'BC',
  COLOMBIEBRITANNIQUE: 'BC',
  MANITOBA: 'MB',
  'NEW BRUNSWICK': 'NB',
  NOUVEAUBRUNSWICK: 'NB',
  'NEWFOUNDLAND AND LABRADOR': 'NL',
  TERRENEUVEETLABRADOR: 'NL',
  'NOVA SCOTIA': 'NS',
  NOUVELLEECOSSE: 'NS',
  'NORTHWEST TERRITORIES': 'NT',
  TERRITOIRESDUNORDOUEST: 'NT',
  NUNAVUT: 'NU',
  ONTARIO: 'ON',
  'PRINCE EDWARD ISLAND': 'PE',
  ILEDUPRINCEEDOUARD: 'PE',
  QUEBEC: 'QC',
  SASKATCHEWAN: 'SK',
  YUKON: 'YT',
};

type UnknownRecord = Record<string, unknown>;

export class MapboxGeocodingProvider implements GeocodingProvider {
  readonly name = 'MAPBOX';

  constructor(private readonly accessToken: string) {}

  async geocode(
    address: GeocodingAddress,
    options: GeocodingProviderOptions,
  ): Promise<ProviderGeocodingResponse> {
    if (!this.accessToken.trim()) {
      throw new GeocodingError('GEOCODING_NOT_CONFIGURED');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetch(this.buildUrl(address), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new GeocodingError('GEOCODING_NOT_CONFIGURED');
        }
        throw new GeocodingError('GEOCODING_PROVIDER_UNAVAILABLE');
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new GeocodingError('GEOCODING_INVALID_RESULT');
      }

      return { candidates: this.parseCandidates(payload) };
    } catch (error) {
      if (error instanceof GeocodingError) throw error;
      if (this.isAbortError(error) || controller.signal.aborted) {
        throw new GeocodingError('GEOCODING_TIMEOUT');
      }
      throw new GeocodingError('GEOCODING_PROVIDER_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(address: GeocodingAddress): URL {
    const url = new URL(MAPBOX_GEOCODING_URL);
    url.searchParams.set('address_line1', address.addressLine);
    url.searchParams.set('place', address.city);
    url.searchParams.set('region', address.province);
    if (address.postalCode) {
      url.searchParams.set('postcode', address.postalCode);
    }
    url.searchParams.set('country', 'CA');
    url.searchParams.set('types', 'address');
    url.searchParams.set('autocomplete', 'false');
    url.searchParams.set('limit', MAPBOX_RESULT_LIMIT);
    url.searchParams.set('permanent', 'true');
    url.searchParams.set('access_token', this.accessToken);
    return url;
  }

  private parseCandidates(payload: unknown): ProviderGeocodingCandidate[] {
    const root = this.asRecord(payload);
    if (
      !root ||
      root.type !== 'FeatureCollection' ||
      !Array.isArray(root.features)
    ) {
      throw new GeocodingError('GEOCODING_INVALID_RESULT');
    }

    return root.features.map((feature) => this.parseCandidate(feature));
  }

  private parseCandidate(feature: unknown): ProviderGeocodingCandidate {
    const featureRecord = this.asRecord(feature);
    const properties = this.asRecord(featureRecord?.properties);
    const context = this.asRecord(properties?.context);
    const coordinates = this.asRecord(properties?.coordinates);
    const geometry = this.asRecord(featureRecord?.geometry);
    const geometryCoordinates = Array.isArray(geometry?.coordinates)
      ? geometry.coordinates
      : [];

    if (!featureRecord || !properties || !context) {
      throw new GeocodingError('GEOCODING_INVALID_RESULT');
    }

    const longitude =
      typeof coordinates?.longitude === 'number'
        ? coordinates.longitude
        : geometryCoordinates[0];
    const latitude =
      typeof coordinates?.latitude === 'number'
        ? coordinates.latitude
        : geometryCoordinates[1];

    const addressContext = this.asRecord(context.address);
    const placeContext = this.asRecord(context.place);
    const regionContext = this.asRecord(context.region);
    const postcodeContext = this.asRecord(context.postcode);
    const countryContext = this.asRecord(context.country);
    const matchCode = this.asRecord(properties.match_code);
    const confidence = this.stringValue(matchCode?.confidence).toLowerCase();
    const unmatchedComponents = Object.entries(matchCode ?? {})
      .filter(([key, value]) => key !== 'confidence' && value === 'unmatched')
      .map(([key]) => key);

    return {
      latitude: latitude as number,
      longitude: longitude as number,
      normalizedAddress: {
        addressLine: this.stringValue(addressContext?.name ?? properties.name),
        city: this.stringValue(placeContext?.name),
        province: this.provinceCode(regionContext),
        postalCode: this.stringValue(postcodeContext?.name),
        country: this.stringValue(countryContext?.country_code),
      },
      ...(this.stringValue(properties.mapbox_id)
        ? { providerCandidateId: this.stringValue(properties.mapbox_id) }
        : {}),
      ...(this.stringValue(properties.feature_type)
        ? { featureType: this.stringValue(properties.feature_type) }
        : {}),
      ...(
        confidence === 'exact' ||
        confidence === 'high' ||
        confidence === 'medium' ||
        confidence === 'low'
          ? { confidence }
          : {}),
      ...(unmatchedComponents.length ? { unmatchedComponents } : {}),
    };
  }

  private provinceCode(region: UnknownRecord | undefined): string {
    const fullCode = this.stringValue(region?.region_code_full).toUpperCase();
    if (/^CA-[A-Z]{2}$/.test(fullCode)) return fullCode.slice(3);

    const code = this.stringValue(region?.region_code).toUpperCase();
    if (/^[A-Z]{2}$/.test(code)) return code;

    const name = this.stringValue(region?.name)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
    return (
      CANADIAN_PROVINCE_NAMES[name] ??
      CANADIAN_PROVINCE_NAMES[name.replace(/[^A-Z]/g, '')] ??
      ''
    );
  }

  private asRecord(value: unknown): UnknownRecord | undefined {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as UnknownRecord)
      : undefined;
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private isAbortError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'TimeoutError')
    );
  }
}
