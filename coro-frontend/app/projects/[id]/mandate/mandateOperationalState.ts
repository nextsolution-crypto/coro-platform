export type PreviewAction = 'NO_ACTION' | 'CREATE_ACTIVITY' | 'REQUIRES_DECISION' | 'BLOCKED';
export type ApplyDecisionAction = 'CREATE_ACTIVITY' | 'ADOPT_LEGACY_ACTIVITY' | 'CREATE_REPLACEMENT';

export type PreviewOperation = {
  serviceId: string;
  action: string;
  reasonCode: string;
  reasonCodes?: string[];
  hasOpenBooking?: boolean;
  linkedActivities?: OperationalCandidate[];
  legacyCandidates?: OperationalCandidate[];
};

export type OperationalCandidate = { id: string; label?: string; status?: string; scheduledDate?: string | null;
  createdAt?: string; mandateServiceId?: string | null; planningStatus?: string;
  openBooking?: { status: string } | null; taskCount?: number; actualHours?: number; exerciseReportCount?: number };
export type OperationalPreview = { commercialRevision: string; generatedAt: string;
  summary: { noAction: number; createActivity: number; requiresDecision: number; blocked: number };
  operations: PreviewOperation[] };
export type ApplyIntent = { signature: string; key: string };
export type ApplyResult = { commercialRevision: string; idempotencyKey: string; replayed: boolean;
  applied: Array<{ mandateServiceId: string; action: ApplyDecisionAction; activityId?: string }>; preview: OperationalPreview };

const knownActions = new Set<PreviewAction>(['NO_ACTION', 'CREATE_ACTIVITY', 'REQUIRES_DECISION', 'BLOCKED']);
const knownReasons = new Set([
  'ACTIVE_ACTIVITY_EXISTS', 'ACTIVITY_TYPE_MISSING', 'SERVICE_CONTEXT_MISMATCH',
  'SERVICE_REMOVED_WITH_ACTIVE_ACTIVITY', 'SERVICE_REMOVED_NO_ACTIVE_ACTIVITY', 'MULTIPLE_ACTIVE_ACTIVITIES',
  'QUANTITY_REQUIRES_SCHEDULING_POLICY', 'COMPLETED_ACTIVITY_EXISTS', 'LATEST_ACTIVITY_CANCELLED',
  'LEGACY_ACTIVITY_CANDIDATE', 'LEGACY_MULTIPLE_CANDIDATES', 'ACTIVITY_TYPE_ARCHIVED',
  'RECURRENCE_REQUIRES_SCHEDULING_POLICY', 'NO_ACTIVITY_EXISTS', 'OPEN_BOOKING_EXISTS',
]);

export function mapPreviewOperation(operation: PreviewOperation) {
  const reasons = operation.reasonCodes?.length ? operation.reasonCodes : [operation.reasonCode];
  if (!knownActions.has(operation.action as PreviewAction) || reasons.some(reason => !knownReasons.has(reason))) {
    return { ...operation, action: 'BLOCKED' as const, status: 'VERIFY_REQUIRED', label: 'Vérification requise',
      description: operation.reasonCode, suggestedUiAction: null, mutationAllowed: false };
  }
  const labels: Record<PreviewAction, string> = {
    NO_ACTION: 'À jour', CREATE_ACTIVITY: 'Activity à créer',
    REQUIRES_DECISION: 'Décision requise', BLOCKED: 'Vérification requise',
  };
  const statuses: Record<PreviewAction, string> = { NO_ACTION: operation.reasonCode === 'COMPLETED_ACTIVITY_EXISTS'
    ? 'COMPLETED' : 'ACTIVE', CREATE_ACTIVITY: 'TO_APPLY', REQUIRES_DECISION: 'ACTION_REQUIRED', BLOCKED: 'BLOCKED' };
  return { ...operation, action: operation.action as PreviewAction, status: statuses[operation.action as PreviewAction],
    label: labels[operation.action as PreviewAction], description: operation.reasonCode,
    suggestedUiAction: operation.action === 'CREATE_ACTIVITY' ? 'CREATE' : null,
    mutationAllowed: operation.action === 'CREATE_ACTIVITY' || operation.action === 'REQUIRES_DECISION' };
}

export function planningStatusLabel(status?: string) {
  const labels: Record<string, string> = { TO_PLAN: 'À planifier', LEAD_PENDING: 'Affectation à confirmer',
    PLANNED: 'Planifiée', CONFIRMED: 'Confirmée' };
  return status && labels[status] ? labels[status] : 'Vérification requise';
}

export const legacyCandidateSummary = (operation: PreviewOperation) => ({
  count: operation.legacyCandidates?.length ?? 0,
  candidates: (operation.legacyCandidates ?? []).map(candidate => ({ id: candidate.id,
    planningStatus: planningStatusLabel(candidate.planningStatus), hasOpenBooking: Boolean(candidate.openBooking) })),
  selectedActivityId: null,
});

export type ApplyDecision = { mandateServiceId: string; action: ApplyDecisionAction; activityId?: string };

export function applyIntentSignature(expectedRevision: string, decisions: ApplyDecision[]) {
  const stable = [...decisions].map(decision => ({ ...decision }))
    .sort((a, b) => a.mandateServiceId.localeCompare(b.mandateServiceId) || a.action.localeCompare(b.action)
      || (a.activityId || '').localeCompare(b.activityId || ''));
  return JSON.stringify({ expectedRevision, decisions: stable });
}

export function idempotencyKeyForIntent(previous: ApplyIntent | null,
  signature: string, createUuid: () => string = () => crypto.randomUUID()) {
  return previous?.signature === signature ? previous : { signature, key: createUuid() };
}

export const clearApplyIntent = () => null;

export const buildApplyMandateOperationsPayload = (idempotencyKey: string, expectedRevision: string,
  decisions: ApplyDecision[]) => ({ idempotencyKey, expectedRevision, decisions: decisions.map(decision => ({ ...decision })) });
