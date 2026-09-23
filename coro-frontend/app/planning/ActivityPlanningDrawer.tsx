'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import api from '@/lib/api';
import type { PlanningAction, PlanningContext, TeamCandidate, TeamPreview } from './types';
import { completeSlot, selectLead, teamDirty, type TeamDraft } from './teamPickerState';
import { dateKey, localBoundary, timeValue } from './time';
import TeamPicker from './TeamPicker';
import SchedulingPreview from './SchedulingPreview';
import styles from './planning.module.css';

type Mode = 'CREATE' | 'PLAN_EXISTING';
type InitialSlot = { date: string; time: string; leadId?: string };
const EMPTY_TEAM: TeamDraft = { leadId: '', supportIds: [] };

export default function ActivityPlanningDrawer({ mode, action, context, initialSlot, onClose, onCreated }: {
  mode: Mode; action?: PlanningAction | null; context: PlanningContext; initialSlot?: InitialSlot;
  onClose: () => void; onCreated: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [clientId, setClientId] = useState(action?.clientId ?? '');
  const [buildingId, setBuildingId] = useState(action?.buildingId ?? '');
  const [projectId, setProjectId] = useState(action?.projectId ?? '');
  const [activityTypeId, setActivityTypeId] = useState(action?.activityTypeId ?? '');
  const [customLabel, setCustomLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [modeValue, setModeValue] = useState('presentiel');
  const [clientVisible, setClientVisible] = useState(true);
  const [clientBookable, setClientBookable] = useState(false);
  const historicalStart = action?.lastEffectiveStartUtc;
  const historicalZone = context.buildings.find(item => item.id === action?.buildingId)?.timeZone ?? 'America/Toronto';
  const [date, setDate] = useState(initialSlot?.date ?? (historicalStart ? dateKey(new Date(historicalStart), historicalZone) : ''));
  const [time, setTime] = useState(initialSlot?.time ?? (historicalStart ? timeValue(historicalStart, historicalZone) : ''));
  const [durationMinutes, setDurationMinutes] = useState<number | null>(action?.lastDurationMinutes ?? action?.durationMinutes ?? null);
  const [team, setTeam] = useState<TeamDraft>(EMPTY_TEAM);
  const [candidates, setCandidates] = useState<TeamCandidate[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const suggestedLeadId = initialSlot?.leadId ?? action?.lastLead?.userId;
  const [teamOpen, setTeamOpen] = useState(Boolean(suggestedLeadId));
  const [saving, setSaving] = useState(false);
  const [planningSaving, setPlanningSaving] = useState(false);
  const [confirmUnknown, setConfirmUnknown] = useState(false);
  const [error, setError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const buildings = useMemo(() => context.buildings.filter(item => !clientId || item.clientId === clientId), [context, clientId]);
  const projects = useMemo(() => context.projects.filter(item => (!clientId || item.clientId === clientId) && (!buildingId || item.buildingId === buildingId)), [context, clientId, buildingId]);
  const selectedType = context.activityTypes.find(item => item.id === activityTypeId);
  const building = context.buildings.find(item => item.id === buildingId);
  const slotComplete = completeSlot(date, time, durationMinutes);
  const dirty = teamDirty(team, date, time, durationMinutes === (action?.durationMinutes ?? null) ? null : durationMinutes);

  const requestClose = useCallback(() => {
    if (dirty) { setConfirmDiscard(true); return; }
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') requestClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [requestClose]);

  useEffect(() => {
    setCandidates([]); setPreviewError('');
    if (!teamOpen || !slotComplete || !building || !durationMinutes) { setPreviewLoading(false); return; }
    setPreviewLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const minute = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
        const startUtc = localBoundary(date, minute, building.timeZone).toISOString();
        const response = await api.post<TeamPreview>('/planning/team-preview', { buildingId: building.id, startUtc, durationMinutes });
        setCandidates(response.data.candidates);
        if (suggestedLeadId) setTeam(current => selectLead(current, suggestedLeadId, response.data.candidates));
      } catch (cause) {
        const message = axios.isAxiosError(cause) ? cause.response?.data?.message : null;
        setPreviewError(Array.isArray(message) ? message.join(' ') : message || 'Impossible de vérifier les disponibilités.');
      } finally { setPreviewLoading(false); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [teamOpen, slotComplete, building, date, time, durationMinutes, suggestedLeadId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!projectId || !activityTypeId) { setError('Choisissez un mandat et un type d’activité.'); return; }
    setSaving(true);
    try {
      await api.post('/planning/activities', { projectId, activityTypeId, customLabel: customLabel || undefined, notes: notes || undefined, mode: modeValue, clientVisible, clientBookable });
      onCreated(); onClose();
    } catch (cause) {
      const message = axios.isAxiosError(cause) ? cause.response?.data?.message : null;
      setError(Array.isArray(message) ? message.join(' ') : message || 'Impossible de créer l’activité.');
    } finally { setSaving(false); }
  };

  const plan = async (create: boolean) => {
    setError('');
    if (!building || !slotComplete || !durationMinutes || !team.leadId) {
      setError('Définissez un créneau et choisissez un LEAD.'); return;
    }
    const selected = candidates.filter(candidate => candidate.userId === team.leadId || team.supportIds.includes(candidate.userId));
    if (selected.some(candidate => candidate.availabilityStatus === 'UNKNOWN') && !confirmUnknown) {
      setError('Confirmez explicitement les disponibilités à vérifier.'); return;
    }
    setPlanningSaving(true);
    try {
      const minute = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
      const common = { startUtc: localBoundary(date, minute, building.timeZone).toISOString(), durationMinutes,
        leadUserId: team.leadId, supportUserIds: team.supportIds, confirmUnknown };
      if (create) {
        if (!projectId || !activityTypeId) throw new Error('Choisissez un mandat et un type d’activité.');
        await api.post('/planning/activities/create-and-plan', { ...common, projectId, activityTypeId,
          customLabel: customLabel || undefined, notes: notes || undefined, mode: modeValue, clientVisible, clientBookable });
      } else {
        if (!action?.activityId) throw new Error('Activité introuvable.');
        await api.post(`/planning/activities/${action.activityId}/plan`, common);
      }
      onCreated(); onClose();
    } catch (cause) {
      const message = axios.isAxiosError(cause) ? cause.response?.data?.message : cause instanceof Error ? cause.message : null;
      setError(Array.isArray(message) ? message.join(' ') : message || 'La planification a changé. Actualisez les disponibilités.');
    } finally { setPlanningSaving(false); }
  };

  const slotFields = <section className={styles.slotSection}><div className={styles.sectionHeading}><h3>Créneau</h3>
    {building && <span>{building.timeZoneVerified ? `Fuseau du bâtiment : ${building.timeZone}` : `Fuseau horaire du bâtiment à confirmer : ${building.timeZone}`}</span>}</div>
    <div className={styles.slotGrid}><label>Date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
      <label>Heure de début<input type="time" value={time} onChange={event => setTime(event.target.value)} /></label>
      <label>Durée (minutes)<input type="number" min={15} max={1440} step={15} value={durationMinutes ?? ''} onChange={event => setDurationMinutes(event.target.value ? Number(event.target.value) : null)} /></label></div>
    {!slotComplete && <p className={styles.notice}>Définissez un créneau pour vérifier la disponibilité.</p>}
    {!teamOpen && <button type="button" className={styles.inlineButton} disabled={!slotComplete || !buildingId} onClick={() => setTeamOpen(true)}>Vérifier les disponibilités</button>}
    {previewError && <p className={styles.error} role="alert">{previewError}</p>}
    {teamOpen && <><TeamPicker candidates={candidates} team={team} onChange={setTeam} />
      <SchedulingPreview complete={slotComplete} loading={previewLoading} candidates={candidates} team={team} timeZone={building?.timeZone ?? 'America/Toronto'} />
      {candidates.some(candidate => candidate.availabilityStatus === 'UNKNOWN' &&
        (candidate.userId === team.leadId || team.supportIds.includes(candidate.userId))) &&
        <label className={styles.checkbox}><input type="checkbox" checked={confirmUnknown} onChange={event => setConfirmUnknown(event.target.checked)} />Confirmer les disponibilités à vérifier</label>}
      {mode === 'PLAN_EXISTING' && <button type="button" className={styles.primaryButton} disabled={planningSaving || previewLoading || !team.leadId}
        onClick={() => plan(false)}>{planningSaving ? 'Planification…' : 'Confirmer la planification'}</button>}</>}
  </section>;

  return <div className={styles.drawerBackdrop} onMouseDown={event => { if (event.target === event.currentTarget) requestClose(); }}>
    <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="activity-drawer-title">
      <div className={styles.drawerHeader}><div><small>Activité du mandat</small><h2 id="activity-drawer-title">{mode === 'CREATE' ? 'Créer une activité à planifier' : action?.label}</h2></div>
        <button ref={closeRef} type="button" className={styles.closeButton} aria-label="Fermer" onClick={requestClose}>×</button></div>
      {mode === 'PLAN_EXISTING' ? <><dl className={styles.details}><dt>Client</dt><dd>{action?.clientName ?? '—'}</dd>
        <dt>Bâtiment</dt><dd>{action?.buildingName ?? '—'}</dd><dt>Mandat</dt><dd>{action?.projectName ?? '—'}</dd>
        <dt>Type</dt><dd>{action?.activityTypeName ?? action?.label}</dd><dt>État</dt><dd>À planifier</dd></dl>{slotFields}
        {error && <p className={styles.error} role="alert">{error}</p>}</>
      : <form className={styles.activityForm} onSubmit={submit}>
        <label>Client<select required value={clientId} onChange={event => { setClientId(event.target.value); setBuildingId(''); setProjectId(''); setTeam(EMPTY_TEAM); }}><option value="">Choisir un client</option>{context.clients.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Bâtiment<select required value={buildingId} disabled={!clientId} onChange={event => { setBuildingId(event.target.value); setProjectId(''); setTeam(EMPTY_TEAM); setCandidates([]); }}><option value="">Choisir un bâtiment</option>{buildings.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Mandat<select required value={projectId} disabled={!buildingId} onChange={event => setProjectId(event.target.value)}><option value="">Choisir un mandat</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name} · {item.year}</option>)}</select></label>
        <label>Type d’activité<select required value={activityTypeId} onChange={event => { const id = event.target.value; setActivityTypeId(id); const type = context.activityTypes.find(item => item.id === id); setClientBookable(type?.clientBookableDefault ?? false); if (type?.defaultDurationMinutes) setDurationMinutes(type.defaultDurationMinutes); }}><option value="">Choisir un type</option>{context.activityTypes.map(item => <option key={item.id} value={item.id}>{item.nameFR}</option>)}</select></label>
        {selectedType?.code === 'autre' && <label>Titre personnalisé<input required maxLength={160} value={customLabel} onChange={event => setCustomLabel(event.target.value)} /></label>}
        <label>Mode<select value={modeValue} onChange={event => setModeValue(event.target.value)}><option value="presentiel">Présentiel</option><option value="teams">Teams</option><option value="hybride">Hybride</option></select></label>
        <label>Notes<textarea maxLength={2000} rows={4} value={notes} onChange={event => setNotes(event.target.value)} /></label>
        <label className={styles.checkbox}><input type="checkbox" checked={clientVisible} onChange={event => { setClientVisible(event.target.checked); if (!event.target.checked) setClientBookable(false); }} />Visible par le client</label>
        <label className={styles.checkbox}><input type="checkbox" checked={clientBookable} disabled={!clientVisible} onChange={event => setClientBookable(event.target.checked)} />Réservable par le client</label>
        {slotFields}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.formActions}><button className={styles.inlineButton} type="submit" disabled={saving || planningSaving}>{saving ? 'Ajout…' : 'Ajouter à « À planifier »'}</button>
          <button className={styles.primaryButton} type="button" disabled={saving || planningSaving || previewLoading || !team.leadId}
            onClick={() => plan(true)}>{planningSaving ? 'Planification…' : 'Planifier maintenant'}</button></div>
      </form>}
      {confirmDiscard && <section className={styles.confirmPanel} role="alertdialog" aria-label="Modifications non enregistrees">
        <p>Abandonner les modifications non enregistrÃ©es ?</p><div className={styles.formActions}>
          <button type="button" onClick={() => setConfirmDiscard(false)}>Continuer la modification</button>
          <button type="button" className={styles.dangerButton} onClick={onClose}>Abandonner</button>
        </div></section>}
    </aside>
  </div>;
}
