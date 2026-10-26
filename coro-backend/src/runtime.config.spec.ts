import { CLIENT_EMAIL_QA_RUNTIME, runtimeConfig } from './runtime.config';

const qa = {
  CORO_QA_RUNTIME: CLIENT_EMAIL_QA_RUNTIME,
  HOST: '127.0.0.1',
  PORT: '3102',
  CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:3103',
  CLIENT_PORTAL_PUBLIC_URL: 'http://127.0.0.1:3103',
  DATABASE_URL: 'postgresql://coro_email_qa:test@127.0.0.1:55471/coro_email_qa',
  JWT_SECRET: 'qa-jwt-secret-at-least-32-characters-only',
  CORO_QA_JWT_SECRET: 'qa-jwt-secret-at-least-32-characters-only',
  PLATFORM_MFA_SECRET: 'qa-mfa-secret-at-least-32-characters-only',
};

describe('runtime configuration', () => {
  it('preserves the Docker-compatible non-QA network defaults', () => {
    expect(runtimeConfig({})).toMatchObject({
      host: '0.0.0.0',
      port: 3002,
      qa: false,
    });
  });

  it('preserves FRONTEND_URL and extends it with explicit CORS origins', () => {
    expect(
      runtimeConfig({
        FRONTEND_URL: 'https://tenant.example.test',
        CORS_ALLOWED_ORIGINS:
          'https://admin.example.test,http://localhost:4100',
      }).corsOrigins,
    ).toEqual(
      expect.arrayContaining([
        'https://tenant.example.test',
        'https://admin.example.test',
        'http://localhost:4100',
      ]),
    );
  });

  it.each([
    ['FRONTEND_URL', 'not-a-url'],
    ['FRONTEND_URL', 'https://example.test/path'],
    ['FRONTEND_URL', 'https://user:pass@example.test'],
    ['CORS_ALLOWED_ORIGINS', '*'],
    ['CORS_ALLOWED_ORIGINS', 'file:///tmp/portal'],
  ])('refuses invalid non-QA %s origins', (name, value) => {
    expect(() => runtimeConfig({ [name]: value })).toThrow(
      `${name} contains an invalid origin.`,
    );
  });

  it('refuses unknown QA profile names instead of silently using production', () => {
    expect(() =>
      runtimeConfig({ CORO_QA_RUNTIME: 'CLIENT_EMAIL_E2E_TYPO' }),
    ).toThrow('Unknown CORO_QA_RUNTIME profile.');
  });

  it('accepts only the isolated client email QA topology', () => {
    expect(runtimeConfig(qa)).toEqual({
      host: '127.0.0.1',
      port: 3102,
      qa: true,
      corsOrigins: ['http://127.0.0.1:3103'],
    });
  });

  it.each([
    ['PORT', '3002'],
    ['HOST', '0.0.0.0'],
    ['CORS_ALLOWED_ORIGINS', 'http://127.0.0.1:3103,https://client.getcoro.io'],
    ['FRONTEND_URL', 'http://127.0.0.1:3103'],
    ['CLIENT_PORTAL_PUBLIC_URL', 'https://client.getcoro.io'],
    [
      'DATABASE_URL',
      'postgresql://coro_email_qa:test@db.example.test:55471/coro_email_qa',
    ],
    [
      'DATABASE_URL',
      'postgresql://coro_email_qa:test@127.0.0.1:5432/coro_email_qa',
    ],
    ['JWT_SECRET', 'different-secret-at-least-32-characters-long'],
  ])('refuses unsafe QA %s', (name, value) => {
    expect(() => runtimeConfig({ ...qa, [name]: value })).toThrow();
  });
});
