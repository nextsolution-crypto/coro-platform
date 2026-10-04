import { ServiceUnavailableException } from '@nestjs/common';
import { PopulationVerificationChannel } from '@prisma/client';
import { PopulationReadinessService } from './population-readiness.service';

const strong = (character: string) => character.repeat(40);
const aes = (byte: number) => Buffer.alloc(32, byte).toString('base64');

function configuredEnvironment(): NodeJS.ProcessEnv {
  return {
    POPULATION_OTP_SECRET: strong('o'),
    POPULATION_ACCESS_SECRET: strong('a'),
    POPULATION_ACCESS_REQUEST_TOKEN_SECRET: aes(1),
    POPULATION_LOCATION_TOKEN_SECRET: aes(2),
    POPULATION_CONTACT_CHANGE_ACTIVE_KEY_ID: 'key-A',
    POPULATION_CONTACT_CHANGE_ENCRYPTION_KEYS: JSON.stringify({
      'key-A': aes(3),
    }),
    POPULATION_CONTACT_CHANGE_FINGERPRINT_KEY: aes(4),
    BREVO_API_KEY: 'brevo-test-key',
    BREVO_SENDER_EMAIL: 'alerts@example.test',
    POPULATION_EMAIL_TIMEOUT_MS: '10000',
    POPULATION_BREVO_WEBHOOK_SECRET: strong('w'),
    BREVO_SMS_SENDER: 'CORO',
    POPULATION_SMS_PRODUCTION_VALIDATED: 'true',
    GEOCODING_PROVIDER: 'mapbox',
    MAPBOX_GEOCODING_ACCESS_TOKEN: 'mapbox-server-token',
    GEOCODING_CACHE_HMAC_SECRET: strong('c'),
    GEOCODING_TIMEOUT_MS: '5000',
    GEOCODING_CACHE_TTL_SECONDS: '86400',
    GEOCODING_CACHE_MAX_ENTRIES: '1000',
  };
}

