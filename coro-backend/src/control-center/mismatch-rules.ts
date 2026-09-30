import { ReconciliationMismatch } from './commercial-reconciliation.types';

export const mismatch = (
  code: ReconciliationMismatch['code'],
  severity: ReconciliationMismatch['severity'],
  message: string,
  nextAction: string,
): ReconciliationMismatch => ({
  code,
  severity,
  quality: 'CANONICAL',
  message,
  nextAction,
  mutationPerformed: false,
});

export const observedMismatch = (input: {
  licensed: boolean;
  quality: 'CANONICAL' | 'DERIVED' | 'INFERABLE' | 'NOT_AVAILABLE';
  observed: boolean | null;
}): ReconciliationMismatch[] => {
  if (
    !['CANONICAL', 'DERIVED'].includes(input.quality) ||
    input.observed === null
  )
    return [];
  if (input.observed && !input.licensed)
    return [
      mismatch(
        'OBSERVED_WITHOUT_ENTITLEMENT',
        'WARNING',
        'Usage canonique observé sans entitlement effectif.',
        'INVESTIGATE_OBSERVED_USAGE',
      ),
    ];
  if (!input.observed && input.licensed)
    return [
      mismatch(
        'ENTITLED_NOT_OBSERVED',
        'INFO',
        'Entitlement effectif sans observation canonique positive.',
        'REVIEW_CONFIGURATION',
      ),
    ];
  return [];
};

export const hasComparableLimitMismatch = (input: {
  snapshotLineId: string;
  metric: string | null;
  quantity: { toString(): string } | null;
  grants: Array<{
    sourceSnapshotLineId: string | null;
    limits: Array<{
      metricCode: string;
      quantity: { toString(): string } | null;
      unlimited: boolean;
    }>;
  }>;
}): boolean => {
  if (!input.metric || !input.quantity) return false;
  return input.grants
    .filter((grant) => grant.sourceSnapshotLineId === input.snapshotLineId)
    .flatMap((grant) => grant.limits)
    .filter(
      (limit) =>
        limit.metricCode === input.metric &&
        !limit.unlimited &&
        limit.quantity !== null,
    )
    .some((limit) => limit.quantity?.toString() !== input.quantity?.toString());
};
