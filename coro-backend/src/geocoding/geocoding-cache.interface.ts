import { GeocodingAddress, GeocodingResult } from './geocoding.types';

export const GEOCODING_CACHE = Symbol('GEOCODING_CACHE');

export interface GeocodingCache {
  get(address: GeocodingAddress): GeocodingResult | undefined;
  set(address: GeocodingAddress, result: GeocodingResult): void;
}
