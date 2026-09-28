export type PreviewAction = 'NO_ACTION' | 'CREATE_ACTIVITY' | 'REQUIRES_DECISION' | 'BLOCKED';
export type ApplyDecisionAction = 'CREATE_ACTIVITY' | 'ADOPT_LEGACY_ACTIVITY' | 'CREATE_REPLACEMENT';

export type PreviewOperation = {
  serviceId: string;
  commercialStatus?: string;
  recurrenceMode?: string;
  quantity?: number;
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
  applied: Array<{ mandateServiceId: string; action: ApplyDecisionAction; activityId: string;
    created?: boolean; sourceActivityId?: string | null }>; preview: OperationalPreview };

export type PreviewRuntimeState = { status: 'IDLE' | 'LOADING' | 'READY' | 'ERROR' | 'CONFLICT';
  revision: string | null; preview: OperationalPreview | null; error: string | null };
export type ApplyRuntimeState = { status: 'IDLE' | 'APPLYING' | 'UNKNOWN' | 'ERROR' | 'CONFLICT';
  mandateServiceId: string | null; intent: ApplyIntent | null; payload: ReturnType<typeof buildApplyMandateOperationsPayload> | null;
  error: string | null };

export type DecisionMode = 'ADOPT' | 'REPLACEMENT';
export type DecisionDialogState = { mode: DecisionMode; serviceId: string; serviceName: string;
  revision: string; operation: PreviewOperation };
export type OperationSuccess = { serviceId: string; action: ApplyDecisionAction } | null;

export type OperationalServiceView = { status: string; label: string; description: string;
  mutationAllowed: boolean; primaryAction: 'CREATE' | 'EXAMINE_ADOPT' | 'EXAMINE_REPLACEMENT'
    | 'APPLYING' | 'RETRY_CREATE' | null; planningAction: boolean; decisionMode: DecisionMode | null };

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

export function indexPreviewOperations(operations: PreviewOperation[]) {
  const index = new Map<string, PreviewOperation[]>();
  for (const operation of operations) index.set(operation.serviceId, [...(index.get(operation.serviceId) ?? []), operation]);
  return index;
}

export function operationalViewForService(input: {
  serviceId?: string; commercialStatus: string; commerciallyClean: boolean; previewCurrent: boolean;
  activityTypeActive?: boolean; operations: PreviewOperation[]; canApply: boolean;
  applyStatus: ApplyRuntimeState['status']; applyingServiceId: string | null;
}): OperationalServiceView {
  if (!input.serviceId) return { status: 'UNSAVED', label: 'À enregistrer',
    description: "Enregistrez l'offre pour analyser ce service.", mutationAllowed: false, primaryAction: null, planningAction: false, decisionMode: null };
  if (!input.commerciallyClean) return { status: 'STALE', label: 'Analyse en attente',
    description: "Enregistrez l'offre avant d'appliquer les actions opérationnelles.", mutationAllowed: false, primaryAction: null, planningAction: false, decisionMode: null };
  if (!input.previewCurrent) return { status: 'VERIFY_REQUIRED', label: 'Vérification requise',
    description: "L'état opérationnel doit être analysé.", mutationAllowed: false, primaryAction: null, planningAction: false, decisionMode: null };
  if (input.operations.length !== 1) return { status: 'VERIFY_REQUIRED', label: 'Vérification requise',
    description: input.operations.length ? 'Plusieurs résultats opérationnels ont été reçus.' : 'Le service est absent de la projection opérationnelle.',
    mutationAllowed: false, primaryAction: null, planningAction: false, decisionMode: null };
  const mapped = mapPreviewOperation(input.operations[0]);
  const candidate = input.commercialStatus === 'ACTIVE' && mapped.action === 'CREATE_ACTIVITY'
    && mapped.reasonCode === 'NO_ACTIVITY_EXISTS' && mapped.mutationAllowed;
  const candidateIds = (mapped.legacyCandidates ?? []).map(item => item.id);
  const adopt = input.commercialStatus === 'ACTIVE' && mapped.action === 'REQUIRES_DECISION'
    && ['LEGACY_ACTIVITY_CANDIDATE', 'LEGACY_MULTIPLE_CANDIDATES'].includes(mapped.reasonCode)
    && candidateIds.length > 0 && new Set(candidateIds).size === candidateIds.length;
  const cancelled = (mapped.linkedActivities ?? []).filter(item => item.status === 'annule');
  const replacement = input.commercialStatus === 'ACTIVE' && mapped.action === 'REQUIRES_DECISION'
    && mapped.reasonCode === 'LATEST_ACTIVITY_CANCELLED' && cancelled.length === 1
    && (mapped.linkedActivities ?? []).length === 1 && mapped.recurrenceMode === 'ONCE'
    && mapped.quantity === 1 && input.activityTypeActive !== false
    && !(mapped.reasonCodes ?? []).includes('OPEN_BOOKING_EXISTS');
  const retry = candidate && input.applyStatus === 'UNKNOWN' && input.applyingServiceId === input.serviceId;
  const applying = candidate && input.applyStatus === 'APPLYING' && input.applyingServiceId === input.serviceId;
  const idleAllowed = input.canApply && input.applyStatus === 'IDLE';
  const allowed = candidate && input.canApply && (input.applyStatus === 'IDLE' || retry);
  const planningStatus = mapped.linkedActivities?.[0]?.planningStatus;
  return { status: planningStatus || mapped.status, label: planningStatus ? planningStatusLabel(planningStatus) : mapped.label,
    description: mapped.action === 'CREATE_ACTIVITY' ? "Le service est vendu, mais aucune activité opérationnelle n'est encore associée."
      : mapped.action === 'REQUIRES_DECISION' ? 'Une décision humaine est requise avant toute action.'
        : mapped.action === 'BLOCKED' ? 'Cet état doit être vérifié avant toute action.' : 'L’état opérationnel est à jour.',
    mutationAllowed: allowed || idleAllowed && (adopt || replacement),
    primaryAction: applying ? 'APPLYING' : allowed ? (retry ? 'RETRY_CREATE' : 'CREATE')
      : idleAllowed && adopt ? 'EXAMINE_ADOPT' : idleAllowed && replacement ? 'EXAMINE_REPLACEMENT' : null,
    planningAction: mapped.action === 'NO_ACTION' && planningStatus === 'TO_PLAN',
    decisionMode: adopt ? 'ADOPT' : replacement ? 'REPLACEMENT' : null };
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
