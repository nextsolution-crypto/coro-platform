import { Injectable } from '@nestjs/common';
import { PhoneNumberService } from './phone-number.service';
import type {
  PopulationPhoneAuditInput,
  PopulationPhoneAuditReport,
  PopulationPhoneAuditRow,
  PopulationPhoneBackfillDecision,
  PopulationPhoneClassification,
  PopulationPhoneCollisionGroup,
} from './population-phone-audit.types';

const CA_CONTEXT = { defaultCountry: 'CA' as const, purpose: 'SMS' as const };
const INTERNATIONAL_CONTEXT = { purpose: 'SMS' as const };
const EXTENSION_PATTERN = /\b(?:ext(?:ension)?|x)\b|#/iu;

type Classified = {
  input: PopulationPhoneAuditInput;
  baseClassification: Exclude<PopulationPhoneClassification, 'COLLISION'>;
  canonical: string | null;
  canonicalValid: boolean | null;
  canonicalMatchesRaw: boolean | null;
  issueCodes: string[];
};

@Injectable()
export class PopulationPhoneAuditService {
  constructor(private readonly phoneNumbers = new PhoneNumberService()) {}

  audit(
    inputs: PopulationPhoneAuditInput[],
    options: { detailedCollisions?: boolean } = {},
  ): PopulationPhoneAuditReport {
    const classified = inputs.map((input) => this.classify(input));
    const sameProgramGroups = this.groupCanonical(classified, true);
    const collisionKeys = new Set(
      [...sameProgramGroups.entries()]
        .filter(([, rows]) => rows.length > 1)
        .map(([key]) => key),
    );
    const crossProgramGroups = [
      ...this.groupCanonical(classified, false).values(),
    ].filter(
      (rows) => new Set(rows.map((row) => row.input.programId)).size > 1,
    );

    const rows = classified.map((entry) => {
      const collision =
        entry.canonical !== null &&
        collisionKeys.has(`${entry.input.programId}\u0000${entry.canonical}`);
      return this.toSafeRow(entry, collision);
    });
    const collisionGroups = [...sameProgramGroups.entries()]
      .filter(([, members]) => members.length > 1)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, members], index) =>
        this.toCollisionGroup(
          members,
          `COLLISION-${String(index + 1).padStart(4, '0')}`,
        ),
      );

    const aggregate = this.aggregate(
      inputs,
      rows,
      collisionGroups,
      crossProgramGroups.length,
    );
    const report: PopulationPhoneAuditReport = {
      aggregate,
      byStatus: this.countBy(rows, (row) => row.status),
      bySmsEnabled: this.countBy(rows, (row) => String(row.smsEnabled)),
      byVerification: this.countBy(rows, (row) =>
        row.verified ? 'VERIFIED' : 'UNVERIFIED',
      ),
      byProgram: this.countBy(rows, (row) => row.programId),
    };
    if (options.detailedCollisions) {
      report.collisionGroups = collisionGroups;
      report.collisionRows = rows.filter(
        (row) => row.classification === 'COLLISION',
      );
    }
    return report;
  }

  private classify(input: PopulationPhoneAuditInput): Classified {
    const phone = input.phone?.normalize('NFKC').trim() ?? '';
    const issueCodes: string[] = [];
    let canonical: string | null = null;
    let baseClassification: Classified['baseClassification'];

    if (!phone) {
      baseClassification = 'EMPTY';
    } else if (EXTENSION_PATTERN.test(phone)) {
      baseClassification = 'EXTENSION_PRESENT';
    } else if (
      /^\+?[\d\s().\-\u00a0\u202f]+$/u.test(phone) &&
      phone.replace(/\D/gu, '').length <= 6
    ) {
      baseClassification = 'SHORT_CODE';
    } else {
      try {
        canonical = this.phoneNumbers.normalizePhoneNumber(
          phone,
          CA_CONTEXT,
        ).canonical;
        baseClassification =
          phone === canonical ? 'ALREADY_CANONICAL' : 'VALID_UNAMBIGUOUS';
      } catch {
        canonical = this.normalizePossibleMissingCountryMarker(phone);
        baseClassification = canonical ? 'AMBIGUOUS_COUNTRY' : 'INVALID';
        canonical = null;
      }
    }

    let canonicalValid: boolean | null = null;
    let canonicalMatchesRaw: boolean | null = null;
    if (input.phoneCanonical !== null) {
      try {
        const persisted = this.phoneNumbers.normalizePhoneNumber(
          input.phoneCanonical,
          INTERNATIONAL_CONTEXT,
        ).canonical;
        canonicalValid = persisted === input.phoneCanonical;
        if (!canonicalValid) issueCodes.push('MALFORMED_PHONE_CANONICAL');
        if (canonical !== null) {
          canonicalMatchesRaw = persisted === canonical;
          if (!canonicalMatchesRaw) issueCodes.push('CANONICAL_RAW_MISMATCH');
        }
      } catch {
        canonicalValid = false;
        issueCodes.push('MALFORMED_PHONE_CANONICAL');
      }
    }

    return {
      input,
      baseClassification,
      canonical,
      canonicalValid,
      canonicalMatchesRaw,
      issueCodes: [...new Set(issueCodes)].sort(),
    };
  }

  private normalizePossibleMissingCountryMarker(phone: string): string | null {
    if (phone.startsWith('+') || !/^\d[\d\s().\-\u00a0\u202f]+$/u.test(phone))
      return null;
    const digits = phone.replace(/\D/gu, '');
    try {
      return this.phoneNumbers.normalizePhoneNumber(
        `+${digits}`,
        INTERNATIONAL_CONTEXT,
      ).canonical;
    } catch {
      return null;
    }
  }

  private groupCanonical(classified: Classified[], includeProgram: boolean) {
    const groups = new Map<string, Classified[]>();
    for (const row of classified) {
      if (!row.canonical) continue;
      const key = includeProgram
        ? `${row.input.programId}\u0000${row.canonical}`
        : row.canonical;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return groups;
  }

  private toSafeRow(
    entry: Classified,
    collision: boolean,
  ): PopulationPhoneAuditRow {
    const malformedOrMismatch =
      entry.canonicalValid === false || entry.canonicalMatchesRaw === false;
    let backfillDecision: PopulationPhoneBackfillDecision;
    if (collision || malformedOrMismatch) backfillDecision = 'REVIEW_REQUIRED';
    else if (entry.input.phoneCanonical !== null)
      backfillDecision = 'ALREADY_COMPLETE';
    else if (
      entry.baseClassification === 'ALREADY_CANONICAL' ||
      entry.baseClassification === 'VALID_UNAMBIGUOUS'
    ) {
      backfillDecision = 'SAFE_TO_BACKFILL';
    } else if (
      entry.baseClassification === 'AMBIGUOUS_COUNTRY' ||
      entry.baseClassification === 'EXTENSION_PRESENT'
    ) {
      backfillDecision = 'REVIEW_REQUIRED';
    } else backfillDecision = 'NOT_BACKFILLABLE';

    return {
      subscriberId: entry.input.id,
      programId: entry.input.programId,
      classification: collision ? 'COLLISION' : entry.baseClassification,
      baseClassification: entry.baseClassification,
      backfillDecision,
      maskedPhone: this.mask(entry.input.phone, entry.canonical),
      status: entry.input.status,
      smsEnabled: entry.input.smsEnabled,
      emailEnabled: entry.input.emailEnabled,
      verified: entry.input.verifiedAt !== null,
      hasPhoneCanonical: entry.input.phoneCanonical !== null,
      canonicalValid: entry.canonicalValid,
      canonicalMatchesRaw: entry.canonicalMatchesRaw,
      consentEvidenceExists: entry.input.consentEvidenceCount > 0,
      historicalAlertDeliveriesExist: entry.input.historicalDeliveryCount > 0,
      createdAt: entry.input.createdAt.toISOString(),
      issueCodes: entry.issueCodes,
    };
  }

  private mask(raw: string | null, canonical: string | null): string | null {
    if (!raw?.trim()) return null;
    if (canonical) return this.phoneNumbers.maskPhoneNumber(canonical);
    const digits = raw.replace(/\D/gu, '');
    return digits ? `***${digits.slice(-2)}` : '***';
  }

  private toCollisionGroup(
    members: Classified[],
    collisionGroupId: string,
  ): PopulationPhoneCollisionGroup {
    const created = members.map((member) => member.input.createdAt.getTime());
    return {
      collisionGroupId,
      programId: members[0].input.programId,
      subscriberIds: members.map((member) => member.input.id).sort(),
      rowCount: members.length,
      statuses: [
        ...new Set(members.map((member) => member.input.status)),
      ].sort(),
      smsEnabledValues: [
        ...new Set(members.map((member) => member.input.smsEnabled)),
      ].sort(),
      emailEnabledValues: [
        ...new Set(members.map((member) => member.input.emailEnabled)),
      ].sort(),
      verifiedCount: members.filter((member) => member.input.verifiedAt).length,
      existingCanonicalCount: members.filter(
        (member) => member.input.phoneCanonical,
      ).length,
      activeOrPendingCount: members.filter((member) =>
        ['ACTIVE', 'PENDING_VERIFICATION'].includes(member.input.status),
      ).length,
      multipleActiveOrPending:
        members.filter((member) =>
          ['ACTIVE', 'PENDING_VERIFICATION'].includes(member.input.status),
        ).length > 1,
      consentEvidenceExists: members.some(
        (member) => member.input.consentEvidenceCount > 0,
      ),
      historicalAlertDeliveriesExist: members.some(
        (member) => member.input.historicalDeliveryCount > 0,
      ),
      oldestCreatedAt: new Date(Math.min(...created)).toISOString(),
      newestCreatedAt: new Date(Math.max(...created)).toISOString(),
    };
  }

  private aggregate(
    inputs: PopulationPhoneAuditInput[],
    rows: PopulationPhoneAuditRow[],
    collisions: PopulationPhoneCollisionGroup[],
    crossProgramReuseGroups: number,
  ) {
    const countClassification = (
      classification: PopulationPhoneClassification,
    ) =>
      rows.filter(
        (row) =>
          row.classification === classification ||
          row.baseClassification === classification,
      ).length;
    const countDecision = (decision: PopulationPhoneBackfillDecision) =>
      rows.filter((row) => row.backfillDecision === decision).length;
    return {
      TOTAL_SUBSCRIBERS: inputs.length,
      WITH_PHONE: inputs.filter((input) => Boolean(input.phone?.trim())).length,
      WITHOUT_PHONE: inputs.filter((input) => !input.phone?.trim()).length,
      WITH_PHONE_CANONICAL: inputs.filter(
        (input) => input.phoneCanonical !== null,
      ).length,
      WITHOUT_PHONE_CANONICAL: inputs.filter(
        (input) => input.phoneCanonical === null,
      ).length,
      ALREADY_CANONICAL: countClassification('ALREADY_CANONICAL'),
      VALID_UNAMBIGUOUS: countClassification('VALID_UNAMBIGUOUS'),
      INVALID: countClassification('INVALID'),
      AMBIGUOUS_COUNTRY: countClassification('AMBIGUOUS_COUNTRY'),
      SHORT_CODE: countClassification('SHORT_CODE'),
      EXTENSION_PRESENT: countClassification('EXTENSION_PRESENT'),
      EMPTY: countClassification('EMPTY'),
      COLLISION: rows.filter((row) => row.classification === 'COLLISION')
        .length,
      MALFORMED_PHONE_CANONICAL: rows.filter((row) =>
        row.issueCodes.includes('MALFORMED_PHONE_CANONICAL'),
      ).length,
      CANONICAL_RAW_MISMATCH: rows.filter((row) =>
        row.issueCodes.includes('CANONICAL_RAW_MISMATCH'),
      ).length,
      SAFE_TO_BACKFILL: countDecision('SAFE_TO_BACKFILL'),
      REVIEW_REQUIRED: countDecision('REVIEW_REQUIRED'),
      NOT_BACKFILLABLE: countDecision('NOT_BACKFILLABLE'),
      ALREADY_COMPLETE: countDecision('ALREADY_COMPLETE'),
      SAME_PROGRAM_COLLISION_GROUPS: collisions.length,
      SAME_PROGRAM_COLLISION_ROWS: collisions.reduce(
        (sum, group) => sum + group.rowCount,
        0,
      ),
      CROSS_PROGRAM_REUSE_GROUPS: crossProgramReuseGroups,
    };
  }

  private countBy<T>(rows: T[], key: (row: T) => string) {
    return Object.fromEntries(
      [
        ...rows.reduce((counts, row) => {
          const value = key(row);
          counts.set(value, (counts.get(value) ?? 0) + 1);
          return counts;
        }, new Map<string, number>()),
      ].sort(([left], [right]) => left.localeCompare(right)),
    );
  }
}
