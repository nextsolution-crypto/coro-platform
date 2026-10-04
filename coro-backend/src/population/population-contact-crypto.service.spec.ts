import {
  getPopulationContactCryptoStatus,
  PopulationContactCryptoError,
  PopulationContactCryptoService,
} from './population-contact-crypto.service';

const key = (byte: number) => Buffer.alloc(32, byte).toString('base64');

function environment(input?: {
  activeKeyId?: string;
  keys?: Record<string, string>;
  fingerprintKey?: string;
}): NodeJS.ProcessEnv {
  return {
    POPULATION_CONTACT_CHANGE_ACTIVE_KEY_ID: input?.activeKeyId ?? 'key-A',
    POPULATION_CONTACT_CHANGE_ENCRYPTION_KEYS: JSON.stringify(
      input?.keys ?? { 'key-A': key(1) },
    ),
    POPULATION_CONTACT_CHANGE_FINGERPRINT_KEY: input?.fingerprintKey ?? key(9),
    POPULATION_OTP_SECRET: 'o'.repeat(40),
    POPULATION_ACCESS_SECRET: 'a'.repeat(40),
    POPULATION_ACCESS_REQUEST_TOKEN_SECRET: key(7),
    POPULATION_LOCATION_TOKEN_SECRET: key(8),
    POPULATION_BREVO_WEBHOOK_SECRET: 'w'.repeat(40),
    POPULATION_BREVO_SMS_WEBHOOK_SECRET: 's'.repeat(40),
  };
}

const service = (env = environment()) =>
  new PopulationContactCryptoService(env);

