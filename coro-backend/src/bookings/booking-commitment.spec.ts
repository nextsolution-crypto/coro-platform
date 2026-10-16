import { BadRequestException } from '@nestjs/common';
import {
  assertExpectedCommitment,
  commitmentFingerprint,
} from './booking-commitment';

describe('canonical booking commitment', () => {
  const input = {
    bookingId: 'booking',
    projectId: 'project',
    activityId: 'activity',
    buildingId: 'building',
    advisorId: 'advisor',
    startAt: new Date('2026-11-01T13:00:00.000Z'),
    durationMinutes: 90,
  };

  it('is deterministic and changes for every material advisor commitment value', () => {
    const original = commitmentFingerprint(input);
    expect(commitmentFingerprint({ ...input })).toBe(original);
    expect(
      commitmentFingerprint({
        ...input,
        startAt: new Date('2026-11-01T14:00:00.000Z'),
      }),
    ).not.toBe(original);
    expect(commitmentFingerprint({ ...input, durationMinutes: 120 })).not.toBe(
      original,
    );
    expect(
      commitmentFingerprint({ ...input, advisorId: 'other-advisor' }),
    ).not.toBe(original);
    expect(
      commitmentFingerprint({ ...input, buildingId: 'other-building' }),
    ).not.toBe(original);
    expect(
      commitmentFingerprint({ ...input, activityId: 'other-activity' }),
    ).not.toBe(original);
  });

  it('requires the exact current proposed version and fingerprint', () => {
    const canonicalFingerprint = commitmentFingerprint(input);
    expect(() =>
      assertExpectedCommitment(
        { id: 'version', canonicalFingerprint, status: 'PROPOSED' },
        'version',
        canonicalFingerprint,
      ),
    ).not.toThrow();
    expect(() =>
      assertExpectedCommitment(
        { id: 'version', canonicalFingerprint, status: 'PROPOSED' },
        'stale',
        canonicalFingerprint,
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      assertExpectedCommitment(
        { id: 'version', canonicalFingerprint, status: 'SUPERSEDED' },
        'version',
        canonicalFingerprint,
      ),
    ).toThrow(BadRequestException);
  });
});
