import { PopulationSubscriberStatus } from '@prisma/client';
import { PopulationPhoneAuditService } from './population-phone-audit.service';
import type { PopulationPhoneAuditInput } from './population-phone-audit.types';

describe('PopulationPhoneAuditService', () => {
  const service = new PopulationPhoneAuditService();
  const row = (
    id: string,
    phone: string | null,
    overrides: Partial<PopulationPhoneAuditInput> = {},
  ): PopulationPhoneAuditInput => ({
    id,
    programId: 'program-a',
    phone,
    phoneCanonical: null,
    status: PopulationSubscriberStatus.ACTIVE,
    smsEnabled: true,
    emailEnabled: false,
    verifiedAt: new Date('2026-01-02T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    consentEvidenceCount: 0,
    historicalDeliveryCount: 0,
    ...overrides,
  });

  it.each([
    ['canonical', '+15145551234', 'ALREADY_CANONICAL'],
    ['Canadian formatted', '(514) 555-1234', 'VALID_UNAMBIGUOUS'],
    ['international', '+33 1 42 68 53 00', 'VALID_UNAMBIGUOUS'],
    ['invalid', 'not-a-phone', 'INVALID'],
    ['extension', '5145551234 ext 9', 'EXTENSION_PRESENT'],
    ['short code', '911', 'SHORT_CODE'],
    ['empty', '  ', 'EMPTY'],
    ['country ambiguity', '33142685300', 'AMBIGUOUS_COUNTRY'],
  ])('classifies %s', (_label, phone, expected) => {
    const report = service.audit([row('subscriber-1', phone)]);
    expect(report.aggregate[expected]).toBe(1);
  });

  it('reports valid persisted canonical identity as already complete', () => {
    const report = service.audit(
      [
        row('subscriber-1', '(514) 555-1234', {
          phoneCanonical: '+15145551234',
        }),
      ],
      { detailedCollisions: true },
    );
    expect(report.aggregate.ALREADY_COMPLETE).toBe(1);
    expect(report.collisionRows).toEqual([]);
  });

  it.each([
    ['malformed', '+1999', 'MALFORMED_PHONE_CANONICAL'],
    ['mismatch', '+14165551234', 'CANONICAL_RAW_MISMATCH'],
  ])('flags %s phoneCanonical for review', (_label, canonical, issue) => {
    const report = service.audit(
      [row('subscriber-1', '(514) 555-1234', { phoneCanonical: canonical })],
      { detailedCollisions: true },
    );
    expect(report.aggregate.REVIEW_REQUIRED).toBe(1);
    expect(report.collisionRows).toEqual([]);
    expect(report.aggregate[issue]).toBe(1);
  });

  it('detects equivalent same-program identities without selecting a winner', () => {
    const report = service.audit(
      [
        row('subscriber-1', '(514) 555-1234', { consentEvidenceCount: 1 }),
        row('subscriber-2', '+1 514 555 1234', {
          status: PopulationSubscriberStatus.PENDING_VERIFICATION,
          historicalDeliveryCount: 1,
        }),
      ],
      { detailedCollisions: true },
    );
    expect(report.aggregate.SAME_PROGRAM_COLLISION_GROUPS).toBe(1);
    expect(report.aggregate.SAME_PROGRAM_COLLISION_ROWS).toBe(2);
    expect(report.aggregate.REVIEW_REQUIRED).toBe(2);
    expect(report.collisionGroups?.[0]).toMatchObject({
      collisionGroupId: 'COLLISION-0001',
      rowCount: 2,
      multipleActiveOrPending: true,
      consentEvidenceExists: true,
      historicalAlertDeliveriesExist: true,
    });
  });

  it('measures cross-program reuse without treating it as a collision', () => {
    const report = service.audit([
      row('subscriber-1', '(514) 555-1234'),
      row('subscriber-2', '+15145551234', { programId: 'program-b' }),
    ]);
    expect(report.aggregate.CROSS_PROGRAM_REUSE_GROUPS).toBe(1);
    expect(report.aggregate.SAME_PROGRAM_COLLISION_GROUPS).toBe(0);
    expect(report.aggregate.SAFE_TO_BACKFILL).toBe(2);
  });

  it('assigns conservative backfill decisions', () => {
    const report = service.audit([
      row('safe', '(514) 555-1234'),
      row('invalid', 'invalid'),
      row('extension', '5145551234 x 4'),
      row('complete', '+15145550000', { phoneCanonical: '+15145550000' }),
    ]);
    expect(report.aggregate).toMatchObject({
      SAFE_TO_BACKFILL: 1,
      REVIEW_REQUIRED: 1,
      NOT_BACKFILLABLE: 1,
      ALREADY_COMPLETE: 1,
    });
  });

  it('defaults to aggregate-only PII-safe output', () => {
    const report = service.audit([row('subscriber-1', '(514) 555-1234')]);
    const serialized = JSON.stringify(report);
    expect(report).not.toHaveProperty('collisionGroups');
    expect(report).not.toHaveProperty('collisionRows');
    expect(serialized).not.toContain('5145551234');
    expect(serialized).not.toContain('+15145551234');
    expect(serialized).not.toContain('@');
  });

  it('keeps detailed collision output masked and deterministic', () => {
    const input = [
      row('subscriber-2', '+15145551234'),
      row('subscriber-1', '(514) 555-1234'),
    ];
    const first = service.audit(input, { detailedCollisions: true });
    const second = service.audit(input, { detailedCollisions: true });
    expect(first).toEqual(second);
    const serialized = JSON.stringify(first);
    expect(serialized).toContain('+1******1234');
    expect(serialized).not.toContain('+15145551234');
    expect(serialized).not.toContain('(514) 555-1234');
  });
});
