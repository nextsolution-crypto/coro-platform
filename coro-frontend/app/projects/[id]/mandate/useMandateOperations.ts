'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { applyMandateOperations, previewMandateOperations } from './mandateApi';
import { ApplyResult, ApplyRuntimeState, buildApplyMandateOperationsPayload, clearApplyIntent,
  DecisionDialogState, idempotencyKeyForIntent, indexPreviewOperations, OperationSuccess, OperationalPreview,
  operationalViewForService, PreviewRuntimeState, applyIntentSignature, ApplyDecision } from './mandateOperationalState';

const idlePreview = (): PreviewRuntimeState => ({ status: 'IDLE', revision: null, preview: null, error: null });
const idleApply = (): ApplyRuntimeState => ({ status: 'IDLE', mandateServiceId: null, intent: null, payload: null, error: null });

function responseStatus(error: unknown) { return axios.isAxiosError(error) ? error.response?.status : undefined; }
function responseMessage(error: unknown, fallback: string) {
  const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
  return typeof message === 'string' ? message : fallback;
}

export function useMandateOperations(input: { projectId: string; revision: string | null; servicesDirty: boolean;
  canApply: boolean; commercialReady: boolean; onApplied?: () => void }) {
  const onApplied = input.onApplied;
  const [previewState, setPreviewState] = useState<PreviewRuntimeState>(idlePreview);
  const [applyState, setApplyState] = useState<ApplyRuntimeState>(idleApply);
  const [success, setSuccess] = useState<OperationSuccess>(null);
  const [decisionDialog, setDecisionDialog] = useState<DecisionDialogState | null>(null);
  const previewSequence = useRef(0);
  const projectRef = useRef(input.projectId);
  const revisionRef = useRef(input.revision);
  const dirtyRef = useRef(input.servicesDirty);
  useEffect(() => {
    projectRef.current = input.projectId; revisionRef.current = input.revision; dirtyRef.current = input.servicesDirty;
  }, [input.projectId, input.revision, input.servicesDirty]);

  const loadPreview = useCallback(async (revision: string, signal?: AbortSignal) => {
    const projectId = input.projectId;
    const sequence = ++previewSequence.current;
    setPreviewState(current => ({ status: 'LOADING', revision, preview: current.revision === revision ? current.preview : null, error: null }));
    try {
      const preview = await previewMandateOperations(projectId, revision, signal) as OperationalPreview;
      if (sequence !== previewSequence.current || projectRef.current !== projectId || revisionRef.current !== revision) return;
      setPreviewState({ status: 'READY', revision, preview, error: null });
      setApplyState(current => current.status === 'ERROR' || current.status === 'CONFLICT' ? idleApply() : current);
    } catch (error) {
      if (signal?.aborted || sequence !== previewSequence.current || projectRef.current !== projectId) return;
      const conflict = responseStatus(error) === 409;
      setPreviewState({ status: conflict ? 'CONFLICT' : 'ERROR', revision, preview: null,
        error: conflict ? "L'offre a changé depuis son chargement. Rechargez l'offre avant de poursuivre."
          : responseMessage(error, "L'état opérationnel n'a pas pu être analysé.") });
    }
  }, [input.projectId]);

  useEffect(() => {
    // Project identity owns these transient states; late requests are also rejected by projectRef.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewState(idlePreview()); setApplyState(idleApply()); setSuccess(null); setDecisionDialog(null); previewSequence.current += 1;
  }, [input.projectId]);

  useEffect(() => {
    if (!input.commercialReady || !input.revision || input.servicesDirty) return;
    const controller = new AbortController();
    // The effect starts the read-only synchronization request for the current commercial revision.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPreview(input.revision, controller.signal);
    return () => controller.abort();
  }, [input.commercialReady, input.revision, input.servicesDirty, loadPreview]);

  const retryPreview = useCallback(() => {
    if (input.revision && !input.servicesDirty && applyState.status !== 'UNKNOWN') {
      setDecisionDialog(null);
      void loadPreview(input.revision);
    }
  }, [applyState.status, input.revision, input.servicesDirty, loadPreview]);

  const sendApply = useCallback(async (next: ApplyRuntimeState) => {
    if (!next.payload || !next.intent || !next.mandateServiceId) return;
    const projectId = input.projectId;
    setApplyState({ ...next, status: 'APPLYING', error: null });
    try {
      const result = await applyMandateOperations(projectId, next.payload) as ApplyResult;
      if (projectRef.current !== projectId || revisionRef.current !== next.payload.expectedRevision) return;
      const expected = next.payload.decisions[0];
      const applied = result.applied.find(item => item.mandateServiceId === next.mandateServiceId
        && item.action === expected?.action);
      const activityMatches = expected?.action === 'ADOPT_LEGACY_ACTIVITY' ? applied?.activityId === expected.activityId
        : expected?.action === 'CREATE_REPLACEMENT' ? applied?.sourceActivityId === expected.activityId : Boolean(applied?.activityId);
      if (!applied || !activityMatches || result.commercialRevision !== next.payload.expectedRevision) {
        setApplyState({ ...next, status: 'ERROR', error: "L'opération a été traitée, mais son résultat doit être vérifié." });
        return;
      }
      if (!dirtyRef.current) setPreviewState({ status: 'READY', revision: result.commercialRevision,
        preview: result.preview, error: null });
      setSuccess({ serviceId: next.mandateServiceId, action: expected.action });
      onApplied?.();
      setDecisionDialog(null);
      setApplyState({ ...idleApply(), intent: clearApplyIntent() });
    } catch (error) {
      if (projectRef.current !== projectId) return;
      if (axios.isAxiosError(error) && !error.response) {
        setApplyState({ ...next, status: 'UNKNOWN',
          error: "Le résultat de l'opération n'a pas pu être confirmé." });
        return;
      }
      const conflict = responseStatus(error) === 409;
      setApplyState({ ...next, status: conflict ? 'CONFLICT' : 'ERROR', intent: clearApplyIntent(), payload: null,
        error: conflict ? "L'état a changé. Rechargez l'offre puis relancez l'analyse."
          : responseMessage(error, "L'opération n'a pas pu être confirmée. Relancez l'analyse avant de réessayer.") });
    }
  }, [input.projectId, onApplied]);

  const createActivity = useCallback((serviceId: string, serviceName: string) => {
    if (!input.canApply || !input.revision || input.servicesDirty || applyState.status !== 'IDLE') return;
    if (!window.confirm(`Créer l'activité pour « ${serviceName} » ?\n\nCORO créera l'activité opérationnelle et les tâches prévues par sa configuration.`)) return;
    const decisions = [{ mandateServiceId: serviceId, action: 'CREATE_ACTIVITY' as const }];
    const signature = JSON.stringify({ projectId: input.projectId,
      intent: applyIntentSignature(input.revision, decisions) });
    const intent = idempotencyKeyForIntent(applyState.intent, signature);
    const payload = buildApplyMandateOperationsPayload(intent.key, input.revision, decisions);
    setSuccess(null);
    void sendApply({ status: 'APPLYING', mandateServiceId: serviceId, intent, payload, error: null });
  }, [applyState, input.canApply, input.projectId, input.revision, input.servicesDirty, sendApply]);

  const retryCreate = useCallback((serviceId: string) => {
    if (applyState.status !== 'UNKNOWN' || applyState.mandateServiceId !== serviceId) return;
    void sendApply(applyState);
  }, [applyState, sendApply]);

  const operationIndex = useMemo(() => indexPreviewOperations(previewState.preview?.operations ?? []), [previewState.preview]);

  const openDecision = useCallback((serviceId: string, serviceName: string, activityTypeActive = true) => {
    if (!input.canApply || input.servicesDirty || !input.revision || applyState.status !== 'IDLE'
      || previewState.status !== 'READY' || previewState.revision !== input.revision) return;
    const operations = operationIndex.get(serviceId) ?? [];
    if (operations.length !== 1) return;
    const operation = operations[0];
    const ids = (operation.legacyCandidates ?? []).map(item => item.id);
    const adopt = operation.action === 'REQUIRES_DECISION'
      && ['LEGACY_ACTIVITY_CANDIDATE', 'LEGACY_MULTIPLE_CANDIDATES'].includes(operation.reasonCode)
      && ids.length > 0 && new Set(ids).size === ids.length;
    const replacement = operation.action === 'REQUIRES_DECISION' && operation.reasonCode === 'LATEST_ACTIVITY_CANCELLED'
      && operation.linkedActivities?.length === 1 && operation.linkedActivities[0].status === 'annule'
      && operation.recurrenceMode === 'ONCE' && operation.quantity === 1 && activityTypeActive
      && !(operation.reasonCodes ?? []).includes('OPEN_BOOKING_EXISTS');
    if (!adopt && !replacement) return;
    setDecisionDialog({ mode: adopt ? 'ADOPT' : 'REPLACEMENT', serviceId, serviceName,
      revision: input.revision, operation });
    setSuccess(null);
  }, [applyState.status, input.canApply, input.revision, input.servicesDirty, operationIndex, previewState]);

  const closeDecision = useCallback(() => {
    if (!['APPLYING', 'UNKNOWN'].includes(applyState.status)) setDecisionDialog(null);
  }, [applyState.status]);

  const executeDecision = useCallback((decision: ApplyDecision) => {
    if (!decisionDialog || !input.canApply || input.servicesDirty || applyState.status !== 'IDLE'
      || previewState.status !== 'READY' || previewState.revision !== decisionDialog.revision
      || input.revision !== decisionDialog.revision || decision.mandateServiceId !== decisionDialog.serviceId) return;
    const current = operationIndex.get(decisionDialog.serviceId) ?? [];
    if (current.length !== 1 || current[0] !== decisionDialog.operation) return;
    const valid = decision.action === 'ADOPT_LEGACY_ACTIVITY'
      ? decisionDialog.mode === 'ADOPT' && decisionDialog.operation.legacyCandidates?.some(item => item.id === decision.activityId)
      : decision.action === 'CREATE_REPLACEMENT' && decisionDialog.mode === 'REPLACEMENT'
        && decisionDialog.operation.linkedActivities?.length === 1
        && decisionDialog.operation.linkedActivities[0].id === decision.activityId
        && decisionDialog.operation.linkedActivities[0].status === 'annule';
    if (!valid) return;
    const decisions = [{ ...decision }];
    const signature = JSON.stringify({ projectId: input.projectId,
      intent: applyIntentSignature(input.revision, decisions) });
    const intent = idempotencyKeyForIntent(applyState.intent, signature);
    const payload = buildApplyMandateOperationsPayload(intent.key, input.revision, decisions);
    setSuccess(null);
    void sendApply({ status: 'APPLYING', mandateServiceId: decision.mandateServiceId, intent, payload, error: null });
  }, [applyState, decisionDialog, input.canApply, input.projectId, input.revision, input.servicesDirty,
    operationIndex, previewState, sendApply]);
  const viewFor = useCallback((service: { id?: string; commercialStatus: string }, commerciallyClean: boolean,
    activityTypeActive = true) =>
    operationalViewForService({ serviceId: service.id, commercialStatus: service.commercialStatus, commerciallyClean,
      activityTypeActive,
      previewCurrent: previewState.status === 'READY' && previewState.revision === input.revision && !input.servicesDirty,
      operations: service.id ? operationIndex.get(service.id) ?? [] : [], canApply: input.canApply,
      applyStatus: applyState.status, applyingServiceId: applyState.mandateServiceId }),
  [applyState, input.canApply, input.revision, input.servicesDirty, operationIndex, previewState]);

  return { previewState, applyState, success, decisionDialog, retryPreview, createActivity,
    retryOperation: retryCreate, openDecision, closeDecision, executeDecision, viewFor };
}
