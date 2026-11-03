'use client';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, CheckSquare, Clock, FileText, RefreshCw, Search } from 'lucide-react';
import PortalLayout from '../../../components/PortalLayout';
import { apiGet, getUser } from '../../../store/auth';
import { createInitialHistoryState, getHistoryError, parseIncidentHistory, reduceHistoryState } from './incidentHistoryState';

const INCIDENT_LABELS: Record<string, string> = {
  SMOKE_DISCOVERY: 'Découverte de fumée', FIRE_ALERT: 'Alerte incendie', FIRE_ALARM: 'Alarme incendie',
  GAS_LEAK: 'Fuite de gaz', ACTIVE_THREAT: 'Menace active', MEDICAL: 'Urgence médicale',
  TOXIC_GAS: 'Gaz toxique', SUSPICIOUS_PACKAGE: 'Colis suspect', POWER_OUTAGE: 'Coupure de courant',
  HAZMAT: 'Matières dangereuses', BOMB_THREAT: 'Alerte à la bombe', LITHIUM_BATTERY: 'Batterie lithium',
  FLOODING: 'Inondations', VIOLENT_WINDS: 'Vents violents', OTHER: 'Autre',
};
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PRE_ALERT: { label: 'Préalerte', color: '#8E44AD', bg: '#F4ECF7' },
  ACTIVE: { label: 'Actif', color: '#C0392B', bg: '#FDEDEC' },
  CONTAINED: { label: 'Contenu', color: '#B35C00', bg: '#FEF5E7' },
  RESOLVED: { label: 'Résolu', color: '#1E8449', bg: '#EAFAF1' },
  CANCELLED: { label: 'Annulé', color: '#566573', bg: '#F2F3F4' },
};
const PAGE_SIZE = 25;

type StatusFilter = 'ALL' | 'OPEN' | 'PRE_ALERT' | 'ACTIVE' | 'CONTAINED' | 'RESOLVED' | 'CANCELLED';
type ExerciseFilter = 'ALL' | 'REAL' | 'EXERCISE';
type SortValue = 'triggeredAt-desc' | 'triggeredAt-asc' | 'status-asc' | 'type-asc';

