export const CANADIAN_PROVINCE_CODES = [
  'AB',
  'BC',
  'MB',
  'NB',
  'NL',
  'NS',
  'NT',
  'NU',
  'ON',
  'PE',
  'QC',
  'SK',
  'YT',
] as const;

export type CanadianProvinceCode = (typeof CANADIAN_PROVINCE_CODES)[number];

export type GeocodingAddress = {
  addressLine: string;
  city: string;
  province: CanadianProvinceCode;
  postalCode?: string;
  country: 'CA';
};

export type GeocodingResult = {
  latitude: number;
  longitude: number;
  normalizedAddress: {
    addressLine?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country: 'CA';
  };
  provider: string;
};

export type ProviderGeocodingCandidate = {
  latitude: number;
  longitude: number;
  normalizedAddress: {
    addressLine?: string;
    city?: string;
    province: string;
    postalCode?: string;
    country: string;
  };
};

export type ProviderGeocodingResponse = {
  candidates: ProviderGeocodingCandidate[];
};
