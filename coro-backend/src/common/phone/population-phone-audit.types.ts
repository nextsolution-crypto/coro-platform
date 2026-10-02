import type { PopulationSubscriberStatus } from '@prisma/client';

export type PopulationPhoneClassification =
  | 'ALREADY_CANONICAL'
  | 'VALID_UNAMBIGUOUS'
  | 'INVALID'
  | 'AMBIGUOUS_COUNTRY'
  | 'SHORT_CODE'
  | 'EXTENSION_PRESENT'
  | 'EMPTY'
  | 'COLLISION';

export type PopulationPhoneBackfillDecision =
  | 'SAFE_TO_BACKFILL'
  | 'REVIEW_REQUIRED'
  | 'NOT_BACKFILLABLE'
  | 'ALREADY_COMPLETE';

export type PopulationPhoneAuditInput = {
  id: string;
  programId: string;
  phone: string | null;
  phoneCanonical: string | null;
  status: PopulationSubscriberStatus;
  smsEnabled: boolean;
  emailEnabled: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
  consentEvidenceCount: number;
  historicalDeliveryCount: number;
};

export type PopulationPhoneAuditRow = {
  subscriberId: string;
  programId: string;
  classification: PopulationPhoneClassification;
  baseClassification: Exclude<PopulationPhoneClassification, 'COLLISION'>;
  backfillDecision: PopulationPhoneBackfillDecision;
  maskedPhone: string | null;
  status: PopulationSubscriberStatus;
  smsEnabled: boolean;
  emailEnabled: boolean;
  verified: boolean;
  hasPhoneCanonical: boolean;
  canonicalValid: boolean | null;
  canonicalMatchesRaw: boolean | null;
  consentEvidenceExists: boolean;
  historicalAlertDeliveriesExist: boolean;
  createdAt: string;
  issueCodes: string[];
};

export type PopulationPhoneCollisionGroup = {
  collisionGroupId: string;
  programId: string;
  subscriberIds: string[];
  rowCount: number;
  statuses: PopulationSubscriberStatus[];
  smsEnabledValues: boolean[];
  emailEnabledValues: boolean[];
  verifiedCount: number;
  existingCanonicalCount: number;
  activeOrPendingCount: number;
  multipleActiveOrPending: boolean;
  consentEvidenceExists: boolean;
  historicalAlertDeliveriesExist: boolean;
  oldestCreatedAt: string;
  newestCreatedAt: string;
};

export type PopulationPhoneAuditReport = {
  aggregate: Record<string, number>;
  byStatus: Record<string, number>;
  bySmsEnabled: Record<string, number>;
  byVerification: Record<string, number>;
  byProgram: Record<string, number>;
  collisionGroups?: PopulationPhoneCollisionGroup[];
  collisionRows?: PopulationPhoneAuditRow[];
};
