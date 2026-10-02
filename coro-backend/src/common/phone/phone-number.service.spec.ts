import { PhoneNumberError } from './phone-number.errors';
import { PhoneNumberService } from './phone-number.service';

describe('PhoneNumberService', () => {
  const service = new PhoneNumberService();
  const caSms = { defaultCountry: 'CA' as const, purpose: 'SMS' as const };

  it.each([
    '5145551234',
    '514-555-1234',
    '(514) 555-1234',
    '+1 514 555 1234',
    '1 (514) 555-1234',
  ])('normalizes Canadian representation %s', (input) => {
    expect(service.normalizePhoneNumber(input, caSms).canonical).toBe(
      '+15145551234',
    );
  });

  it('respects an explicit international country code', () => {
    const result = service.normalizePhoneNumber('+33 1 42 68 53 00', caSms);
    expect(result.canonical).toBe('+33142685300');
    expect(result.country).toBe('FR');
  });

  it.each([
    null,
    '',
    '911',
    '12345678901234567890',
    'not a phone 5145551234',
    '+9991234',
  ])('rejects invalid input without echoing it: %s', (input) => {
    expect(() => service.normalizePhoneNumber(input, caSms)).toThrow(
      PhoneNumberError,
    );
    try {
      service.normalizePhoneNumber(input, caSms);
    } catch (error) {
      if (String(input)) {
        expect((error as Error).message).not.toContain(String(input));
      }
    }
  });

  it.each(['5145551234 ext 9', '5145551234 x 9', '5145551234#9'])(
    'rejects extensions for SMS: %s',
    (input) => {
      try {
        service.normalizePhoneNumber(input, caSms);
        throw new Error('Expected normalization to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(PhoneNumberError);
        expect((error as PhoneNumberError).code).toBe(
          'PHONE_EXTENSION_NOT_ALLOWED',
        );
      }
    },
  );

  it('requires a country for national input', () => {
    try {
      service.normalizePhoneNumber('5145551234', { purpose: 'CONTACT' });
      throw new Error('Expected normalization to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(PhoneNumberError);
      expect((error as PhoneNumberError).code).toBe('PHONE_COUNTRY_REQUIRED');
    }
  });

  it('masks canonical identity deterministically', () => {
    expect(service.maskPhoneNumber('+15145551234')).toBe('+1******1234');
  });

  it('compares equivalent representations', () => {
    expect(
      service.phonesAreEquivalent('(514) 555-1234', '+1 514 555 1234', caSms),
    ).toBe(true);
  });
});
