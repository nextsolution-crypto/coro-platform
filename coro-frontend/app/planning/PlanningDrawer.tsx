'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import api from '@/lib/api';
import type { PlannerEvent, PlannerUser, TeamCandidate, TeamPreview } from './types';
import { eventLabel, eventStatus } from './projection';
import { dateKey, formatClock, localBoundary, timeValue } from './time';
import type { TeamDraft } from './teamPickerState';
import TeamPicker from './TeamPicker';
import SchedulingPreview from './SchedulingPreview';
import { buildTeamPreviewRequest, createPreviewCycleGuard, isPreviewCancellation } from './previewCycle';
import styles from './planning.module.css';

export type PlanningDrawerMode = 'VIEW' | 'EDIT_SLOT' | 'RESCHEDULE' | 'REASSIGN' | 'CANCEL_SCHEDULE';

const EMPTY_TEAM: TeamDraft = { leadId: '', supportIds: [] };
// TEMPORARY — remove after Booking V1 runtime diagnosis.
const REASSIGN_RUNTIME_DIAGNOSTICS = true;

type ReassignDiagnostics = {
  cycleId: number; stage: string; lastOutcome: string;
  requestCount: number; successCount: number; cancelCount: number; staleCount: number; errorCount: number;
  buildingIdPresent: boolean; timeZone: string; date: string; time: string; durationMinutes: number;
  startUtc: string; candidatesCount: number; selectedLeadPresent: boolean;
  isAxiosError: boolean | null; status: number | null; code: string; technicalMessage: string;
};

const EMPTY_REASSIGN_DIAGNOSTICS: ReassignDiagnostics = {
  cycleId: 0, stage: 'view-exit', lastOutcome: 'none', requestCount: 0, successCount: 0,
  cancelCount: 0, staleCount: 0, errorCount: 0, buildingIdPresent: false, timeZone: '', date: '', time: '',
  durationMinutes: 0, startUtc: '', candidatesCount: 0, selectedLeadPresent: false,
  isAxiosError: null, status: null, code: '', technicalMessage: '',
};

