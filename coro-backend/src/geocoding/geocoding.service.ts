import { Inject, Injectable, Optional } from '@nestjs/common';
import { GEOCODING_CACHE, GeocodingCache } from './geocoding-cache.interface';
import { GeocodingError } from './geocoding.errors';
import {
  GEOCODING_PROVIDER,
  GeocodingProvider,
} from './geocoding-provider.interface';
import {
  CANADIAN_PROVINCE_CODES,
  CanadianProvinceCode,
  GeocodingAddress,
  GeocodingResult,
  ProviderGeocodingCandidate,
} from './geocoding.types';

const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_ADDRESS_LINE_LENGTH = 200;
const MAX_CITY_LENGTH = 100;
const MAX_CANDIDATES = 5;
const POSTAL_CODE_PATTERN =
  /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] \d[ABCEGHJ-NPRSTV-Z]\d$/;

@Injectable()
export class GeocodingService {
  constructor(
    @Optional()
    @Inject(GEOCODING_PROVIDER)
    private readonly provider?: GeocodingProvider | null,
    @Optional()
    @Inject(GEOCODING_CACHE)
    private readonly cache?: GeocodingCache | null,
  ) {}

  normalizeAddress(address: GeocodingAddress): GeocodingAddress {
    if (!address || typeof address !== 'object') {
      throw new GeocodingError('GEOCODING_INVALID_INPUT');
    }

    const addressLine = this.normalizeText(address.addressLine);
    const city = this.normalizeText(address.city);
    const province = this.normalizeProvince(address.province);
    const country = String(address.country ?? '')
      .trim()
      .toUpperCase();
    const postalCode = address.postalCode
      ? this.normalizePostalCode(address.postalCode)
      : undefined;

    if (
      !addressLine ||
      !city ||
      addressLine.length > MAX_ADDRESS_LINE_LENGTH ||
      city.length > MAX_CITY_LENGTH ||
      country !== 'CA'
    ) {
      throw new GeocodingError('GEOCODING_INVALID_INPUT');
    }

    return { addressLine, city, province, postalCode, country: 'CA' };
  }