describe('PopulationReadinessService', () => {
  it.each([
    'POPULATION_OTP_SECRET',
    'POPULATION_ACCESS_SECRET',
    'POPULATION_ACCESS_REQUEST_TOKEN_SECRET',
    'POPULATION_LOCATION_TOKEN_SECRET',
  ])('reports a missing %s without exposing configuration values', (name) => {
    const env = configuredEnvironment();
    delete env[name];
    const readiness = new PopulationReadinessService(env).getReadiness();
    expect(readiness.population.core).toBe('NOT_CONFIGURED');
    expect(JSON.stringify(readiness)).not.toContain(strong('o'));
    expect(JSON.stringify(readiness)).not.toContain('mapbox-server-token');
  });

  it('rejects weak HMAC secrets and malformed AES keys', () => {
    const env = configuredEnvironment();
    env.POPULATION_OTP_SECRET = 'weak';
    env.POPULATION_LOCATION_TOKEN_SECRET = 'not-a-key';
    const readiness = new PopulationReadinessService(env).getReadiness();
    expect(readiness.population.otp).toBe('INVALID');
    expect(readiness.population.locationToken).toBe('INVALID');
    expect(readiness.population.geocoding).toBe('INVALID');
  });

  it('rejects reuse of any Population security secret', () => {
    const env = configuredEnvironment();
    env.POPULATION_ACCESS_SECRET = env.POPULATION_OTP_SECRET;
    const service = new PopulationReadinessService(env);
    expect(service.getReadiness().population.core).toBe('INVALID');
    expect(() => service.assertAccessReady()).toThrow(
      ServiceUnavailableException,
    );
  });

  it('keeps email ready while SMS awaits explicit production validation', () => {
    const env = configuredEnvironment();
    delete env.POPULATION_SMS_PRODUCTION_VALIDATED;
    const readiness = new PopulationReadinessService(env).getReadiness();
    expect(readiness.population.email).toBe('READY');
    expect(readiness.population.sms).toBe('NOT_VALIDATED');
    expect(() =>
      new PopulationReadinessService(env).assertVerificationChannelReady(
        PopulationVerificationChannel.SMS,
      ),
    ).toThrow(ServiceUnavailableException);
  });

  it.each(['0', '-1', 'abc', '1.5', '30001'])(
    'rejects invalid email timeout %s',
    (timeout) => {
      const env = configuredEnvironment();
      env.POPULATION_EMAIL_TIMEOUT_MS = timeout;
      expect(
        new PopulationReadinessService(env).getReadiness().population.email,
      ).toBe('INVALID');
    },
  );

  it('uses a safe default when the email timeout is omitted', () => {
    const env = configuredEnvironment();
    delete env.POPULATION_EMAIL_TIMEOUT_MS;
    expect(
      new PopulationReadinessService(env).getReadiness().population.email,
    ).toBe('READY');
  });

  it.each([
    [{ GEOCODING_PROVIDER: undefined }, 'NOT_CONFIGURED'],
    [{ GEOCODING_PROVIDER: 'unknown' }, 'INVALID'],
    [{ MAPBOX_GEOCODING_ACCESS_TOKEN: undefined }, 'NOT_CONFIGURED'],
    [{ GEOCODING_TIMEOUT_MS: 'zero' }, 'INVALID'],
    [{ GEOCODING_CACHE_HMAC_SECRET: 'weak' }, 'INVALID'],
  ] as const)(
    'classifies geocoding configuration %j as %s',
    (changes, expected) => {
      const env = configuredEnvironment();
      Object.assign(env, changes);
      for (const [name, value] of Object.entries(changes)) {
        if (value === undefined) delete env[name];
      }
      expect(
        new PopulationReadinessService(env).getReadiness().population.geocoding,
      ).toBe(expected);
    },
  );

  it('reports every configured capability ready without returning secrets', () => {
    const env = configuredEnvironment();
    const readiness = new PopulationReadinessService(env).getReadiness();
    expect(readiness).toEqual({
      population: {
        core: 'READY',
        otp: 'READY',
        access: 'READY',
        locationToken: 'READY',
        geocoding: 'READY',
        email: 'READY',
        emailOutbound: 'READY',
        emailWebhook: 'READY',
        emailLive: 'READY',
        sms: 'READY',
        contactChangeCrypto: 'READY',
      },
    });
    for (const value of Object.values(env)) {
      expect(JSON.stringify(readiness)).not.toContain(value);
    }
  });

  it('keeps contact-change crypto optional for existing operations', () => {
    const env = configuredEnvironment();
    delete env.POPULATION_CONTACT_CHANGE_ACTIVE_KEY_ID;
    delete env.POPULATION_CONTACT_CHANGE_ENCRYPTION_KEYS;
    delete env.POPULATION_CONTACT_CHANGE_FINGERPRINT_KEY;
    const readiness = new PopulationReadinessService(env).getReadiness();
    expect(readiness.population.contactChangeCrypto).toBe('NOT_CONFIGURED');
    expect(readiness.population.core).toBe('READY');
  });

  it.each([
    {
      POPULATION_CONTACT_CHANGE_ACTIVE_KEY_ID: undefined,
    },
    {
      POPULATION_CONTACT_CHANGE_ENCRYPTION_KEYS: '{',
    },
    {
      POPULATION_CONTACT_CHANGE_FINGERPRINT_KEY: 'weak',
    },
    {
      POPULATION_CONTACT_CHANGE_ACTIVE_KEY_ID: 'missing',
    },
  ])('reports malformed contact-change crypto as INVALID', (changes) => {
    const env = configuredEnvironment();
    Object.assign(env, changes);
    for (const [name, value] of Object.entries(changes)) {
      if (value === undefined) delete env[name];
    }
    expect(
      new PopulationReadinessService(env).getReadiness().population
        .contactChangeCrypto,
    ).toBe('INVALID');
  });

  it('distingue le transport sortant du webhook entrant', () => {
    const env = configuredEnvironment();
    delete env.POPULATION_BREVO_WEBHOOK_SECRET;
    const readiness = new PopulationReadinessService(env).getReadiness();
    expect(readiness.population.email).toBe('READY');
    expect(readiness.population.emailOutbound).toBe('READY');
    expect(readiness.population.emailWebhook).toBe('NOT_CONFIGURED');
    expect(readiness.population.emailLive).toBe('NOT_CONFIGURED');
    expect(() =>
      new PopulationReadinessService(env).assertEmailLiveReady(),
    ).toThrow(ServiceUnavailableException);
  });
});
