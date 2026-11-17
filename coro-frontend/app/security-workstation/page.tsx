'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import styles from './security-workstation.module.css';

type Building = { id: string; name: string };
type Capability = 'log' | 'shifts' | 'directives' | 'followUps' | 'reports';
type CapabilityState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'denied' | 'error';
type LogEntry = { id: string; eventAt: string; category: string; description: string; priority: string; locationLabel?: string; status: string };
type Handover = { id: string; status: string; lockVersion: number };
type Shift = { id: string; securityPost: string; teamName?: string; status: string; plannedStartAt: string; lockVersion: number; outgoingHandovers?: Handover[] };
type Directive = { id: string; title: string; priority: string; status: string; acknowledgementRequired: boolean; versions: { id: string; description: string }[]; receipts: { status: string }[] };
type FollowUp = { id: string; description: string; priority: string; status: string; dueAt?: string; lockVersion: number };
type Report = { id: string; reportNumber: string; title: string; status: string };

const INITIAL_CAPABILITIES: Record<Capability, CapabilityState> = { log: 'idle', shifts: 'idle', directives: 'idle', followUps: 'idle', reports: 'idle' };
const CAPABILITY_LABELS: Record<Capability, string> = { log: 'Main courante', shifts: 'Quarts et relève', directives: 'Consignes', followUps: 'Suivis', reports: 'CORO Report' };
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Actif', OPEN: 'Ouvert', PLANNED: 'Planifié', HANDOVER_PENDING: 'Relève à confirmer', PUBLISHED: 'Publiée', CONFIRMED: 'Confirmée', ASSIGNED: 'Assigné', IN_PROGRESS: 'En cours', COMPLETED: 'À vérifier', VERIFIED: 'Vérifié', CLOSED: 'Fermé', SUBMITTED: 'Soumis', IN_REVIEW: 'En révision', CORRECTION_REQUESTED: 'Corrections demandées', APPROVED: 'Approuvé' };

function stateFromError(error: unknown): CapabilityState {
  if (typeof error !== 'object' || error === null || !('response' in error)) return 'error';
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 404 ? 'unavailable' : status === 401 || status === 403 ? 'denied' : 'error';
}
function errorMessage(error: unknown, fallback: string) {
  if (typeof error !== 'object' || error === null || !('response' in error)) return fallback;
  const message = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message;
  return typeof message === 'string' ? message : fallback;
}
function CapabilityBadge({ state }: { state: CapabilityState }) {
  const labels: Record<CapabilityState, string> = { idle: 'En attente', loading: 'Chargement', ready: 'Disponible', unavailable: 'Non activé', denied: 'Accès limité', error: 'À reprendre' };
  return <span className={`${styles.badge} ${styles[`badge_${state}`]}`}>{labels[state]}</span>;
}