function getDuration(start: string, end?: string | null): string {
  const minutes = Math.max(0, Math.floor(((end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()) / 60000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

export default function IncidentHistoryPage() {
  const router = useRouter();
  const buildingId = useParams().buildingId as string;
  const [history, dispatch] = useReducer(reduceHistoryState, undefined, () => createInitialHistoryState());
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [exercise, setExercise] = useState<ExerciseFilter>('ALL');
  const [sort, setSort] = useState<SortValue>('triggeredAt-desc');
  const [page, setPage] = useState(1);
  const requestIdRef = useRef(0);
  const scopeRef = useRef(buildingId);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    if (scopeRef.current === buildingId) return;
    scopeRef.current = buildingId;
    setSearchDraft(''); setSearch(''); setStatus('ALL'); setExercise('ALL'); setSort('triggeredAt-desc'); setPage(1);
  }, [buildingId]);

  const loadHistory = useCallback(async (preserveData: boolean) => {
    const requestId = ++requestIdRef.current;
    dispatch({ type: 'start', requestId, preserveData });
    const [sortBy, sortOrder] = sort.split('-');
    const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), status, exercise, sortBy, sortOrder });
    if (search) query.set('search', search);
    try {
      const data = await apiGet(`/client-portal/incidents/buildings/${buildingId}/history?${query}`);
      if (requestId !== requestIdRef.current) return;
      dispatch({ type: 'success', requestId, result: parseIncidentHistory(data) });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      dispatch({ type: 'failure', requestId, error: getHistoryError(error) });
    }
  }, [buildingId, exercise, page, search, sort, status]);

  useEffect(() => {
    if (!getUser()) { router.replace('/login'); return; }
    void loadHistory(history.result !== null);
    return () => { requestIdRef.current += 1; };
    // The request inputs intentionally define every reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadHistory, router]);

  const result = history.result;
  const incidents = result?.items ?? [];
  const pagination = result?.pagination;
  const isInitialLoading = history.phase === 'loading' && result === null;
  const isRefreshing = history.phase === 'loading' && result !== null;
  const hasBlockingError = history.phase === 'error' && result === null;
  const resetFilters = () => { setSearchDraft(''); setSearch(''); setStatus('ALL'); setExercise('ALL'); setPage(1); };

  if (isInitialLoading) return <PortalLayout><div role="status" aria-live="polite" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><p style={{ color: '#6C757D' }}>Chargement de l’historique des incidents…</p></div></PortalLayout>;

  return (
    <PortalLayout>
      <header style={{ marginBottom: 20 }}>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}`)} style={{ minHeight: 44, padding: '8px 4px', background: 'none', border: 0, cursor: 'pointer', color: '#6C757D' }}>← Retour au registre</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div><p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase' }}>CORO Sentinelle</p><h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 26px)', color: '#2C3E50', display: 'flex', gap: 8, alignItems: 'center' }}><FileText size={22} /> Historique des incidents</h1></div>
          <button type="button" onClick={() => void loadHistory(true)} disabled={history.phase === 'loading'} aria-label="Actualiser l’historique des incidents" style={{ minWidth: 44, minHeight: 44, padding: '8px 14px', borderRadius: 8, border: '1px solid #D5D8DC', background: '#FFF', color: '#566573', cursor: isRefreshing ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><RefreshCw size={16} aria-hidden="true" />{isRefreshing ? 'Actualisation…' : 'Actualiser'}</button>
        </div>
      </header>

      {hasBlockingError && history.error && <ErrorPanel error={history.error.message} retry={history.error.kind !== 'session' ? () => void loadHistory(false) : undefined} />}
      {history.phase === 'error' && history.stale && history.error && <section role="alert" aria-live="polite" style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, border: '1px solid #F8C471', background: '#FEF9E7', color: '#7D5109', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}><span><strong>Actualisation échouée.</strong> Les résultats affichés peuvent être anciens.</span><button type="button" onClick={() => void loadHistory(true)} style={{ minHeight: 44, padding: '8px 14px', borderRadius: 8, border: '1px solid #7D5109', background: '#FFF', color: '#7D5109', cursor: 'pointer', fontWeight: 700 }}>Réessayer</button></section>}

      {!hasBlockingError && result && <>
        <section aria-label="Recherche et filtres" style={{ marginBottom: 16, padding: 16, border: '1px solid #E9ECEF', borderRadius: 10, background: '#FFF', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 12 }}>
          <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700, color: '#566573' }}>Recherche type ou procédure<div style={{ position: 'relative' }}><Search size={16} aria-hidden="true" style={{ position: 'absolute', left: 12, top: 14, color: '#7F8C8D' }} /><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} maxLength={80} placeholder="Ex. incendie ou P003" style={{ width: '100%', minHeight: 44, boxSizing: 'border-box', padding: '8px 12px 8px 36px', border: '1px solid #BFC9CA', borderRadius: 8 }} /></div></label>
          <Select label="Statut" value={status} onChange={(value) => { setStatus(value as StatusFilter); setPage(1); }} options={[['ALL', `Tous (${result.counts.all})`], ['OPEN', `Ouverts (${result.counts.open})`], ['PRE_ALERT', 'Préalertes'], ['ACTIVE', 'Actifs'], ['CONTAINED', 'Contenus'], ['RESOLVED', 'Résolus'], ['CANCELLED', 'Annulés']]} />
          <Select label="Nature" value={exercise} onChange={(value) => { setExercise(value as ExerciseFilter); setPage(1); }} options={[['ALL', 'Incidents et exercices'], ['REAL', `Incidents réels (${result.counts.real})`], ['EXERCISE', `Exercices (${result.counts.exercises})`]]} />
          <Select label="Trier par" value={sort} onChange={(value) => { setSort(value as SortValue); setPage(1); }} options={[['triggeredAt-desc', 'Plus récents'], ['triggeredAt-asc', 'Plus anciens'], ['status-asc', 'Statut'], ['type-asc', 'Type']]} />
        </section>

        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 8, background: '#EBF5FB', border: '1px solid #AED6F1', fontSize: 12, color: '#2471A3' }}>📋 <strong>Conservation réglementaire :</strong> Incidents conservés 36 mois (ISO 22301) · Incidents avec blessés : 5 ans (CNESST) · Exercices : 24 mois (CNPI 2020)</div>

        {result.counts.all === 0 ? <EmptyState text="Aucun incident enregistré pour ce bâtiment." /> : pagination?.total === 0 ? <EmptyState text="Aucun incident ne correspond aux critères." action={resetFilters} /> : <section style={{ background: '#FFF', borderRadius: 10, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E9ECEF', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><h2 style={{ margin: 0, fontSize: 14, color: '#2C3E50' }}>{pagination?.total} résultat{pagination?.total === 1 ? '' : 's'}</h2><span style={{ fontSize: 12, color: '#6C757D' }}>Page {pagination?.page} sur {Math.max(1, pagination?.totalPages ?? 1)}</span></div>
          {incidents.map((incident, index) => {
            const statusConfig = STATUS_CONFIG[incident.status] ?? { label: `Statut inconnu (${incident.status})`, color: '#566573', bg: '#F2F3F4' };
            const percentage = incident.coordinatorStepsTotal ? Math.round((incident.coordinatorStepsCompleted / incident.coordinatorStepsTotal) * 100) : null;
            return <div key={incident.id} role="link" tabIndex={0} aria-label={`Ouvrir ${incident.isExercise ? 'l’exercice' : 'l’incident'} ${INCIDENT_LABELS[incident.type] || incident.type}`} onClick={() => router.push(`/sentinelle/${buildingId}/incidents/${incident.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); router.push(`/sentinelle/${buildingId}/incidents/${incident.id}`); } }} style={{ minHeight: 44, padding: '16px 20px', borderBottom: index < incidents.length - 1 ? '1px solid #F1F3F5' : 0, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', cursor: 'pointer' }}>
              <div style={{ width: 58, flexShrink: 0, textAlign: 'center' }}><strong style={{ display: 'block', fontSize: 18, color: '#2C3E50' }}>{new Date(incident.triggeredAt).getDate()}</strong><span style={{ fontSize: 10, color: '#7F8C8D', textTransform: 'uppercase' }}>{new Date(incident.triggeredAt).toLocaleDateString('fr-CA', { month: 'short', year: 'numeric' })}</span></div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 5 }}><strong style={{ color: '#2C3E50' }}>{INCIDENT_LABELS[incident.type] || incident.type}</strong><Badge label={statusConfig.label} color={statusConfig.color} background={statusConfig.bg} /><Badge label={incident.isExercise ? 'Exercice' : 'Incident réel'} color={incident.isExercise ? '#9C640C' : '#1F618D'} background={incident.isExercise ? '#FEF9E7' : '#EBF5FB'} />{incident.hasRex && <Badge label="REX ✓" color="#1E8449" background="#EAFAF1" />}</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, color: '#6C757D', fontSize: 12 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{new Date(incident.triggeredAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}{incident.resolvedAt ? ` — durée : ${getDuration(incident.triggeredAt, incident.resolvedAt)}` : ''}</span>{incident.procedureCode && <span>Procédure {incident.procedureCode}</span>}{percentage !== null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckSquare size={12} />{incident.coordinatorStepsCompleted}/{incident.coordinatorStepsTotal} étapes ({percentage}%)</span>}</div></div><span aria-hidden="true" style={{ color: '#7F8C8D', fontSize: 20 }}>→</span>
            </div>;
          })}
          <nav aria-label="Pagination des incidents" style={{ padding: 16, borderTop: '1px solid #E9ECEF', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><button type="button" disabled={page <= 1 || isRefreshing} onClick={() => setPage((value) => Math.max(1, value - 1))} style={pageButtonStyle}>Page précédente</button><span style={{ color: '#566573', fontSize: 13 }}>{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, pagination?.total ?? 0)} sur {pagination?.total}</span><button type="button" disabled={!pagination || page >= pagination.totalPages || isRefreshing} onClick={() => setPage((value) => value + 1)} style={pageButtonStyle}>Page suivante</button></nav>
        </section>}
      </>}
    </PortalLayout>
  );
}

