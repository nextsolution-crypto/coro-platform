import {
  ENTITLEMENT_CLOCK_TOLERANCE_MS,
  SOURCE_RELATIONSHIPS,
  TEMPORARY_ENTITLEMENT_MAX_DAYS,
  rejectPendingRevision,
  validateEffectiveFrom,
  validateTemporaryPeriod,
} from './entitlement-policies';

describe('Phase 3B entitlement policies', () => {
  const now = new Date('2026-10-01T12:00:00.000Z');

  it('fixes the approved source matrix and 30-day policy', () => {
    expect(TEMPORARY_ENTITLEMENT_MAX_DAYS).toBe(30);
    expect(SOURCE_RELATIONSHIPS).toEqual({
      CONTRACT: ['DIRECT', 'PARTNER'],
      DISTRIBUTION: ['PARTNER'],
      MANUAL_OVERRIDE: ['DIRECT', 'PARTNER'],
      TRIAL: ['DIRECT', 'PARTNER', 'NULL'],
      INTERNAL: ['INTERNAL'],
    });
  });

  it('allows five minutes of transit but rejects business retroactivity', () => {
    expect(() =>
      validateEffectiveFrom(
        new Date(now.getTime() - ENTITLEMENT_CLOCK_TOLERANCE_MS),
        now,
      ),
    ).not.toThrow();
    expect(() =>
      validateEffectiveFrom(
        new Date(now.getTime() - ENTITLEMENT_CLOCK_TOLERANCE_MS - 1),
        now,
      ),
    ).toThrow('RETROACTIVE_ENTITLEMENT_MUTATION_FORBIDDEN');
  });

  it('rejects a second mutation while one future revision exists', () => {
    expect(() =>
      rejectPendingRevision([{ effectiveFrom: new Date('2026-10-02') }], now),
    ).toThrow('FUTURE_MUTATION_ALREADY_SCHEDULED');
  });

  it('requires temporary grants to expire within thirty days', () => {
    expect(() =>
      validateTemporaryPeriod(now, new Date('2026-10-31T12:00:00.000Z')),
    ).not.toThrow();
    expect(() =>
      validateTemporaryPeriod(now, new Date('2026-11-01T12:00:00.001Z')),
    ).toThrow('TEMPORARY_ENTITLEMENT_MAX_30_DAYS');
  });
});
