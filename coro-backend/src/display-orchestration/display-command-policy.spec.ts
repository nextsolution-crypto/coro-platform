import { generateKeyPairSync, sign } from 'node:crypto';
import { canonicalize } from '../display-player/manifest-validator';
import {
  canTransitionDelivery,
  commandPriority,
  evaluatePlayerCommand,
  type PlayerCommandEnvelope,
} from './display-command-policy';
import {
  verifyPlayerCommand,
  type SignedDisplayCommand,
} from './player-command-verifier';

const command = (
  overrides: Partial<PlayerCommandEnvelope> = {},
): PlayerCommandEnvelope => ({
  commandId: 'command-1',
  organizationId: 'org-a',
  buildingId: 'building-a',
  incidentEventId: 'incident-a',
  type: 'ENTER_EMERGENCY',
  priority: 'EMERGENCY_REAL',
  sequence: 2,
  issuedAt: new Date('2026-11-12T12:00:00.000Z').toISOString(),
  ...overrides,
});

describe('DISPLAY-07 deterministic command policy', () => {
  it('orders real emergency above exercise and normal modes', () => {
    expect(commandPriority(false)).toBe('EMERGENCY_REAL');
    expect(commandPriority(true)).toBe('EMERGENCY_EXERCISE');
    expect(
      evaluatePlayerCommand(
        { priority: 'EMERGENCY_EXERCISE', sequence: 1 },
        command(),
      ).accepted,
    ).toBe(true);
  });

  it('rejects replay and rollback sequences', () => {
    expect(
      evaluatePlayerCommand(
        { priority: 'NORMAL_CYCLE', sequence: 2 },
        command(),
      ).reason,
    ).toBe('COMMAND_SEQUENCE_STALE');
  });

  it('does not let an exercise replace a real emergency', () => {
    const result = evaluatePlayerCommand(
      {
        priority: 'EMERGENCY_REAL',
        sequence: 1,
        incidentEventId: 'incident-a',
      },
      command({ type: 'ENTER_EXERCISE', priority: 'EMERGENCY_EXERCISE' }),
    );
    expect(result).toMatchObject({
      accepted: false,
      reason: 'COMMAND_PRIORITY_LOWER',
    });
  });

  it('requires clear to address the active incident', () => {
    const result = evaluatePlayerCommand(
      {
        priority: 'EMERGENCY_REAL',
        sequence: 1,
        incidentEventId: 'incident-a',
      },
      command({ type: 'APPROVE_CLEAR', incidentEventId: 'incident-b' }),
    );
    expect(result.reason).toBe('CLEAR_INCIDENT_MISMATCH');
  });

  it('accepts a governed clear with matching incident and preserves sequence', () => {
    const result = evaluatePlayerCommand(
      {
        priority: 'EMERGENCY_REAL',
        sequence: 1,
        incidentEventId: 'incident-a',
      },
      command({ type: 'APPROVE_CLEAR' }),
    );
    expect(result).toEqual({
      accepted: true,
      reason: 'GOVERNED_CLEAR_ACCEPTED',
      next: { priority: 'NORMAL_CYCLE', sequence: 2, commandId: 'command-1' },
    });
  });

  it('defines forward-only acknowledgement transitions', () => {
    expect(canTransitionDelivery('QUEUED', 'DELIVERED')).toBe(true);
    expect(canTransitionDelivery('DELIVERED', 'RECEIVED')).toBe(true);
    expect(canTransitionDelivery('RECEIVED', 'APPLIED')).toBe(true);
    expect(canTransitionDelivery('APPLIED', 'RECEIVED')).toBe(false);
    expect(canTransitionDelivery('FAILED', 'APPLIED')).toBe(false);
  });
});

describe('DISPLAY-07 player command authenticity and scope', () => {
  const pair = generateKeyPairSync('ed25519');
  const publicPem = pair.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString();
  const payload: SignedDisplayCommand['payload'] = {
    ...command(),
    schemaVersion: 1,
    targetScope: { deviceIds: ['device-a'] },
    policyVersion: 'DISPLAY-07/1',
  };
  const signed = (
    value: SignedDisplayCommand['payload'] = payload,
  ): SignedDisplayCommand => ({
    keyId: 'test-key',
    algorithm: 'Ed25519',
    payload: value,
    signature: sign(
      null,
      Buffer.from(canonicalize(value)),
      pair.privateKey,
    ).toString('base64'),
  });
  const expected = {
    deviceId: 'device-a',
    organizationId: 'org-a',
    buildingId: 'building-a',
  };

  it('accepts an authentic command in the exact tenant, building and device scope', () => {
    expect(() =>
      verifyPlayerCommand(
        signed(),
        new Map([['test-key', publicPem]]),
        expected,
        new Date('2026-11-12T12:01:00Z'),
      ),
    ).not.toThrow();
  });

  it('rejects an unknown signing key', () => {
    expect(() => verifyPlayerCommand(signed(), new Map(), expected)).toThrow(
      'COMMAND_SIGNER_UNTRUSTED',
    );
  });

  it.each([
    ['tenant', { ...expected, organizationId: 'org-b' }],
    ['building', { ...expected, buildingId: 'building-b' }],
    ['device', { ...expected, deviceId: 'device-b' }],
  ])('rejects foreign %s scope', (_label, scope) => {
    expect(() =>
      verifyPlayerCommand(signed(), new Map([['test-key', publicPem]]), scope),
    ).toThrow('COMMAND_SCOPE_MISMATCH');
  });

  it('rejects a forged payload', () => {
    const forged = signed();
    forged.payload.sequence = 99;
    expect(() =>
      verifyPlayerCommand(forged, new Map([['test-key', publicPem]]), expected),
    ).toThrow('COMMAND_SIGNATURE_INVALID');
  });

  it('rejects a command issued implausibly in the future', () => {
    const future = { ...payload, issuedAt: '2027-01-01T00:00:00.000Z' };
    expect(() =>
      verifyPlayerCommand(
        signed(future),
        new Map([['test-key', publicPem]]),
        expected,
        new Date('2026-11-12T12:00:00Z'),
      ),
    ).toThrow('COMMAND_TIME_INVALID');
  });
});
