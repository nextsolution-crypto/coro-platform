import type { CountryCode } from 'libphonenumber-js/max';

export type PhoneNumberPurpose = 'SMS' | 'OTP' | 'VOICE' | 'CONTACT';

export type PhoneNumberContext = {
  defaultCountry?: CountryCode;
  purpose: PhoneNumberPurpose;
};

export type NormalizedPhoneNumber = {
  canonical: string;
  country?: CountryCode;
  nationalNumber: string;
  internationalDisplay: string;
  nationalDisplay: string;
};
