export type PhoneNumberErrorCode =
  | 'PHONE_REQUIRED'
  | 'PHONE_COUNTRY_REQUIRED'
  | 'PHONE_INVALID'
  | 'PHONE_EXTENSION_NOT_ALLOWED';

export class PhoneNumberError extends Error {
  constructor(public readonly code: PhoneNumberErrorCode) {
    super('Le numéro de téléphone est invalide');
    this.name = 'PhoneNumberError';
  }
}
