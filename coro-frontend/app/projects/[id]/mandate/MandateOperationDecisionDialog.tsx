'use client';

import { useEffect, useRef, useState } from 'react';
import { formatCivilDate } from '@/app/planning/time';
import type { ApplyDecision, ApplyRuntimeState, DecisionDialogState, OperationalCandidate } from './mandateOperationalState';
import { planningStatusLabel } from './mandateOperationalState';

const activityStatus: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', fait: 'Terminée',
  termine: 'Terminée', annule: 'Annulée' };

function CandidateDetails({ candidate }: { candidate: OperationalCandidate }) {
  const facts = [
    candidate.status ? activityStatus[candidate.status] ?? 'Statut à vérifier' : null,
    candidate.scheduledDate ? formatCivilDate(candidate.scheduledDate) : 'Date à déterminer',
    planningStatusLabel(candidate.planningStatus),
    candidate.openBooking ? 'Réservation ouverte' : null,
    candidate.taskCount !== undefined ? `${candidate.taskCount} tâche${candidate.taskCount === 1 ? '' : 's'}` : null,
    candidate.actualHours !== undefined ? `${candidate.actualHours} h enregistrée${candidate.actualHours === 1 ? '' : 's'}` : null,
    candidate.exerciseReportCount ? `${candidate.exerciseReportCount} rapport${candidate.exerciseReportCount === 1 ? '' : 's'} d’exercice` : null,
  ].filter(Boolean);
  return <><strong className="text-sm">{candidate.label || 'Activité historique'}</strong>
    <span className="block text-xs text-gray-600 mt-1">{facts.join(' · ')}</span></>;
}

type Props = { state: DecisionDialogState; applyState: ApplyRuntimeState; onClose: () => void;
  onConfirm: (decision: ApplyDecision) => void; onRetry: (serviceId: string) => void; onRevalidate: () => void };

export default function MandateOperationDecisionDialog({ state, applyState, onClose, onConfirm, onRetry, onRevalidate }: Props) {
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const locked = ['APPLYING', 'UNKNOWN'].includes(applyState.status);
  const candidates = state.mode === 'ADOPT' ? state.operation.legacyCandidates ?? []
    : state.operation.linkedActivities ?? [];
  const replacement = state.mode === 'REPLACEMENT' ? candidates[0] : null;

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => { previousFocus.current?.focus(); };
  }, []);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !locked) { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); };
  }, [locked, onClose]);

  const activityId = state.mode === 'ADOPT' ? selectedActivityId : replacement?.id ?? null;
  const confirm = () => {
    if (!activityId || locked) return;
    onConfirm({ mandateServiceId: state.serviceId,
      action: state.mode === 'ADOPT' ? 'ADOPT_LEGACY_ACTIVITY' : 'CREATE_REPLACEMENT', activityId });
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
    onMouseDown={event => { if (event.target === event.currentTarget && !locked) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="mandate-decision-title"
      className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div><h2 id="mandate-decision-title" className="font-bold text-lg">
          {state.mode === 'ADOPT' ? 'Rattacher une activité historique' : 'Créer une nouvelle exécution'}
        </h2><p className="text-sm text-gray-600 mt-1">{state.serviceName}</p></div>
        <button ref={closeRef} type="button" aria-label="Fermer" disabled={locked} onClick={onClose}
          className="rounded px-2 py-1 disabled:opacity-50">×</button>
      </div>

      <p className="text-sm mt-4">{state.mode === 'ADOPT'
        ? candidates.length > 1 ? 'Plusieurs activités historiques pourraient correspondre à ce service. Sélectionnez celle qui doit être rattachée.'
          : 'Cette activité existe déjà dans l’historique du mandat. Vous pouvez la rattacher au service vendu sans créer une nouvelle activité.'
        : 'Cette activité est annulée. Elle restera dans l’historique. CORO créera une nouvelle activité opérationnelle liée à celle-ci comme remplacement.'}</p>

      <div className="grid gap-3 mt-4" role={state.mode === 'ADOPT' ? 'radiogroup' : undefined}
        aria-label={state.mode === 'ADOPT' ? 'Activités historiques' : undefined}>
        {candidates.map(candidate => state.mode === 'ADOPT' ? <label key={candidate.id}
          className={`block rounded border p-3 cursor-pointer ${selectedActivityId === candidate.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
          <span className="flex gap-3"><input type="radio" name="mandate-candidate" value={candidate.id}
            checked={selectedActivityId === candidate.id} disabled={locked}
            onChange={() => setSelectedActivityId(candidate.id)} /><span><CandidateDetails candidate={candidate} /></span></span>
        </label> : <div key={candidate.id} className="rounded border border-amber-300 bg-amber-50 p-3">
          <CandidateDetails candidate={candidate} />
        </div>)}
      </div>

      {applyState.error && <p role="alert" className="text-sm text-red-700 mt-4">{applyState.error}</p>}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
        <button type="button" disabled={locked} onClick={onClose} className="rounded border px-4 py-2 text-sm disabled:opacity-50">Annuler</button>
        {applyState.status === 'UNKNOWN' ? <button type="button" onClick={() => onRetry(state.serviceId)}
          className="rounded bg-red-700 text-white px-4 py-2 text-sm">Réessayer</button>
          : ['ERROR', 'CONFLICT'].includes(applyState.status) ? <button type="button" onClick={onRevalidate}
            className="rounded bg-amber-700 text-white px-4 py-2 text-sm">Relancer l’analyse</button>
          : <button type="button" disabled={!activityId || locked} aria-busy={applyState.status === 'APPLYING'} onClick={confirm}
            className="rounded bg-red-700 text-white px-4 py-2 text-sm disabled:opacity-50">
            {applyState.status === 'APPLYING' ? 'Application…' : state.mode === 'ADOPT'
              ? candidates.length > 1 ? 'Rattacher l’activité sélectionnée' : 'Rattacher cette activité'
              : 'Créer la nouvelle exécution'}
          </button>}
      </div>
    </div>
  </div>;
}