function expectCode(operation: () => unknown, code: string) {
  try {
    operation();
    throw new Error('Expected operation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(PopulationContactCryptoError);
    expect((error as PopulationContactCryptoError).code).toBe(code);
    expect((error as Error).message).toBe(code);
  }
}

describe('PopulationContactCryptoService', () => {
  it.each([
    ['PHONE' as const, '+15145550123'],
    ['EMAIL' as const, 'citoyen+é@example.test'],
  ])('protects and recovers a %s destination', (type, plaintext) => {
    const authority = service();
    const protectedValue = authority.protectDestination({
      challengeId: 'challenge-1',
      type,
      plaintext,
    });
    expect(protectedValue).not.toContain(plaintext);
    expect(
      authority.unprotectDestination({
        challengeId: 'challenge-1',
        type,
        protectedValue,
      }),
    ).toBe(plaintext);
  });

  it('uses a fresh random IV for every encryption', () => {
    const authority = service();
    const input = {
      challengeId: 'challenge-1',
      type: 'PHONE' as const,
      plaintext: '+15145550123',
    };
    const first = JSON.parse(authority.protectDestination(input)) as {
      iv: string;
      ciphertext: string;
    };
    const second = JSON.parse(authority.protectDestination(input)) as {
      iv: string;
      ciphertext: string;
    };
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it.each(['', 'x'.repeat(513)])('rejects invalid plaintext', (plaintext) => {
    expectCode(
      () =>
        service().protectDestination({
          challengeId: 'challenge-1',
          type: 'EMAIL',
          plaintext,
        }),
      'CONTACT_CRYPTO_INVALID_INPUT',
    );
  });

  it.each([
    ['challengeId', 'challenge-2'],
    ['type', 'EMAIL'],
  ] as const)('authenticates the %s context', (field, value) => {
    const authority = service();
    const protectedValue = authority.protectDestination({
      challengeId: 'challenge-1',
      type: 'PHONE',
      plaintext: '+15145550123',
    });
    expectCode(
      () =>
        authority.unprotectDestination({
          challengeId: field === 'challengeId' ? value : 'challenge-1',
          type: field === 'type' ? value : 'PHONE',
          protectedValue,
        }),
      'CONTACT_CRYPTO_AUTHENTICATION_FAILED',
    );
  });

  it.each(['iv', 'ciphertext', 'tag'] as const)(
    'fails closed when %s is tampered',
    (field) => {
      const authority = service();
      const envelope = JSON.parse(
        authority.protectDestination({
          challengeId: 'challenge-1',
          type: 'PHONE',
          plaintext: '+15145550123',
        }),
      ) as Record<string, string>;
      const bytes = Buffer.from(envelope[field], 'base64url');
      bytes[0] ^= 1;
      envelope[field] = bytes.toString('base64url');
      expectCode(
        () =>
          authority.unprotectDestination({
            challengeId: 'challenge-1',
            type: 'PHONE',
            protectedValue: JSON.stringify(envelope),
          }),
        'CONTACT_CRYPTO_AUTHENTICATION_FAILED',
      );
    },
  );

  it('rejects unknown versions before decryption', () => {
    const authority = service();
    const envelope = JSON.parse(
      authority.protectDestination({
        challengeId: 'challenge-1',
        type: 'EMAIL',
        plaintext: 'citizen@example.test',
      }),
    ) as Record<string, string>;
    envelope.version = 'v2';
    expectCode(
      () =>
        authority.unprotectDestination({
          challengeId: 'challenge-1',
          type: 'EMAIL',
          protectedValue: JSON.stringify(envelope),
        }),
      'CONTACT_CRYPTO_UNKNOWN_VERSION',
    );
  });

  it('authenticates the selected key ID instead of trying other keys', () => {
    const authority = service(
      environment({ keys: { 'key-A': key(1), 'key-B': key(2) } }),
    );
    const envelope = JSON.parse(
      authority.protectDestination({
        challengeId: 'challenge-1',
        type: 'PHONE',
        plaintext: '+15145550123',
      }),
    ) as Record<string, string>;
    envelope.keyId = 'key-B';
    expectCode(
      () =>
        authority.unprotectDestination({
          challengeId: 'challenge-1',
          type: 'PHONE',
          protectedValue: JSON.stringify(envelope),
        }),
      'CONTACT_CRYPTO_AUTHENTICATION_FAILED',
    );
  });

  it.each([
    '{}',
    '[]',
    JSON.stringify({
      version: 'v1',
      keyId: 'key-A',
      iv: '',
      ciphertext: '',
      tag: '',
    }),
    'x'.repeat(2049),
  ])('rejects malformed protected envelopes', (protectedValue) => {
    expectCode(
      () =>
        service().unprotectDestination({
          challengeId: 'challenge-1',
          type: 'PHONE',
          protectedValue,
        }),
      'CONTACT_CRYPTO_INVALID_INPUT',
    );
  });

  it('is durable across service instances', () => {
    const env = environment();
    const protectedValue = service(env).protectDestination({
      challengeId: 'challenge-1',
      type: 'EMAIL',
      plaintext: 'citizen@example.test',
    });
    expect(
      service(env).unprotectDestination({
        challengeId: 'challenge-1',
        type: 'EMAIL',
        protectedValue,
      }),
    ).toBe('citizen@example.test');
  });

  it('reads old keys while writing with the new active key', () => {
    const oldValue = service().protectDestination({
      challengeId: 'challenge-1',
      type: 'PHONE',
      plaintext: '+15145550123',
    });
    const rotated = service(
      environment({
        activeKeyId: 'key-B',
        keys: { 'key-A': key(1), 'key-B': key(2) },
      }),
    );
    expect(
      rotated.unprotectDestination({
        challengeId: 'challenge-1',
        type: 'PHONE',
        protectedValue: oldValue,
      }),
    ).toBe('+15145550123');
    const newEnvelope = JSON.parse(
      rotated.protectDestination({
        challengeId: 'challenge-2',
        type: 'PHONE',
        plaintext: '+15145550124',
      }),
    ) as { keyId: string };
    expect(newEnvelope.keyId).toBe('key-B');
  });

  it('does not try another key when the envelope key is unavailable', () => {
    const protectedValue = service().protectDestination({
      challengeId: 'challenge-1',
      type: 'PHONE',
      plaintext: '+15145550123',
    });
    const withoutOldKey = service(
      environment({ activeKeyId: 'key-B', keys: { 'key-B': key(2) } }),
    );
    expectCode(
      () =>
        withoutOldKey.unprotectDestination({
          challengeId: 'challenge-1',
          type: 'PHONE',
          protectedValue,
        }),
      'CONTACT_CRYPTO_KEY_UNAVAILABLE',
    );
  });

  it('fails authentication when a key ID resolves to different material', () => {
    const protectedValue = service().protectDestination({
      challengeId: 'challenge-1',
      type: 'PHONE',
      plaintext: '+15145550123',
    });
    expectCode(
      () =>
        service(
          environment({ keys: { 'key-A': key(2) } }),
        ).unprotectDestination({
          challengeId: 'challenge-1',
          type: 'PHONE',
          protectedValue,
        }),
      'CONTACT_CRYPTO_AUTHENTICATION_FAILED',
    );
  });

  it('produces deterministic, type-separated keyed fingerprints', () => {
    const authority = service();
    const phone = authority.fingerprintDestination({
      type: 'PHONE',
      canonicalDestination: '+15145550123',
    });
    expect(phone).toMatch(/^[0-9a-f]{64}$/);
    expect(
      authority.fingerprintDestination({
        type: 'PHONE',
        canonicalDestination: '+15145550123',
      }),
    ).toBe(phone);
    expect(
      authority.fingerprintDestination({
        type: 'EMAIL',
        canonicalDestination: '+15145550123',
      }),
    ).not.toBe(phone);
    expect(
      authority.fingerprintDestination({
        type: 'PHONE',
        canonicalDestination: '+15145550124',
      }),
    ).not.toBe(phone);
  });

  it('changes fingerprints when the dedicated key changes', () => {
    const input = {
      type: 'EMAIL' as const,
      canonicalDestination: 'citizen@example.test',
    };
    expect(service().fingerprintDestination(input)).not.toBe(
      service(environment({ fingerprintKey: key(10) })).fingerprintDestination(
        input,
      ),
    );
  });

  it('returns only stable PII-safe errors', () => {
    const plaintext = 'citizen@example.test';
    const protectedValue = service().protectDestination({
      challengeId: 'challenge-1',
      type: 'EMAIL',
      plaintext,
    });
    const envelope = JSON.parse(protectedValue) as Record<string, string>;
    const tag = Buffer.from(envelope.tag, 'base64url');
    tag[0] ^= 1;
    envelope.tag = tag.toString('base64url');
    try {
      service().unprotectDestination({
        challengeId: 'challenge-1',
        type: 'EMAIL',
        protectedValue: JSON.stringify(envelope),
      });
    } catch (error) {
      const output = JSON.stringify(error);
      expect(output).not.toContain(plaintext);
      expect(output).not.toContain(envelope.ciphertext);
      expect(output).not.toContain(key(1));
    }
  });
});

describe('Population contact crypto configuration', () => {
  it('distinguishes missing, partial and valid configuration', () => {
    expect(getPopulationContactCryptoStatus({})).toBe('NOT_CONFIGURED');
    expect(
      getPopulationContactCryptoStatus({
        POPULATION_CONTACT_CHANGE_ACTIVE_KEY_ID: 'key-A',
      }),
    ).toBe('INVALID');
    expect(getPopulationContactCryptoStatus(environment())).toBe('READY');
  });

  it('fails runtime operations closed when configuration is absent', () => {
    expectCode(
      () =>
        service({}).protectDestination({
          challengeId: 'challenge-1',
          type: 'EMAIL',
          plaintext: 'citizen@example.test',
        }),
      'CONTACT_CRYPTO_NOT_CONFIGURED',
    );
  });

  it.each([
    ['malformed JSON', '{'],
    ['array', '[]'],
    ['nested value', JSON.stringify({ 'key-A': { value: key(1) } })],
    ['unknown active key', JSON.stringify({ 'key-B': key(1) })],
    ['wrong key length', JSON.stringify({ 'key-A': key(1).slice(4) })],
    ['unsafe key ID', JSON.stringify({ '../key': key(1) })],
    ['non-canonical JSON', `{ "key-A": "${key(1)}" }`],
    ['duplicate key IDs', `{"key-A":"${key(1)}","key-A":"${key(2)}"}`],
  ])('rejects %s', (_name, keyring) => {
    const env = environment();
    env.POPULATION_CONTACT_CHANGE_ENCRYPTION_KEYS = keyring;
    expect(getPopulationContactCryptoStatus(env)).toBe('INVALID');
  });

  it('rejects duplicate encryption material', () => {
    expect(
      getPopulationContactCryptoStatus(
        environment({
          keys: { 'key-A': key(1), 'key-B': key(1) },
        }),
      ),
    ).toBe('INVALID');
  });

  it('rejects an excessive number of configured keys', () => {
    const keys = Object.fromEntries(
      Array.from({ length: 11 }, (_, index) => [
        `key-${index}`,
        key(index + 1),
      ]),
    );
    expect(
      getPopulationContactCryptoStatus(
        environment({ activeKeyId: 'key-0', keys }),
      ),
    ).toBe('INVALID');
  });

  it('rejects fingerprint/encryption key reuse', () => {
    expect(
      getPopulationContactCryptoStatus(environment({ fingerprintKey: key(1) })),
    ).toBe('INVALID');
  });

  it.each([
    'POPULATION_OTP_SECRET',
    'POPULATION_ACCESS_SECRET',
    'POPULATION_LOCATION_TOKEN_SECRET',
    'POPULATION_ACCESS_REQUEST_TOKEN_SECRET',
    'POPULATION_BREVO_WEBHOOK_SECRET',
    'POPULATION_BREVO_SMS_WEBHOOK_SECRET',
  ])('rejects reuse with %s', (name) => {
    const env = environment();
    env[name] = key(1);
    expect(getPopulationContactCryptoStatus(env)).toBe('INVALID');
  });

  it('keeps runtime parsing consistent with READY readiness', () => {
    const env = environment();
    expect(getPopulationContactCryptoStatus(env)).toBe('READY');
    expect(() =>
      service(env).protectDestination({
        challengeId: 'challenge-1',
        type: 'PHONE',
        plaintext: '+15145550123',
      }),
    ).not.toThrow();
  });
});
