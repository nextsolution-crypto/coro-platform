import {
  PopulationContactChangePurpose,
  PopulationContactChangeStatus,
  PopulationContactChangeType,
} from '@prisma/client';
import { PopulationContactChangeService } from './population-contact-change.service';
import { PopulationContactChangeError } from './population-contact-change.errors';

describe('PopulationContactChangeService security primitives', () => {
  const env = {
    POPULATION_OTP_SECRET: 'otp-secret-which-is-long-enough-for-tests',
    POPULATION_ACCESS_SECRET: 'access-secret-which-is-long-enough-tests',
  } as NodeJS.ProcessEnv;
  const crypto = {
    fingerprintDestination: jest.fn(
      ({ type, canonicalDestination }) => `${type}:${canonicalDestination}`,
    ),
    protectDestination: jest.fn(() => 'protected'),
    unprotectDestination: jest.fn(() => '+15145550199'),
  };
  const phones = {
    normalizePhoneNumber: jest.fn(() => ({ canonical: '+15145550199' })),
    maskPhoneNumber: jest.fn(() => '*******0199'),
  };
  const service = new PopulationContactChangeService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    crypto as never,
    phones as never,
    {} as never,
    env,
  );

  it('canonicalizes email without provider-specific rewriting', () => {
    expect(service['canonicalEmail']('  Citizen.Tag+safe@Example.COM ')).toBe(
      'citizen.tag+safe@example.com',
    );
  });

  it('rejects malformed email', () => {
    expect(() => service['canonicalEmail']('not-an-email')).toThrow();
  });

  it('hashes OTP without retaining plaintext and compares in constant-time form', () => {
    const hash = service['hashCode']('123456');
    expect(hash).not.toContain('123456');
    expect(service['codeMatches']('123456', hash)).toBe(true);
    expect(service['codeMatches']('654321', hash)).toBe(false);
  });

  it('issues a purpose-, subscriber-, program- and type-bound challenge token', () => {
    const challenge = {
      id: 'challenge-a',
      subscriberId: 'subscriber-a',
      programId: 'program-a',
      type: PopulationContactChangeType.EMAIL,
      expiresAt: new Date(Date.now() + 60_000),
    };
    const token = service['createChallengeToken'](challenge);
    expect(
      service['verifyChallengeToken'](
        token,
        'program-a',
        'subscriber-a',
        PopulationContactChangeType.EMAIL,
      ).challengeId,
    ).toBe('challenge-a');
    expect(() =>
      service['verifyChallengeToken'](
        token,
        'program-a',
        'subscriber-b',
        PopulationContactChangeType.EMAIL,
      ),
    ).toThrow(PopulationContactChangeError);
    expect(() =>
      service['verifyChallengeToken'](
        `${token.slice(0, -1)}x`,
        'program-a',
        'subscriber-a',
        PopulationContactChangeType.EMAIL,
      ),
    ).toThrow(PopulationContactChangeError);
    expect(() =>
      service['verifyChallengeToken'](
        token,
        'program-a',
        'subscriber-a',
        PopulationContactChangeType.PHONE,
      ),
    ).toThrow(PopulationContactChangeError);
  });

  it.each([
    PopulationContactChangeStatus.CANCELLED,
    PopulationContactChangeStatus.SUPERSEDED,
    PopulationContactChangeStatus.ATTEMPTS_EXHAUSTED,
    PopulationContactChangeStatus.DELIVERY_FAILED,
  ])('rejects terminal state %s', (status) => {
    expect(() =>
      service['assertOperational'](
        { id: 'challenge', status, expiresAt: new Date(Date.now() + 60_000) },
        new Date(),
      ),
    ).toThrow(PopulationContactChangeError);
  });

  it('masks response destination and never exposes fingerprint or envelope', () => {
    const response = service['response'](
      {
        id: 'challenge',
        type: PopulationContactChangeType.PHONE,
        purpose: PopulationContactChangePurpose.CHANGE,
        status: PopulationContactChangeStatus.OTP_REQUIRED,
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        proposedDestinationProtected: 'protected',
      },
      false,
    );
    expect(response.maskedProposedDestination).toBe('*******0199');
    expect(response).not.toHaveProperty('proposedDestinationFingerprint');
    expect(response).not.toHaveProperty('proposedDestinationProtected');
  });
});
