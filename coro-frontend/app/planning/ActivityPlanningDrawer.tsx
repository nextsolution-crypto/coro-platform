'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import api from '@/lib/api';
import type { PlanningAction, PlanningContext } from './types';
import styles from './planning.module.css';

type Mode = 'CREATE' | 'PLAN_EXISTING';

export default function ActivityPlanningDrawer({ mode, action, context, onClose, onCreated }: {
  mode: Mode; action?: PlanningAction | null; context: PlanningContext; onClose: () => void; onCreated: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [clientId, setClientId] = useState(action?.clientId ?? '');
  const [buildingId, setBuildingId] = useState(action?.buildingId ?? '');
  const [projectId, setProjectId] = useState(action?.projectId ?? '');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [modeValue, setModeValue] = useState('presentiel');
  const [clientVisible, setClientVisible] = useState(true);
  const [clientBookable, setClientBookable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const buildings = useMemo(() => context.buildings.filter(item => !clientId || item.clientId === clientId), [context, clientId]);
  const projects = useMemo(() => context.projects.filter(item => (!clientId || item.clientId === clientId) &&
    (!buildingId || item.buildingId === buildingId)), [context, clientId, buildingId]);
  const selectedType = context.activityTypes.find(item => item.id === activityTypeId);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [onClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!projectId || !activityTypeId) { setError('Choisissez un mandat et un type d’activité.'); return; }
    setSaving(true);
    try {
      await api.post('/planning/activities', { projectId, activityTypeId, customLabel: customLabel || undefined,
        notes: notes || undefined, mode: modeValue, clientVisible, clientBookable });
      onCreated(); onClose();
    } catch (cause) {
      const message = axios.isAxiosError(cause) ? cause.response?.data?.message : null;
      setError(Array.isArray(message) ? message.join(' ') : message || 'Impossible de créer l’activité.');
    } finally { setSaving(false); }
  };

  return <div className={styles.drawerBackdrop} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="activity-drawer-title">
      <div className={styles.drawerHeader}><div><small>Activité du mandat</small>
        <h2 id="activity-drawer-title">{mode === 'CREATE' ? 'Créer une activité à planifier' : action?.label}</h2></div>
        <button ref={closeRef} type="button" className={styles.closeButton} aria-label="Fermer" onClick={onClose}>×</button>
      </div>
      {mode === 'PLAN_EXISTING' ? <>
        <dl className={styles.details}>
          <dt>Client</dt><dd>{action?.clientName ?? '—'}</dd>
          <dt>Bâtiment</dt><dd>{action?.buildingName ?? '—'}</dd>
          <dt>Mandat</dt><dd>{action?.projectName ?? '—'}</dd>
          <dt>Type</dt><dd>{action?.activityTypeName ?? action?.label}</dd>
          <dt>État</dt><dd>À planifier</dd>
        </dl>
        <p className={styles.notice}>Le choix du créneau et de l’équipe sera activé avec Scheduling dans 2D.3.3B/C.</p>
      </> : <form className={styles.activityForm} onSubmit={submit}>
        <label>Client<select required value={clientId} onChange={event => { setClientId(event.target.value); setBuildingId(''); setProjectId(''); }}>
          <option value="">Choisir un client</option>{context.clients.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Bâtiment<select required value={buildingId} disabled={!clientId} onChange={event => { setBuildingId(event.target.value); setProjectId(''); }}>
          <option value="">Choisir un bâtiment</option>{buildings.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Mandat<select required value={projectId} disabled={!buildingId} onChange={event => setProjectId(event.target.value)}>
          <option value="">Choisir un mandat</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name} · {item.year}</option>)}</select></label>
        <label>Type d’activité<select required value={activityTypeId} onChange={event => { const id = event.target.value; setActivityTypeId(id); const type = context.activityTypes.find(item => item.id === id); setClientBookable(type?.clientBookableDefault ?? false); }}>
          <option value="">Choisir un type</option>{context.activityTypes.map(item => <option key={item.id} value={item.id}>{item.nameFR}</option>)}</select></label>
        {selectedType?.code === 'autre' && <label>Titre personnalisé<input required maxLength={160} value={customLabel} onChange={event => setCustomLabel(event.target.value)} /></label>}
        <label>Mode<select value={modeValue} onChange={event => setModeValue(event.target.value)}><option value="presentiel">Présentiel</option><option value="teams">Teams</option><option value="hybride">Hybride</option></select></label>
        <label>Notes<textarea maxLength={2000} rows={4} value={notes} onChange={event => setNotes(event.target.value)} /></label>
        <label className={styles.checkbox}><input type="checkbox" checked={clientVisible} onChange={event => { setClientVisible(event.target.checked); if (!event.target.checked) setClientBookable(false); }} />Visible par le client</label>
        <label className={styles.checkbox}><input type="checkbox" checked={clientBookable} disabled={!clientVisible} onChange={event => setClientBookable(event.target.checked)} />Réservable par le client</label>
        <p className={styles.formHint}>L’activité sera créée sans créneau et apparaîtra dans « Activités à planifier ».</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.primaryButton} type="submit" disabled={saving}>{saving ? 'Création…' : 'Créer l’activité'}</button>
      </form>}
    </aside>
  </div>;
}