const pageButtonStyle = { minHeight: 44, padding: '8px 14px', borderRadius: 8, border: '1px solid #BFC9CA', background: '#FFF', color: '#2C3E50', cursor: 'pointer' } as const;
function Badge({ label, color, background }: { label: string; color: string; background: string }) { return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, color, backgroundColor: background }}>{label}</span>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700, color: '#566573' }}>{label}<select value={value} onChange={(event) => onChange(event.target.value)} style={{ minHeight: 44, padding: '8px 10px', border: '1px solid #BFC9CA', borderRadius: 8, background: '#FFF' }}>{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>; }
function EmptyState({ text, action }: { text: string; action?: () => void }) { return <div style={{ padding: 48, textAlign: 'center', background: '#FFF', borderRadius: 10, border: '1px solid #E9ECEF' }}><AlertTriangle size={36} color="#BFC9CA" style={{ margin: '0 auto 16px' }} /><p style={{ margin: 0, color: '#566573' }}>{text}</p>{action && <button type="button" onClick={action} style={{ ...pageButtonStyle, marginTop: 14, fontWeight: 700 }}>Réinitialiser les critères</button>}</div>; }
function ErrorPanel({ error, retry }: { error: string; retry?: () => void }) { return <section role="alert" aria-live="assertive" style={{ marginBottom: 16, padding: 24, borderRadius: 10, border: '1px solid #F5B7B1', background: '#FDEDEC', color: '#922B21' }}><div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}><AlertTriangle size={22} aria-hidden="true" /><div><strong>{error}</strong><p style={{ margin: '6px 0 0' }}>Vérifiez votre connexion, puis essayez de nouveau.</p>{retry && <button type="button" onClick={retry} style={{ ...pageButtonStyle, marginTop: 14, color: '#922B21', borderColor: '#922B21', fontWeight: 700 }}>Réessayer</button>}</div></div></section>; }