function instant(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('fr-CA', { timeZone, weekday: 'long', day: 'numeric', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function serverMessage(cause: unknown, fallback: string) {
  const value = axios.isAxiosError(cause) ? cause.response?.data?.message : null;
  if (Array.isArray(value)) return value.join(' ');
  return typeof value === 'string' ? value : fallback;
}

export default function PlanningDrawer({ event, users, displayTimeZone, canMutate, initialMode = 'VIEW', onClose, onMutated }: {
  event: PlannerEvent | null; users: PlannerUser[]; displayTimeZone: string; canMutate: boolean;
  initialMode?: PlanningDrawerMode; onClose: () => void; onMutated?: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previewCycles = useRef(createPreviewCycleGuard());
  const diagnosticCycle = useRef(0);
  const [mode, setMode] = useState<PlanningDrawerMode>(initialMode);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [team, setTeam] = useState<TeamDraft>(EMPTY_TEAM);
  const [candidates, setCandidates] = useState<TeamCandidate[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [confirmUnknown, setConfirmUnknown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [reassignDiagnostics, setReassignDiagnostics] = useState(EMPTY_REASSIGN_DIAGNOSTICS);

  const initialTeam = useMemo<TeamDraft>(() => ({
    leadId: event?.assignments?.find(item => item.role === 'LEAD')?.userId ?? '',
    supportIds: event?.assignments?.filter(item => item.role === 'SUPPORT').map(item => item.userId) ?? [],
  }), [event]);
  const initialDuration = event ? Math.round((new Date(event.endUtc).getTime() - new Date(event.startUtc).getTime()) / 60_000) : 60;
  const dirty = Boolean(event && mode !== 'VIEW' && mode !== 'CANCEL_SCHEDULE' && (
    date !== dateKey(new Date(event.startUtc), event.sourceTimeZone) ||
    time !== timeValue(event.startUtc, event.sourceTimeZone) || durationMinutes !== initialDuration ||
    team.leadId !== initialTeam.leadId || team.supportIds.join(',') !== initialTeam.supportIds.join(',')
  ));

  useEffect(() => {
    if (!event) return;
    setMode(initialMode);
    setDate(dateKey(new Date(event.startUtc), event.sourceTimeZone));
    setTime(timeValue(event.startUtc, event.sourceTimeZone));
    setDurationMinutes(initialDuration);
    setTeam(initialTeam);
    setCandidates([]); setError(''); setPreviewError(''); setConfirmUnknown(false); setConfirmDiscard(false);
  }, [event, initialMode, initialDuration, initialTeam]);

  const requestClose = useCallback(() => {
    if (dirty) { setConfirmDiscard(true); return; }
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    if (!event) return;
    const previous = document.activeElement as HTMLElement | null;
    titleRef.current?.focus();
    const onKey = (key: KeyboardEvent) => {
      if (key.key === 'Escape') { requestClose(); return; }
      if (key.key !== 'Tab') return;
      const focusable = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] button:not(:disabled), [role="dialog"] a[href], [role="dialog"] input, [role="dialog"] select'));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (key.shiftKey && document.activeElement === first) { key.preventDefault(); last.focus(); }
      else if (!key.shiftKey && document.activeElement === last) { key.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [event, requestClose]);

  const editable = mode === 'EDIT_SLOT' || mode === 'RESCHEDULE' || mode === 'REASSIGN';
  const previewBuildingId = event?.buildingId ?? '';
  const previewTimeZone = event?.sourceTimeZone ?? '';
  useEffect(() => {
    if (!REASSIGN_RUNTIME_DIAGNOSTICS) return;
    setReassignDiagnostics(current => ({ ...current, stage: mode === 'REASSIGN' ? 'mode-enter' : 'view-exit',
      candidatesCount: mode === 'REASSIGN' ? current.candidatesCount : 0,
      selectedLeadPresent: mode === 'REASSIGN' ? Boolean(team.leadId) : false }));
  }, [mode]); // Diagnostic observation only; it does not drive preview state.
  useEffect(() => {
    if (!editable) {
      previewCycles.current.invalidate();
      setPreviewLoading(false); setPreviewError('');
      return;
    }
    setCandidates([]); setConfirmUnknown(false); setPreviewError('');
    if (!previewBuildingId || !previewTimeZone) {
      setPreviewLoading(false); setPreviewError('Données du bâtiment indisponibles pour vérifier les disponibilités.'); return;
    }
    if (!date || !time || !durationMinutes) { setPreviewLoading(false); return; }
    const runtimeDiagnostic = REASSIGN_RUNTIME_DIAGNOSTICS && mode === 'REASSIGN';
    const runtimeCycleId = runtimeDiagnostic ? ++diagnosticCycle.current : 0;
    let runtimeSettled = false;
    if (runtimeDiagnostic) setReassignDiagnostics(current => ({ ...current, cycleId: runtimeCycleId,
      stage: 'cycle-start', lastOutcome: 'none', buildingIdPresent: Boolean(previewBuildingId),
      timeZone: previewTimeZone, date, time, durationMinutes, startUtc: '', candidatesCount: 0,
      selectedLeadPresent: Boolean(team.leadId), isAxiosError: null, status: null, code: '', technicalMessage: '' }));
    const cycle = previewCycles.current.begin();
    setPreviewLoading(true);
    if (runtimeDiagnostic) setReassignDiagnostics(current => ({ ...current, stage: 'inputs-ready' }));
    if (runtimeDiagnostic) setReassignDiagnostics(current => ({ ...current, stage: 'debounce-wait' }));
    const timer = window.setTimeout(async () => {
      let request;
      try {
        request = buildTeamPreviewRequest({ buildingId: previewBuildingId, timeZone: previewTimeZone,
          date, time, durationMinutes }, localBoundary);
      } catch {
        request = null;
      }
      if (!cycle.isCurrent()) return;
      if (!request) {
        runtimeSettled = true;
        if (runtimeDiagnostic) setReassignDiagnostics(current => ({ ...current, stage: 'cycle-complete',
          lastOutcome: 'request-error', errorCount: current.errorCount + 1,
          technicalMessage: 'Invalid local preview inputs' }));
        setPreviewLoading(false);
        setPreviewError('Le créneau est invalide. Vérifiez la date, l’heure et le fuseau horaire.');
        return;
      }
      if (runtimeDiagnostic) setReassignDiagnostics(current => ({ ...current, stage: 'payload-built',
        startUtc: request.startUtc }));
      try {
        if (runtimeDiagnostic) setReassignDiagnostics(current => ({ ...current, stage: 'request-start',
          requestCount: current.requestCount + 1 }));
        const response = await api.post<TeamPreview>('/planning/team-preview', request, { signal: cycle.signal });
        if (!cycle.isCurrent()) {
          if (runtimeDiagnostic) setReassignDiagnostics(current => ({ ...current, stage: 'request-stale',
            lastOutcome: 'request-stale', staleCount: current.staleCount + 1 }));
          return;
        }
        setCandidates(response.data.candidates);
        runtimeSettled = true;
        if (runtimeDiagnostic) setReassignDiagnostics(current => ({ ...current, stage: 'request-success',
          lastOutcome: 'request-success', successCount: current.successCount + 1,
          candidatesCount: response.data.candidates.length }));
      } catch (cause) {
        const cancelled = isPreviewCancellation(cause) || axios.isCancel(cause);
        if (runtimeDiagnostic && cancelled && !runtimeSettled) {
          runtimeSettled = true;
          setReassignDiagnostics(current => ({ ...current, stage: 'request-cancelled',
            lastOutcome: 'request-cancelled', cancelCount: current.cancelCount + 1 }));
        }
        if (cycle.isCurrent() && !cancelled) {
          runtimeSettled = true;
          const axiosError = axios.isAxiosError(cause);
          if (runtimeDiagnostic) setReassignDiagnostics(current => ({ ...current, stage: 'request-error',
            lastOutcome: 'request-error', errorCount: current.errorCount + 1, isAxiosError: axiosError,
            status: axiosError ? cause.response?.status ?? null : null,
            code: cause && typeof cause === 'object' && 'code' in cause ? String(cause.code ?? '') : '',
            technicalMessage: axiosError ? 'Axios request failed' : cause instanceof Error ? cause.name : 'Unknown error' }));
          setPreviewError(serverMessage(cause, 'Impossible de vérifier les disponibilités.'));
        }
      } finally {
        if (cycle.isCurrent()) {
          setPreviewLoading(false);
          if (runtimeDiagnostic) setReassignDiagnostics(current => ({ ...current, stage: 'cycle-complete' }));
        }
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      if (runtimeDiagnostic && !runtimeSettled) {
        runtimeSettled = true;
        setReassignDiagnostics(current => ({ ...current, stage: 'request-cancelled',
          lastOutcome: 'request-cancelled', cancelCount: current.cancelCount + 1 }));
      }
      cycle.cancel();
    };
  }, [editable, previewBuildingId, previewTimeZone, date, time, durationMinutes]);

  if (!event) return null;
  const names = new Map(users.map(user => [user.id, user.name]));
  const selected = candidates.filter(candidate => candidate.userId === team.leadId || team.supportIds.includes(candidate.userId));
  const selectedIds = new Set(selected.map(candidate => candidate.userId));
  const previewCoversTeam = Boolean(team.leadId && selectedIds.has(team.leadId) &&
    team.supportIds.every(userId => selectedIds.has(userId)));
  const hasBlocked = selected.some(candidate => candidate.availabilityStatus === 'BLOCKED');
  const hasUnknown = selected.some(candidate => candidate.availabilityStatus === 'UNKNOWN');
  const canSave = Boolean(previewCoversTeam && !previewLoading && !previewError && !hasBlocked && (!hasUnknown || confirmUnknown));

  const save = async () => {
    if (!event.bookingId || !canSave) return;
    setSaving(true); setError('');
    try {
      if (mode === 'REASSIGN') {
        await api.patch(`/planning/bookings/${event.bookingId}/team`, {
          leadUserId: team.leadId, supportUserIds: team.supportIds, confirmUnknown,
        });
      } else {
        const minute = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
        await api.patch(`/planning/bookings/${event.bookingId}/slot`, {
          startUtc: localBoundary(date, minute, event.sourceTimeZone).toISOString(), durationMinutes,
          reschedule: mode === 'RESCHEDULE', confirmUnknown,
        });
      }
      setRefreshing(true); onMutated?.(); setMode('VIEW');
    } catch (cause) {
      setError(serverMessage(cause, 'La planification a changé. Vérifiez les disponibilités et réessayez.'));
      if (axios.isAxiosError(cause) && [409, 400].includes(cause.response?.status ?? 0)) onMutated?.();
    } finally { setSaving(false); setRefreshing(false); }
  };

  const cancelSchedule = async () => {
    if (!event.bookingId) return;
    setSaving(true); setError('');
    try {
      await api.post(`/planning/bookings/${event.bookingId}/cancel-schedule`);
      onMutated?.(); onClose();
    } catch (cause) { setError(serverMessage(cause, 'L’annulation de la planification est impossible.')); }
    finally { setSaving(false); }
  };

  const titles: Record<PlanningDrawerMode, string> = {
    VIEW: eventLabel(event), EDIT_SLOT: 'Modifier le créneau', RESCHEDULE: 'Reporter la planification',
    REASSIGN: 'Réaffecter l’équipe', CANCEL_SCHEDULE: 'Annuler la planification',
  };
  const descriptions: Record<PlanningDrawerMode, string> = {
    VIEW: 'Détail de la planification', EDIT_SLOT: 'Ajustez le créneau en conservant la même activité.',
    RESCHEDULE: 'Choisissez un nouveau créneau. L’équipe actuelle est conservée et revérifiée.',
    REASSIGN: 'Choisissez un nouveau LEAD et, au besoin, des SUPPORT.',
    CANCEL_SCHEDULE: 'Le créneau et les affectations seront annulés. L’activité restera à réaliser et retournera dans Activités à planifier.',
  };

  return <div className={styles.drawerBackdrop} onMouseDown={mouse => { if (mouse.target === mouse.currentTarget) requestClose(); }}>
    <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="planner-drawer-title" aria-busy={saving || refreshing}>
      <div className={styles.drawerHeader}><div><small>{descriptions[mode]}</small>
        <h2 ref={titleRef} tabIndex={-1} id="planner-drawer-title">{titles[mode]}</h2></div>
        <button type="button" className={styles.closeButton} aria-label="Fermer le détail" onClick={requestClose}>×</button></div>

      {mode === 'VIEW' && <>
        <dl className={styles.details}>
          <dt>Type</dt><dd>{event.activityType?.nameFR ?? eventLabel(event)}</dd>
          <dt>Titre</dt><dd>{eventLabel(event)}</dd>
          <dt>Client</dt><dd>{event.clientName ?? '—'}</dd>
          <dt>Bâtiment</dt><dd>{event.buildingName ?? '—'}</dd>
          <dt>Mandat</dt><dd>{event.projectName ?? '—'}</dd>
          <dt>Responsable du mandat</dt><dd>{event.ownerName ?? '—'}</dd>
          <dt>Date et heure</dt><dd>{instant(event.startUtc, displayTimeZone)}</dd>
          <dt>Durée</dt><dd>{initialDuration} minutes</dd>
          <dt>Fuseau</dt><dd>{event.sourceTimeZone}</dd>
          <dt>Booking</dt><dd>{eventStatus(event)}{event.bookingStatus ? ` · ${event.bookingStatus}` : ''}</dd>
        </dl>
        {event.assignments?.length ? <section className={styles.drawerSection}><h3>Équipe affectée</h3><ul>
          {event.assignments.map(assignment => <li key={`${assignment.userId}-${assignment.role}`}>
            <strong>{assignment.role}</strong> · {names.get(assignment.userId) ?? 'Conseiller'} · {assignment.status === 'PENDING' ? 'En attente' : assignment.status === 'ACCEPTED' ? 'Accepté' : assignment.status}
          </li>)}</ul></section> : null}
        {event.warnings.length > 0 && <section className={styles.drawerSection}><h3>À vérifier</h3>
          <ul>{event.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></section>}
        {event.needsAction && <p className={styles.actionNotice}>Une action est requise pour cette planification.</p>}
        {canMutate && event.bookingId && <section className={styles.drawerSection}><h3>Actions</h3><div className={styles.formActions}>
          <button type="button" className={styles.inlineButton} onClick={() => setMode('EDIT_SLOT')}>Modifier le créneau</button>
          <button type="button" className={styles.inlineButton} onClick={() => setMode('RESCHEDULE')}>Reporter</button>
          <button type="button" className={styles.inlineButton} onClick={() => setMode('REASSIGN')}>Réaffecter</button>
          <button type="button" className={styles.dangerButton} onClick={() => setMode('CANCEL_SCHEDULE')}>Annuler la planification</button>
        </div></section>}
        {!canMutate && event.bookingId && <p className={styles.notice}>Consultation seulement. Les mutations du Planner sont réservées aux administrateurs.</p>}
        <div className={styles.drawerLinks}>
          {event.projectId && <Link href={`/projects/${event.projectId}`}>Ouvrir le mandat</Link>}
          {event.clientId && <Link href={`/clients/${event.clientId}`}>Ouvrir le client</Link>}
          {event.buildingId && <Link href={`/buildings/${event.buildingId}`}>Ouvrir le bâtiment</Link>}
        </div>
      </>}

      {(mode === 'EDIT_SLOT' || mode === 'RESCHEDULE') && <>
        {mode === 'RESCHEDULE' && <p className={styles.notice}>Créneau actuel : {instant(event.startUtc, displayTimeZone)} · {initialDuration} minutes</p>}
        <section className={styles.slotSection}><div className={styles.slotGrid}>
          <label>Nouvelle date<input type="date" value={date} onChange={change => setDate(change.target.value)} /></label>
          <label>Nouvelle heure<input type="time" value={time} onChange={change => setTime(change.target.value)} /></label>
          <label>Durée (minutes)<input type="number" min={15} max={1440} step={15} value={durationMinutes}
            onChange={change => setDurationMinutes(Number(change.target.value))} /></label>
        </div></section>
        <p className={styles.notice}>Équipe actuelle conservée : {event.assignments?.map(item => names.get(item.userId)).filter(Boolean).join(', ') || 'Aucune'}</p>
        {previewError ? <p className={styles.error} role="alert">{previewError}</p> :
          <SchedulingPreview complete={Boolean(date && time && durationMinutes)} loading={previewLoading} candidates={candidates} team={team} timeZone={event.sourceTimeZone} />}
        {hasBlocked && <p className={styles.error}>Un membre est non disponible. Choisissez un autre créneau ou réaffectez l’équipe.</p>}
        {hasUnknown && <label className={styles.checkbox}><input type="checkbox" checked={confirmUnknown} onChange={change => setConfirmUnknown(change.target.checked)} />Confirmer les disponibilités à vérifier</label>}
        <div className={styles.formActions}><button type="button" onClick={() => setMode('VIEW')}>Retour</button>
          {hasBlocked && <button type="button" className={styles.inlineButton} onClick={() => setMode('REASSIGN')}>Réaffecter</button>}
          <button type="button" className={styles.primaryButton} disabled={!canSave || saving} onClick={save}>{saving ? 'Enregistrement…' : mode === 'RESCHEDULE' ? 'Confirmer le report' : 'Enregistrer le créneau'}</button></div>
      </>}

      {mode === 'REASSIGN' && <>
        {REASSIGN_RUNTIME_DIAGNOSTICS && <section className={styles.notice} aria-label="Diagnostic REASSIGN">
          <strong>DIAGNOSTIC REASSIGN</strong><pre>{`cycle: ${reassignDiagnostics.cycleId}\nstage: ${reassignDiagnostics.stage}\nlast: ${reassignDiagnostics.lastOutcome}\nrequest/success/cancel/stale/error: ${reassignDiagnostics.requestCount}/${reassignDiagnostics.successCount}/${reassignDiagnostics.cancelCount}/${reassignDiagnostics.staleCount}/${reassignDiagnostics.errorCount}\nbuildingIdPresent: ${reassignDiagnostics.buildingIdPresent}\ntimezone: ${reassignDiagnostics.timeZone}\ndate: ${reassignDiagnostics.date}\ntime: ${reassignDiagnostics.time}\nduration: ${reassignDiagnostics.durationMinutes}\nstartUtc: ${reassignDiagnostics.startUtc || 'not-built'}\ncandidates: ${reassignDiagnostics.candidatesCount}\nselected lead: ${reassignDiagnostics.selectedLeadPresent ? 'present' : 'absent'}\naxios: ${reassignDiagnostics.isAxiosError ?? 'n/a'}\nstatus: ${reassignDiagnostics.status ?? 'n/a'}\ncode: ${reassignDiagnostics.code || 'n/a'}\ntechnical: ${reassignDiagnostics.technicalMessage || 'n/a'}`}</pre>
        </section>}
        <p className={styles.notice}>LEAD actuel : {names.get(initialTeam.leadId) ?? 'Aucun'}<br />SUPPORT actuels : {initialTeam.supportIds.map(id => names.get(id)).filter(Boolean).join(', ') || 'Aucun'}</p>
        {previewError && <p className={styles.error} role="alert">{previewError}</p>}
        {!previewError && <TeamPicker candidates={candidates} team={team} onChange={setTeam} />}
        {!previewError && <SchedulingPreview complete loading={previewLoading} candidates={candidates} team={team} timeZone={event.sourceTimeZone} />}
        {hasBlocked && <p className={styles.error}>Le membre sélectionné est non disponible sur ce créneau.</p>}
        {hasUnknown && <label className={styles.checkbox}><input type="checkbox" checked={confirmUnknown} onChange={change => setConfirmUnknown(change.target.checked)} />Confirmer les disponibilités à vérifier</label>}
        <div className={styles.formActions}><button type="button" onClick={() => setMode('VIEW')}>Retour</button>
          <button type="button" className={styles.primaryButton} disabled={!canSave || saving} onClick={save}>{saving ? 'Enregistrement…' : 'Enregistrer la nouvelle équipe'}</button></div>
      </>}

      {mode === 'CANCEL_SCHEDULE' && <section className={styles.destructivePanel}>
        <h3>Confirmer la déplanification</h3><p>{descriptions.CANCEL_SCHEDULE}</p>
        <div className={styles.formActions}><button type="button" onClick={() => setMode('VIEW')}>Retour</button>
          <button type="button" className={styles.dangerButton} disabled={saving} onClick={cancelSchedule}>{saving ? 'Annulation…' : 'Annuler la planification'}</button></div>
      </section>}

      {editable && previewLoading && <p className={styles.notice} role="status">Vérification des disponibilités…</p>}
      {saving && <p className={styles.notice} role="status">Enregistrement…</p>}
      {refreshing && <p className={styles.notice} role="status">Actualisation…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {confirmDiscard && <section className={styles.confirmPanel} role="alertdialog" aria-label="Modifications non enregistrées">
        <p>Abandonner les modifications non enregistrées ?</p><div className={styles.formActions}>
          <button type="button" onClick={() => setConfirmDiscard(false)}>Continuer la modification</button>
          <button type="button" className={styles.dangerButton} onClick={onClose}>Abandonner</button>
        </div></section>}
    </aside>
  </div>;
}
