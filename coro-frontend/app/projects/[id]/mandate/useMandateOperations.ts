'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { applyMandateOperations, previewMandateOperations } from './mandateApi';
import { ApplyResult, ApplyRuntimeState, buildApplyMandateOperationsPayload, clearApplyIntent,
  idempotencyKeyForIntent, indexPreviewOperations, OperationalPreview, operationalViewForService,
  PreviewRuntimeState, applyIntentSignature } from './mandateOperationalState';

const idlePreview = (): PreviewRuntimeState => ({ status: 'IDLE', revision: null, preview: null, error: null });
const idleApply = (): ApplyRuntimeState => ({ status: 'IDLE', mandateServiceId: null, intent: null, payload: null, error: null });

function responseStatus(error: unknown) { return axios.isAxiosError(error) ? error.response?.status : undefined; }
function responseMessage(error: unknown, fallback: string) {
  const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
  return typeof message === 'string' ? message : fallback;
}

export function useMandateOperations(input: { projectId: string; revision: string | null; servicesDirty: boolean;
  canApply: boolean; commercialReady: boolean }) {
  const [previewState, setPreviewState] = useState<PreviewRuntimeState>(idlePreview);
  const [applyState, setApplyState] = useState<ApplyRuntimeState>(idleApply);
  const [successServiceId, setSuccessServiceId] = useState<string | null>(null);
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
    setPreviewState(idlePreview()); setApplyState(idleApply()); setSuccessServiceId(null); previewSequence.current += 1;
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
    if (input.revision && !input.servicesDirty && applyState.status !== 'UNKNOWN') void loadPreview(input.revision);
  }, [applyState.status, input.revision, input.servicesDirty, loadPreview]);

  const sendApply = useCallback(async (next: ApplyRuntimeState) => {
    if (!next.payload || !next.intent || !next.mandateServiceId) return;
    const projectId = input.projectId;
    setApplyState({ ...next, status: 'APPLYING', error: null });
    try {
      const result = await applyMandateOperations(projectId, next.payload) as ApplyResult;
      if (projectRef.current !== projectId || revisionRef.current !== next.payload.expectedRevision) return;
      const applied = result.applied.find(item => item.mandateServiceId === next.mandateServiceId
        && item.action === 'CREATE_ACTIVITY');
      if (!applied || result.commercialRevision !== next.payload.expectedRevision) {
        setApplyState({ ...next, status: 'ERROR', error: 'La création a été traitée, mais son résultat doit être vérifié.' });
        return;
      }
      if (!dirtyRef.current) setPreviewState({ status: 'READY', revision: result.commercialRevision,
        preview: result.preview, error: null });
      setSuccessServiceId(next.mandateServiceId);
      setApplyState({ ...idleApply(), intent: clearApplyIntent() });
    } catch (error) {
      if (projectRef.current !== projectId) return;
      if (axios.isAxiosError(error) && !error.response) {
        setApplyState({ ...next, status: 'UNKNOWN',
          error: "Le résultat de la création n'a pas pu être confirmé." });
        return;
      }
      const conflict = responseStatus(error) === 409;
      setApplyState({ ...next, status: conflict ? 'CONFLICT' : 'ERROR', intent: clearApplyIntent(), payload: null,
        error: conflict ? "L'état a changé. Rechargez l'offre puis relancez l'analyse."
          : responseMessage(error, "L'activité n'a pas pu être créée. Relancez l'analyse avant de réessayer.") });
    }
  }, [input.projectId]);

  const createActivity = useCallback((serviceId: string, serviceName: string) => {
    if (!input.canApply || !input.revision || input.servicesDirty || applyState.status !== 'IDLE') return;
    if (!window.confirm(`Créer l'activité pour « ${serviceName} » ?\n\nCORO créera l'activité opérationnelle et les tâches prévues par sa configuration.`)) return;
    const decisions = [{ mandateServiceId: serviceId, action: 'CREATE_ACTIVITY' as const }];
    const signature = JSON.stringify({ projectId: input.projectId,
      intent: applyIntentSignature(input.revision, decisions) });
    const intent = idempotencyKeyForIntent(applyState.intent, signature);
    const payload = buildApplyMandateOperationsPayload(intent.key, input.revision, decisions);
    setSuccessServiceId(null);
    void sendApply({ status: 'APPLYING', mandateServiceId: serviceId, intent, payload, error: null });
  }, [applyState, input.canApply, input.projectId, input.revision, input.servicesDirty, sendApply]);

  const retryCreate = useCallback((serviceId: string) => {
    if (applyState.status !== 'UNKNOWN' || applyState.mandateServiceId !== serviceId) return;
    void sendApply(applyState);
  }, [applyState, sendApply]);

  const operationIndex = useMemo(() => indexPreviewOperations(previewState.preview?.operations ?? []), [previewState.preview]);
  const viewFor = useCallback((service: { id?: string; commercialStatus: string }, commerciallyClean: boolean) =>
    operationalViewForService({ serviceId: service.id, commercialStatus: service.commercialStatus, commerciallyClean,
      previewCurrent: previewState.status === 'READY' && previewState.revision === input.revision && !input.servicesDirty,
      operations: service.id ? operationIndex.get(service.id) ?? [] : [], canApply: input.canApply,
      applyStatus: applyState.status, applyingServiceId: applyState.mandateServiceId }),
  [applyState, input.canApply, input.revision, input.servicesDirty, operationIndex, previewState]);

  return { previewState, applyState, successServiceId, retryPreview, createActivity, retryCreate, viewFor };
}
