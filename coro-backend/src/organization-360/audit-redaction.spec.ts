import { redactAuditLabel, redactAuditValue } from './audit-redaction';

describe('Organization 360 audit redaction', () => {
  it('redacte récursivement secrets, tokens, digests et MFA', () => {
    expect(
      redactAuditValue({
        password: 'hash',
        nested: { refreshTokenDigest: 'digest', mfaVerifier: 'verifier' },
        safe: 'ACTIVE',
      }),
    ).toEqual({
      password: '[REDACTED]',
      nested: { refreshTokenDigest: '[REDACTED]', mfaVerifier: '[REDACTED]' },
      safe: 'ACTIVE',
    });
  });

  it('masque les courriels et bearer tokens dans les champs libres', () => {
    expect(redactAuditLabel('person.long@example.test')).toBe(
      'per***@example.test',
    );
    expect(redactAuditValue('Bearer very-secret-value')).toBe(
      'Bearer [REDACTED]',
    );
  });
});
