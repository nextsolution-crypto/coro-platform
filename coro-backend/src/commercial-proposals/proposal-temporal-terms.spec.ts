import {
  addCalendarDays,
  addCalendarMonths,
  calculateProposalTemporalTerms,
} from './proposal-temporal-terms';

describe('proposal temporal terms', () => {
  it('uses calendar days and clamps month-end and leap-day anniversaries', () => {
    expect(addCalendarDays('2026-10-13', 90)).toBe('2027-01-11');
    expect(addCalendarMonths('2024-02-29', 12)).toBe('2025-02-28');
    expect(addCalendarMonths('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('calculates governed dates without resolving the renewal term', () => {
    const result = calculateProposalTemporalTerms({
      createdAt: new Date('2026-10-13T02:00:00Z'),
      sentAt: new Date('2026-10-13T14:00:00Z'),
      acceptedAt: null,
      serviceStartDate: new Date('2026-11-01T00:00:00Z'),
      initialInvoiceDate: new Date('2026-11-01T00:00:00Z'),
      externalSignatureDate: null,
      externalSignatureEvidence: null,
      offerValidityDays: 90,
      initialTermMonths: 12,
      paymentNetDays: 30,
      automaticRenewal: true,
      nonrenewalNoticeDays: 30,
      renewalTermMonths: null,
      contractualTimezone: 'America/Toronto',
      calendarConventionVersion: 'proposal-calendar/v1',
    });
    expect(result.offerExpirationDate).toBe('2027-01-11');
    expect(result.initialTermEndExclusive).toBe('2027-11-01');
    expect(result.initialTermLastCoveredDate).toBe('2027-10-31');
    expect(result.nonrenewalDeadline).toBe('2027-10-02');
    expect(result.paymentDueDate).toBe('2026-12-01');
    expect(result.blockers).toEqual(['RENEWAL_TERM_MONTHS_TO_CONFIRM']);
  });

  it('derives civil event dates using the contractual timezone', () => {
    const base = {
      createdAt: new Date('2026-03-08T04:30:00Z'),
      sentAt: null,
      acceptedAt: null,
      serviceStartDate: null,
      initialInvoiceDate: null,
      externalSignatureDate: null,
      externalSignatureEvidence: null,
      offerValidityDays: 90,
      initialTermMonths: 12,
      paymentNetDays: 30,
      automaticRenewal: true,
      nonrenewalNoticeDays: 30,
      renewalTermMonths: null,
      contractualTimezone: 'America/Toronto',
      calendarConventionVersion: 'proposal-calendar/v1',
    };
    expect(calculateProposalTemporalTerms(base).creationDate).toBe(
      '2026-03-07',
    );
  });
});