export default function SecurityWorkstationPage() {
  const user = useAuthStore((state) => state.user);
  const organizationId = user?.organizationId ?? '';
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [capabilities, setCapabilities] = useState(INITIAL_CAPABILITIES);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const building = buildings.find((item) => item.id === buildingId);

  const load = useCallback(async (targetBuildingId: string) => {
    if (!organizationId || !targetBuildingId) return;
    setCapabilities({ log: 'loading', shifts: 'loading', directives: 'loading', followUps: 'loading', reports: 'loading' });
    const requests = {
      log: api.get(`/organizations/${organizationId}/operational-log/entries`, { params: { buildingId: targetBuildingId, page: 1, pageSize: 8 } }),
      shifts: api.get(`/organizations/${organizationId}/operational-shifts`, { params: { buildingId: targetBuildingId, limit: 10 } }).then(async (response) => {
        const listed = response.data as Shift[];
        const active = listed.find((shift) => ['OPEN', 'ACTIVE', 'HANDOVER_PENDING'].includes(shift.status));
        if (!active) return response;
        const detail = await api.get(`/organizations/${organizationId}/operational-shifts/${active.id}`);
        return { ...response, data: listed.map((shift) => shift.id === active.id ? detail.data : shift) };
      }),
      directives: api.get(`/organizations/${organizationId}/operations/directives`, { params: { buildingId: targetBuildingId, limit: 10 } }),
      followUps: api.get(`/organizations/${organizationId}/operations/follow-ups`, { params: { buildingId: targetBuildingId, limit: 10 } }),
      reports: api.get(`/organizations/${organizationId}/incident-reports`, { params: { buildingId: targetBuildingId, page: 1, pageSize: 8 } }),
    };
    const keys = Object.keys(requests) as Capability[];
    const results = await Promise.allSettled(keys.map((key) => requests[key]));
    const next = { ...INITIAL_CAPABILITIES };
    results.forEach((result, index) => {
      const key = keys[index];
      if (result.status === 'fulfilled') {
        next[key] = 'ready'; const data = result.value.data;
        if (key === 'log') setEntries(data.items ?? []);
        if (key === 'shifts') setShifts(data ?? []);
        if (key === 'directives') setDirectives(data ?? []);
        if (key === 'followUps') setFollowUps(data ?? []);
        if (key === 'reports') setReports(data.items ?? []);
      } else {
        next[key] = stateFromError(result.reason);
        if (key === 'log') setEntries([]); if (key === 'shifts') setShifts([]); if (key === 'directives') setDirectives([]); if (key === 'followUps') setFollowUps([]); if (key === 'reports') setReports([]);
      }
    });
    setCapabilities(next);
  }, [organizationId]);

  useEffect(() => { void api.get('/buildings').then((response) => setBuildings(response.data)).catch(() => setMessage('Impossible de charger vos bâtiments autorisés.')); }, []);
  const activeShift = useMemo(() => shifts.find((shift) => ['OPEN', 'ACTIVE', 'HANDOVER_PENDING'].includes(shift.status)), [shifts]);
  const unconfirmed = directives.filter((item) => item.status === 'PUBLISHED' && item.acknowledgementRequired && item.receipts[0]?.status !== 'CONFIRMED');
  const overdue = followUps.filter((item) => item.dueAt && new Date(item.dueAt) < new Date() && !['VERIFIED', 'CLOSED', 'CANCELLED'].includes(item.status));
  const reportQueue = reports.filter((report) => ['SUBMITTED', 'IN_REVIEW', 'CORRECTION_REQUESTED'].includes(report.status));
  async function refresh(success?: string) { await load(buildingId); if (success) setMessage(success); }

  async function createEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!buildingId) return; const form = event.currentTarget; const data = new FormData(form); setBusy(true);
    try { await api.post(`/organizations/${organizationId}/operational-log/entries`, { buildingId, eventAt: new Date().toISOString(), activityType: 'OBSERVATION', category: String(data.get('category')), priority: String(data.get('priority')), locationLabel: String(data.get('locationLabel') ?? ''), description: String(data.get('description')), followUpRequired: data.get('followUpRequired') === 'on', idempotencyKey: crypto.randomUUID() }); form.reset(); await refresh('Entrée ajoutée à la main courante.'); }
    catch (error) { setMessage(errorMessage(error, "L'entrée n'a pas pu être enregistrée.")); } finally { setBusy(false); }
  }
  async function acknowledge(directive: Directive) {
    const versionId = directive.versions[0]?.id; if (!versionId) return; setBusy(true);
    try { await api.post(`/organizations/${organizationId}/operations/directives/${directive.id}/acknowledge`, { versionId, idempotencyKey: crypto.randomUUID() }); await refresh('Prise de connaissance confirmée.'); }
    catch (error) { setMessage(errorMessage(error, 'La confirmation a été refusée.')); } finally { setBusy(false); }
  }
  async function transitionFollowUp(item: FollowUp, transition: 'start' | 'complete' | 'verify' | 'close') {
    setBusy(true); try { await api.post(`/organizations/${organizationId}/operations/follow-ups/${item.id}/${transition}`, { lockVersion: item.lockVersion, idempotencyKey: crypto.randomUUID(), reason: 'Mise à jour depuis le poste de sécurité' }); await refresh('Suivi actualisé et journalisé.'); }
    catch (error) { setMessage(errorMessage(error, 'La transition du suivi a été refusée.')); } finally { setBusy(false); }
  }
  async function decideHandover(handover: Handover, decision: 'ACKNOWLEDGED' | 'CLARIFICATION_REQUESTED') {
    setBusy(true); try { await api.post(`/organizations/${organizationId}/operational-shifts/handovers/${handover.id}/decision`, { decision, lockVersion: handover.lockVersion, idempotencyKey: crypto.randomUUID() }); await refresh('Décision de relève enregistrée.'); }
    catch (error) { setMessage(errorMessage(error, 'La décision de relève a été refusée.')); } finally { setBusy(false); }
  }
  const handover = activeShift?.outgoingHandovers?.find((item) => item.status === 'PENDING');

  return <AppLayout><main className={styles.page}>
    <header className={styles.hero}><div><span className={styles.eyebrow}>CORO INCIDENT · POSTE INTÉGRÉ</span><h1>Poste de sécurité</h1><p>Quart, main courante, consignes, suivis et rapports dans le contexte du bâtiment.</p></div><div className={styles.identity}><strong>{user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'}</strong><span>{building?.name ?? 'Sélectionnez un bâtiment'}</span></div></header>
    {message && <div className={styles.notice} role="status" aria-live="polite"><span>{message}</span><button type="button" onClick={() => setMessage('')} aria-label="Fermer le message">×</button></div>}
    <section className={styles.selector} aria-label="Contexte du poste"><label>Bâtiment autorisé<select value={buildingId} onChange={(event) => { const id = event.target.value; setBuildingId(id); setMessage(''); if (id) void load(id); }}><option value="">Sélectionner</option>{buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{buildingId && <button type="button" className={styles.refresh} disabled={busy} onClick={() => void refresh('Données actualisées.')}>Actualiser</button>}</section>
    {buildingId && <>
      <section className={styles.capabilities} aria-label="Capacités opérationnelles">{(Object.keys(capabilities) as Capability[]).map((key) => <div key={key}><span>{CAPABILITY_LABELS[key]}</span><CapabilityBadge state={capabilities[key]}/></div>)}</section>
      <section className={styles.summary} aria-label="Situation opérationnelle"><article><span>Quart</span><strong>{activeShift ? STATUS_LABELS[activeShift.status] ?? activeShift.status : 'Aucun quart actif'}</strong><small>{activeShift?.securityPost ?? 'Poste non ouvert'}</small></article><article><span>Consignes à confirmer</span><strong>{unconfirmed.length}</strong><small>{directives.filter((item) => item.status === 'PUBLISHED').length} consigne(s) active(s)</small></article><article><span>Suivis en retard</span><strong>{overdue.length}</strong><small>{followUps.filter((item) => !['CLOSED', 'CANCELLED'].includes(item.status)).length} suivi(s) ouvert(s)</small></article><article><span>Rapports à traiter</span><strong>{reportQueue.length}</strong><small>{reports.length} rapport(s) visible(s)</small></article></section>
      <nav className={styles.quickActions} aria-label="Actions rapides"><a href="#quick-entry">Nouvelle entrée</a><Link href="/incident-reports">Nouveau rapport</Link><Link href="/operational-shifts">Gérer le quart</Link><Link href="/operational-directives">Consignes et suivis</Link></nav>
      <div className={styles.workspace}><section className={styles.timeline} aria-labelledby="timeline-title"><div className={styles.sectionHeading}><div><span>Main courante</span><h2 id="timeline-title">Chronologie récente</h2></div><CapabilityBadge state={capabilities.log}/></div>{capabilities.log === 'ready' ? <>{entries.map((entry) => <article className={styles.timelineItem} key={entry.id}><time>{new Date(entry.eventAt).toLocaleString('fr-CA')}</time><div><div className={styles.itemHeading}><strong>{entry.category}</strong><span data-priority={entry.priority}>{entry.priority}</span></div><p>{entry.description}</p><small>{entry.locationLabel ?? 'Emplacement non précisé'} · {STATUS_LABELS[entry.status] ?? entry.status}</small></div></article>)}{!entries.length && <p className={styles.empty}>Aucune entrée récente pour ce bâtiment.</p>}</> : <ModuleState state={capabilities.log} name="la main courante"/>}</section>
        <aside className={styles.sideRail}><section className={styles.panel}><div className={styles.sectionHeading}><div><span>Quart actuel</span><h2>{activeShift?.securityPost ?? 'Aucun quart actif'}</h2></div><CapabilityBadge state={capabilities.shifts}/></div>{activeShift && <><p>{activeShift.teamName ?? 'Équipe non nommée'} · début {new Date(activeShift.plannedStartAt).toLocaleString('fr-CA')}</p>{handover && <div className={styles.actionStack}><button disabled={busy} onClick={() => void decideHandover(handover, 'ACKNOWLEDGED')}>Accuser réception</button><button className={styles.secondary} disabled={busy} onClick={() => void decideHandover(handover, 'CLARIFICATION_REQUESTED')}>Demander une clarification</button></div>}</>}<Link className={styles.textLink} href="/operational-shifts">Ouvrir le détail du quart</Link></section>
          <section className={styles.panel}><div className={styles.sectionHeading}><div><span>Consignes</span><h2>À prendre en compte</h2></div><CapabilityBadge state={capabilities.directives}/></div>{directives.filter((item) => item.status === 'PUBLISHED').slice(0, 4).map((item) => <article className={styles.compact} key={item.id}><div className={styles.itemHeading}><strong>{item.title}</strong><span data-priority={item.priority}>{item.priority}</span></div><p>{item.versions[0]?.description}</p>{item.acknowledgementRequired && item.receipts[0]?.status !== 'CONFIRMED' && <button disabled={busy} onClick={() => void acknowledge(item)}>Confirmer ma lecture</button>}</article>)}{capabilities.directives === 'ready' && !directives.some((item) => item.status === 'PUBLISHED') && <p className={styles.empty}>Aucune consigne active.</p>}</section></aside></div>
      <section className={styles.lowerGrid}><div className={styles.panel}><div className={styles.sectionHeading}><div><span>Continuité</span><h2>Suivis opérationnels</h2></div><CapabilityBadge state={capabilities.followUps}/></div>{followUps.slice(0, 6).map((item) => <article className={styles.compact} key={item.id}><div className={styles.itemHeading}><strong>{item.description}</strong><span>{STATUS_LABELS[item.status] ?? item.status}</span></div><small>{item.dueAt ? `Échéance ${new Date(item.dueAt).toLocaleString('fr-CA')}` : 'Sans échéance'}</small><div className={styles.inlineActions}>{item.status === 'ASSIGNED' && <button disabled={busy} onClick={() => void transitionFollowUp(item, 'start')}>Commencer</button>}{item.status === 'IN_PROGRESS' && <button disabled={busy} onClick={() => void transitionFollowUp(item, 'complete')}>Terminer</button>}{item.status === 'COMPLETED' && <button disabled={busy} onClick={() => void transitionFollowUp(item, 'verify')}>Vérifier</button>}{item.status === 'VERIFIED' && <button disabled={busy} onClick={() => void transitionFollowUp(item, 'close')}>Clore</button>}</div></article>)}{capabilities.followUps !== 'ready' && <ModuleState state={capabilities.followUps} name="les suivis"/>}</div>
        <div className={styles.panel}><div className={styles.sectionHeading}><div><span>CORO Report</span><h2>Rapports récents</h2></div><CapabilityBadge state={capabilities.reports}/></div>{reports.slice(0, 6).map((report) => <article className={styles.compact} key={report.id}><div className={styles.itemHeading}><strong>{report.title}</strong><span>{STATUS_LABELS[report.status] ?? report.status}</span></div><small>{report.reportNumber}</small></article>)}{capabilities.reports !== 'ready' && <ModuleState state={capabilities.reports} name="CORO Report"/>}<Link className={styles.textLink} href="/incident-reports">Ouvrir les rapports</Link></div></section>
      <form id="quick-entry" className={styles.quickEntry} onSubmit={createEntry}><div className={styles.sectionHeading}><div><span>Saisie rapide</span><h2>Ajouter à la main courante</h2></div></div><div className={styles.formGrid}><label>Catégorie<input name="category" required maxLength={80} placeholder="Accès, ronde, livraison…"/></label><label>Emplacement<input name="locationLabel" maxLength={240} placeholder="Hall principal"/></label><label>Priorité<select name="priority" defaultValue="NORMAL"><option value="LOW">Faible</option><option value="NORMAL">Normale</option><option value="HIGH">Élevée</option><option value="CRITICAL">Critique</option></select></label></div><label>Description<textarea name="description" required maxLength={10000} placeholder="Décrivez le fait observé et les actions prises."/></label><label className={styles.check}><input type="checkbox" name="followUpRequired"/>Un suivi est requis</label><button disabled={busy || capabilities.log !== 'ready'}>{busy ? 'Enregistrement…' : 'Consigner l’événement'}</button></form>
    </>}
    {!buildingId && <section className={styles.welcome}><h2>Commencez par votre bâtiment</h2><p>Le poste affiche uniquement les informations permises dans le périmètre sélectionné. Les capacités non activées ou non autorisées restent fermées.</p></section>}
  </main></AppLayout>;
}

function ModuleState({ state, name }: { state: CapabilityState; name: string }) {
  const text = state === 'unavailable' ? `${name} n’est pas activé dans cet environnement.` : state === 'denied' ? `Votre rôle ou votre affectation ne permet pas d’ouvrir ${name}.` : state === 'loading' ? 'Chargement…' : `Impossible de charger ${name}. Utilisez Actualiser pour reprendre.`;
  return <p className={styles.empty}>{text}</p>;
}