  async geocode(address: GeocodingAddress): Promise<GeocodingResult> {
    const normalized = this.normalizeAddress(address);
    const cached = this.cache?.get(normalized);
    if (cached) return cached;

    if (!this.provider) {
      throw new GeocodingError('GEOCODING_NOT_CONFIGURED');
    }

    const timeoutMs = this.timeoutMs();
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const response = await Promise.race([
        this.provider.geocode(normalized, { timeoutMs }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new GeocodingError('GEOCODING_TIMEOUT')),
            timeoutMs,
          );
        }),
      ]);

      if (!response || !Array.isArray(response.candidates)) {
        throw new GeocodingError('GEOCODING_INVALID_RESULT');
      }
      if (response.candidates.length === 0) {
        throw new GeocodingError('GEOCODING_NO_RESULT');
      }
      if (response.candidates.length > 1) {
        throw new GeocodingError('GEOCODING_AMBIGUOUS_RESULT');
      }

      const result = this.validateCandidate(response.candidates[0], normalized);
      this.cache?.set(normalized, result);
      return result;
    } catch (error) {
      if (error instanceof GeocodingError) throw error;
      throw new GeocodingError('GEOCODING_PROVIDER_UNAVAILABLE');
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  async geocodeCandidates(address: GeocodingAddress): Promise<GeocodingResult[]> {
    const normalized = this.normalizeAddress(address);
    if (!this.provider) {
      throw new GeocodingError('GEOCODING_NOT_CONFIGURED');
    }

    const candidates = await this.requestCandidates(normalized);
    const accepted: GeocodingResult[] = [];
    const seen = new Set<string>();

    for (const candidate of candidates) {
      if (!this.isPlausible(candidate, normalized)) continue;
      let result: GeocodingResult;
      try {
        result = this.validateCandidate(candidate, normalized);
      } catch (error) {
        if (
          error instanceof GeocodingError &&
          (error.code === 'GEOCODING_INVALID_RESULT' ||
            error.code === 'GEOCODING_COUNTRY_MISMATCH' ||
            error.code === 'GEOCODING_PROVINCE_MISMATCH')
        ) {
          continue;
        }
        throw error;
      }
      const keys = this.candidateKeys(candidate, result);
      if (keys.some((key) => seen.has(key))) continue;
      keys.forEach((key) => seen.add(key));
      accepted.push(result);
      if (accepted.length === MAX_CANDIDATES) break;
    }

    if (accepted.length === 0) {
      throw new GeocodingError('GEOCODING_NO_RESULT');
    }
    return accepted;
  }

  private async requestCandidates(
    normalized: GeocodingAddress,
  ): Promise<ProviderGeocodingCandidate[]> {
    const timeoutMs = this.timeoutMs();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([
        this.provider!.geocode(normalized, { timeoutMs }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new GeocodingError('GEOCODING_TIMEOUT')),
            timeoutMs,
          );
        }),
      ]);
      if (!response || !Array.isArray(response.candidates)) {
        throw new GeocodingError('GEOCODING_INVALID_RESULT');
      }
      return response.candidates;
    } catch (error) {
      if (error instanceof GeocodingError) throw error;
      throw new GeocodingError('GEOCODING_PROVIDER_UNAVAILABLE');
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private isPlausible(
    candidate: ProviderGeocodingCandidate,
    requestedAddress: GeocodingAddress,
  ) {
    if (candidate.featureType && candidate.featureType !== 'address') return false;
    if (candidate.confidence === 'low') return false;
    if (
      !candidate.normalizedAddress?.addressLine?.trim() ||
      !candidate.normalizedAddress?.city?.trim()
    ) {
      return false;
    }
    const unmatched = new Set(candidate.unmatchedComponents ?? []);
    if (
      unmatched.has('address_number') ||
      unmatched.has('street') ||
      unmatched.has('place') ||
      unmatched.has('region') ||
      (requestedAddress.postalCode && unmatched.has('postcode'))
    ) {
      return false;
    }
    return true;
  }

  private candidateKeys(
    candidate: ProviderGeocodingCandidate,
    result: GeocodingResult,
  ) {
    const address = result.normalizedAddress;
    const normalizedKey = [
      address.addressLine,
      address.city,
      address.province,
      address.postalCode,
      result.latitude.toFixed(5),
      result.longitude.toFixed(5),
    ]
      .map((value) => String(value ?? '').trim().toLocaleLowerCase('en-CA'))
      .join('|');
    return candidate.providerCandidateId
      ? [`id:${candidate.providerCandidateId}`, `address:${normalizedKey}`]
      : [`address:${normalizedKey}`];
  }

  private validateCandidate(
    candidate: ProviderGeocodingCandidate | undefined,
    requestedAddress: GeocodingAddress,
  ): GeocodingResult {
    if (
      !candidate ||
      !Number.isFinite(candidate.latitude) ||
      !Number.isFinite(candidate.longitude) ||
      candidate.latitude < -90 ||
      candidate.latitude > 90 ||
      candidate.longitude < -180 ||
      candidate.longitude > 180 ||
      !candidate.normalizedAddress ||
      !candidate.normalizedAddress.country ||
      !candidate.normalizedAddress.province
    ) {
      throw new GeocodingError('GEOCODING_INVALID_RESULT');
    }

    const country = candidate.normalizedAddress.country.trim().toUpperCase();
    if (country !== 'CA') {
      throw new GeocodingError('GEOCODING_COUNTRY_MISMATCH');
    }

    const province = candidate.normalizedAddress.province.trim().toUpperCase();
    if (province !== requestedAddress.province) {
      throw new GeocodingError('GEOCODING_PROVINCE_MISMATCH');
    }

    return {
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      normalizedAddress: {
        addressLine: this.optionalNormalizedText(
          candidate.normalizedAddress.addressLine,
        ),
        city: this.optionalNormalizedText(candidate.normalizedAddress.city),
        province,
        postalCode: candidate.normalizedAddress.postalCode
          ? this.normalizePostalCode(candidate.normalizedAddress.postalCode)
          : undefined,
        country: 'CA',
      },
      provider: this.provider!.name,
    };
  }

  private normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  }

  private optionalNormalizedText(value: unknown): string | undefined {
    const normalized = this.normalizeText(value);
    return normalized || undefined;
  }

  private normalizeProvince(value: unknown): CanadianProvinceCode {
    const normalized = String(value ?? '')
      .trim()
      .toUpperCase();
    if (!CANADIAN_PROVINCE_CODES.includes(normalized as CanadianProvinceCode)) {
      throw new GeocodingError('GEOCODING_INVALID_INPUT');
    }
    return normalized as CanadianProvinceCode;
  }

  private normalizePostalCode(value: unknown): string {
    if (typeof value !== 'string') {
      throw new GeocodingError('GEOCODING_INVALID_INPUT');
    }
    const compact = value.trim().toUpperCase().replace(/\s+/g, '');
    const normalized = `${compact.slice(0, 3)} ${compact.slice(3)}`;
    if (!POSTAL_CODE_PATTERN.test(normalized)) {
      throw new GeocodingError('GEOCODING_INVALID_INPUT');
    }
    return normalized;
  }

  private timeoutMs(): number {
    const configured = Number(process.env.GEOCODING_TIMEOUT_MS);
    return Number.isInteger(configured) && configured > 0
      ? configured
      : DEFAULT_TIMEOUT_MS;
  }
}
