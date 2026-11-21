import { generatePin, isValidPinFormat, pinDigest, pinHmacKey, withoutPinSecrets } from './sentinelle-pin';

describe('Sentinelle PIN digest (audit M5-02)', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('generates 6-digit PINs and accepts legacy 4-digit ones', () => {
    for (let i = 0; i < 50; i++) expect(generatePin()).toMatch(/^[1-9]\d{5}$/);
    expect(isValidPinFormat('1234')).toBe(true);
    expect(isValidPinFormat('123456')).toBe(true);
    expect(isValidPinFormat('12345')).toBe(false);
    expect(isValidPinFormat('12a4')).toBe(false);
  });

  it('binds the digest to the building and to the secret key', () => {
    const key = 'k'.repeat(40);
    const a = pinDigest('building-a', '123456', key);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(pinDigest('building-a', '123456', key)).toBe(a);
    expect(pinDigest('building-b', '123456', key)).not.toBe(a);
    expect(pinDigest('building-a', '123456', 'z'.repeat(40))).not.toBe(a);
  });

  it('refuses to hash in production without a strong key, and uses a configured one', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SENTINELLE_PIN_HMAC_KEY;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(pinHmacKey()).toBeNull();
    process.env.SENTINELLE_PIN_HMAC_KEY = 'short';
    expect(pinHmacKey()).toBeNull();
    process.env.SENTINELLE_PIN_HMAC_KEY = 'x'.repeat(44);
    expect(pinHmacKey()).toBe('x'.repeat(44));
  });

  it('strips PIN secrets from portal responses', () => {
    expect(withoutPinSecrets({ id: 'e1', pin: '1234', pinHash: 'abc', firstName: 'A' })).toEqual({ id: 'e1', firstName: 'A' });
  });
});
