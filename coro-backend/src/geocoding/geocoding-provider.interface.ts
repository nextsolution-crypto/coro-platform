import { GeocodingAddress, ProviderGeocodingResponse } from './geocoding.types';

export const GEOCODING_PROVIDER = Symbol('GEOCODING_PROVIDER');

export type GeocodingProviderOptions = {
  timeoutMs: number;
};

export interface GeocodingProvider {
  readonly name: string;
  geocode(
    address: GeocodingAddress,
    options: GeocodingProviderOptions,
  ): Promise<ProviderGeocodingResponse>;
}
