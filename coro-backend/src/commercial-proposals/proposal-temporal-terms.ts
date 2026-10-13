export const PROPOSAL_TEMPORAL_DEFAULTS = Object.freeze({
  offerValidityDays: 90,
  initialTermMonths: 12,
  paymentNetDays: 30,
  automaticRenewal: true,
  nonrenewalNoticeDays: 30,
  renewalTermMonths: null,
  contractualTimezone: 'America/Toronto',
  calendarConventionVersion: 'proposal-calendar/v1',
});

const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseCivilDate(value: string): Date {
  const match = CIVIL_DATE.exec(value);
  if (!match) throw new Error('INVALID_CIVIL_DATE');
  const date = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
  if (formatCivilDate(date) !== value) throw new Error('INVALID_CIVIL_DATE');
  return date;
}

export function formatCivilDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function instantCivilDate(value: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function addCalendarDays(value: string, days: number): string {
  const date = parseCivilDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatCivilDate(date);
}

export function addCalendarMonths(value: string, months: number): string {
  const source = parseCivilDate(value);
  const targetMonth = source.getUTCMonth() + months;
  const targetYear = source.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();
  return formatCivilDate(
    new Date(
      Date.UTC(
        targetYear,
        normalizedMonth,
        Math.min(source.getUTCDate(), lastDay),
      ),
    ),
  );
}

export type ProposalTemporalSource = {
  createdAt: Date;
  sentAt: Date | null;
  acceptedAt: Date | null;
  serviceStartDate: Date | null;
  initialInvoiceDate: Date | null;
  externalSignatureDate: Date | null;
  externalSignatureEvidence: string | null;
  offerValidityDays: number;
  initialTermMonths: number;
  paymentNetDays: number;
  automaticRenewal: boolean;
  nonrenewalNoticeDays: number;
  renewalTermMonths: number | null;
  contractualTimezone: string;
  calendarConventionVersion: string;
};

export function calculateProposalTemporalTerms(source: ProposalTemporalSource) {
  const civil = (value: Date | null) => (value ? formatCivilDate(value) : null);
  const issuanceDate = source.sentAt
    ? instantCivilDate(source.sentAt, source.contractualTimezone)
    : null;
  const serviceStartDate = civil(source.serviceStartDate);
  const initialInvoiceDate = civil(source.initialInvoiceDate);
  const initialTermEnd = serviceStartDate
    ? addCalendarMonths(serviceStartDate, source.initialTermMonths)
    : null;

  const blockers: string[] = [];
  if (!serviceStartDate) blockers.push('SERVICE_START_DATE_REQUIRED');
  if (!initialInvoiceDate) blockers.push('INITIAL_INVOICE_DATE_REQUIRED');
  if (source.automaticRenewal && source.renewalTermMonths === null)
    blockers.push('RENEWAL_TERM_MONTHS_TO_CONFIRM');
  if (source.externalSignatureDate && !source.externalSignatureEvidence?.trim())
    blockers.push('EXTERNAL_SIGNATURE_EVIDENCE_REQUIRED');

  return {
    convention: source.calendarConventionVersion,
    timezone: source.contractualTimezone,
    creationDate: instantCivilDate(
      source.createdAt,
      source.contractualTimezone,
    ),
    issuanceDate,
    offerExpirationDate: issuanceDate
      ? addCalendarDays(issuanceDate, source.offerValidityDays)
      : null,
    serviceStartDate,
    initialTermEndExclusive: initialTermEnd,
    initialTermLastCoveredDate: initialTermEnd
      ? addCalendarDays(initialTermEnd, -1)
      : null,
    nonrenewalDeadline: initialTermEnd
      ? addCalendarDays(initialTermEnd, -source.nonrenewalNoticeDays)
      : null,
    initialInvoiceDate,
    paymentDueDate: initialInvoiceDate
      ? addCalendarDays(initialInvoiceDate, source.paymentNetDays)
      : null,
    electronicSignatureDate: source.acceptedAt
      ? instantCivilDate(source.acceptedAt, source.contractualTimezone)
      : null,
    externalSignatureDate: civil(source.externalSignatureDate),
    renewalTermMonths: source.renewalTermMonths,
    advisoryOnly: true,
    blockers,
    issuanceReady: blockers.length === 0,
  };
}
