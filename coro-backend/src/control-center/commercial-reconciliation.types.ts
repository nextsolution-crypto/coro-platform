import { CapabilityCode, CommercialScope } from '@prisma/client';

export type DataQuality =
  | 'CANONICAL'
  | 'DERIVED'
  | 'INFERABLE'
  | 'NOT_AVAILABLE';
export type MismatchSeverity =
  | 'INFO'
  | 'WARNING'
  | 'ACTION_REQUIRED'
  | 'UNKNOWN';
export type MismatchCode =
  | 'ACCEPTED_PROPOSAL_WITHOUT_CONTRACT'
  | 'CONTRACT_WITHOUT_ENTITLEMENT'
  | 'CONTRACT_ENTITLEMENT_LIMIT_MISMATCH'
  | 'INVALID_CONTRACT_PROVENANCE'
  | 'INVALID_DISTRIBUTION_PARENT'
  | 'OBSERVED_WITHOUT_ENTITLEMENT'
  | 'ENTITLED_NOT_OBSERVED';

export interface ProvenanceRef {
  domain: 'CATALOG' | 'PROPOSAL' | 'CONTRACT' | 'ENTITLEMENT' | 'OPERATIONAL';
  entityType: string;
  entityId?: string;
  revisionId?: string;
  label?: string;
}

export interface StateCell<T = unknown> {
  value: T | null;
  quality: DataQuality;
  provenance: ProvenanceRef[];
  scope?: CommercialScope;
  warning?: { code: string; message: string };
  drillDown?: { href: string; label: string };
}

export interface ReconciliationMismatch {
  code: MismatchCode;
  severity: MismatchSeverity;
  quality: DataQuality;
  message: string;
  nextAction: string;
  mutationPerformed: false;
}

export interface CapabilityMatrixRow {
  code: CapabilityCode;
  label: string;
  platform: StateCell;
  proposed: StateCell;
  contracted: StateCell;
  licensed: StateCell<boolean>;
  enabled: StateCell<boolean>;
  distributable: StateCell<boolean>;
  configured: StateCell;
  observed: StateCell;
  reconciliation: StateCell<{
    status: MismatchSeverity | 'MATCH';
    mismatchCodes: MismatchCode[];
  }>;
}
