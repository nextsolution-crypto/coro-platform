import {
  CommercialScope,
  EntitlementLifecycle,
  EntitlementLimitType,
  EntitlementSource,
} from '@prisma/client';

export type EntitlementOperation =
  | 'CREATE_GRANT'
  | 'PROVISION_CONTRACT'
  | 'DISTRIBUTE'
  | 'ENABLE'
  | 'DISABLE'
  | 'SET_DISTRIBUTABLE'
  | 'CHANGE_LIMITS'
  | 'CHANGE_DATES'
  | 'SUSPEND'
  | 'RESUME'
  | 'REVOKE'
  | 'CREATE_TRIAL'
  | 'CREATE_MANUAL_OVERRIDE'
  | 'CREATE_INTERNAL';

export interface NormalizedLimit {
  type: EntitlementLimitType;
  metricCode: string;
  unlimited: boolean;
  quantity: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
}

export interface EntitlementCommand {
  operation: EntitlementOperation;
  organizationId: string;
  entitlementId?: string;
  capabilityCode?: string;
  scope?: CommercialScope;
  clientId?: string;
  buildingId?: string;
  source?: EntitlementSource;
  parentEntitlementId?: string;
  sourceContractId?: string;
  sourceContractRevisionId?: string;
  sourceSnapshotLineId?: string;
  provenanceReason?: string;
  enabled?: boolean;
  distributable?: boolean;
  lifecycle?: EntitlementLifecycle;
  effectiveFrom?: Date;
  effectiveUntil?: Date | null;
  limits?: NormalizedLimit[];
  removeAllLimits?: boolean;
  reason: string;
  expectedLockVersion?: number;
  expectedRevisionId?: string;
  acknowledgedWarningCodes: string[];
}

export interface EntitlementWarning {
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  quality: 'CANONICAL' | 'INFERRED' | 'NOT_AVAILABLE';
  capabilityCode: string;
  message: string;
  observedValue: unknown;
  source: string;
  blocking: false;
  acknowledgementRequired: boolean;
}
