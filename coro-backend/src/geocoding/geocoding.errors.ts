export const GEOCODING_ERROR_CODES = [
  'GEOCODING_INVALID_INPUT',
  'GEOCODING_NO_RESULT',
  'GEOCODING_AMBIGUOUS_RESULT',
  'GEOCODING_TIMEOUT',
  'GEOCODING_PROVIDER_UNAVAILABLE',
  'GEOCODING_INVALID_RESULT',
  'GEOCODING_COUNTRY_MISMATCH',
  'GEOCODING_PROVINCE_MISMATCH',
  'GEOCODING_NOT_CONFIGURED',
] as const;

export type GeocodingErrorCode = (typeof GEOCODING_ERROR_CODES)[number];

export class GeocodingError extends Error {
  constructor(public readonly code: GeocodingErrorCode) {
    super(code);
    this.name = 'GeocodingError';
  }
}
