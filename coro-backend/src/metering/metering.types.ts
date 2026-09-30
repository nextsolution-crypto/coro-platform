import {
  CapabilityCode,
  CommercialScope,
  MeteringSourceQuality,
} from '@prisma/client';

export type BillingStatus = 'NOT_EVALUATED';
export type Aggregation = 'COUNT' | 'DISTINCT_COUNT';

export interface MetricDefinition {
  code: string;
  metricVersion: string;
  policyVersion: string;
  capabilityCode: CapabilityCode;
  labelFr: string;
  labelEn: string;
  descriptionFr: string;
  descriptionEn: string;
  unit: string;
  allowedScopes: readonly CommercialScope[];
  sourceDomain: string;
  aggregation: Aggregation;
  timeSemantics: '[periodStart,periodEnd)';
  minimumSourceQuality: MeteringSourceQuality;
  maxPeriodDays: number;
  billingStatus: BillingStatus;
}

export interface NormalizedSourceFact {
  sourceType: string;
  opaqueIdentity: string;
  occurredAt: string;
  state?: string;
}

export interface MeteringSourceSummaryV1 {
  schemaVersion: '1';
  sourceModels: string[];
  contributingRows: string;
  excludedRows?: string;
  aggregation: Aggregation;
  earliestOccurredAt?: string;
  latestOccurredAt?: string;
  warningCodes: string[];
}

export interface CalculationTarget {
  organizationId: string;
  scope: CommercialScope;
  clientId?: string;
  buildingId?: string;
}
