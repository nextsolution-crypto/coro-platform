'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { useAuthStore } from '@/stores/auth.store';
import ResourceTimeline from './ResourceTimeline';
import MonthCalendar from './MonthCalendar';
import { eventForUser, eventLabel, eventStatus, planningErrorMessage } from './projection';
import PlanningDrawer from './PlanningDrawer';
import ActivityPlanningDrawer from './ActivityPlanningDrawer';
import type { PlannerEvent, PlannerResponse, PlanningAction, PlanningContext } from './types';
import { dateKey, formatClock, formatDay, moveDate, periodLabel, requestWindow, segmentForDay, validTimeZone, viewDays, type PlannerView } from './time';
import styles from './planning.module.css';

type Option = { id: string; name: string; clientId?: string };
const ZONES = ['America/Toronto', 'America/Halifax', 'America/Vancouver', 'America/Winnipeg', 'UTC'];

function ActionSummary({ summary, onFilter }: { summary: PlannerResponse['actionSummary']; onFilter: (type: string) => void }) {
  const counts = [
    ['Demandes client', summary.requestedBookings, 'BOOKING_REQUESTED'],
    ['LEAD à confirmer', summary.bookingsWithoutAcceptedLead, 'NO_ACCEPTED_LEAD'],
    ['Affectations en attente', summary.pendingAssignments, 'PENDING_ASSIGNMENT'],
    ['Conflits', summary.blockedConflicts, 'SCHEDULING_BLOCKED'],
    ['Disponibilités à vérifier', summary.unknownAvailability, 'SCHEDULING_UNKNOWN'],
    ['Activités à planifier', summary.unplannedActivities, 'UNPLANNED_ACTIVITY'],
  ] as const;
  return <section className={styles.summary} aria-label="Actions de planification">
    {counts.map(([label, count, type]) => <button key={label} type="button" onClick={() => onFilter(type)}
      className={`${styles.summaryCard} ${count > 0 ? styles.summaryCardActive : ''}`} aria-label={`${count} ${label}. Ouvrir la liste d’actions.`}>
      <strong>{count}</strong><span>{label}{count > 0 && <em>À traiter</em>}</span>
    </button>)}
  </section>;
}

export default function TeamPlannerPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState('');
  const [view, setView] = useState<PlannerView>('week');
  const [zone, setZone] = useState('America/Toronto');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [projectId, setProjectId] = useState('');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [needsAction, setNeedsAction] = useState(false);
  const [clients, setClients] = useState<Option[]>([]);
  const [buildings, setBuildings] = useState<Option[]>([]);
  const [data, setData] = useState<PlannerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<PlannerEvent | null>(null);
  const [actionType, setActionType] = useState('');
  const [actionPage, setActionPage] = useState(1);
  const [actionItems, setActionItems] = useState<PlanningAction[]>([]);
  const [actionTotal, setActionTotal] = useState(0);
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [periodActions, setPeriodActions] = useState<PlanningAction[]>([]);
  const [context, setContext] = useState<PlanningContext | null>(null);
  const [activityDrawer, setActivityDrawer] = useState<{ mode: 'CREATE' | 'PLAN_EXISTING'; action?: PlanningAction } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const requestedZone = params.get('tz') ?? 'America/Toronto';
    const initialZone = validTimeZone(requestedZone) ? requestedZone : 'America/Toronto';
    const requestedDate = params.get('date');
    queueMicrotask(() => {
      if (cancelled) return;
      setZone(initialZone);
      setDate(requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) &&
        Number.isFinite(new Date(`${requestedDate}T12:00:00Z`).getTime()) ? requestedDate : dateKey(new Date(), initialZone));
      const requestedView = params.get('view');
      setView(requestedView && ['day', 'week', 'workweek', 'month'].includes(requestedView)
        ? requestedView as PlannerView : !params.has('view') && window.innerWidth < 700 ? 'day' : 'workweek');
      setSearch(params.get('search') ?? '');
      setClientId(params.get('clientId') ?? '');
      setBuildingId(params.get('buildingId') ?? '');
      setBookingStatus(params.get('bookingStatus') ?? '');
      setProjectId(params.get('projectId') ?? '');
      setActivityTypeId(params.get('activityTypeId') ?? '');
      setNeedsAction(params.get('needsAction') === 'true');
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350); return () => clearTimeout(timer); }, [search]);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    params.set('date', date); params.set('view', view); params.set('tz', zone);
    if (search) params.set('search', search);
    if (clientId) params.set('clientId', clientId);
    if (buildingId) params.set('buildingId', buildingId);
    if (bookingStatus) params.set('bookingStatus', bookingStatus);
    if (projectId) params.set('projectId', projectId);
    if (activityTypeId) params.set('activityTypeId', activityTypeId);
    if (needsAction) params.set('needsAction', 'true');
    window.history.replaceState(null, '', `/planning?${params.toString()}`);
  }, [ready, date, view, zone, search, clientId, buildingId, bookingStatus, projectId, activityTypeId, needsAction]);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated && !sessionStorage.getItem('coro_token') && !localStorage.getItem('coro_token')) {
      router.replace('/login'); return;
    }
    Promise.allSettled([api.get('/clients'), api.get('/buildings')]).then(([clientResult, buildingResult]) => {
      if (clientResult.status === 'fulfilled' && Array.isArray(clientResult.value.data)) setClients(clientResult.value.data);
      if (buildingResult.status === 'fulfilled' && Array.isArray(buildingResult.value.data)) setBuildings(buildingResult.value.data);
    });
  }, [ready, isAuthenticated, router]);

  useEffect(() => {
    const authenticated = isAuthenticated || Boolean(sessionStorage.getItem('coro_token') || localStorage.getItem('coro_token'));
    if (!ready || !authenticated) return;
    let cancelled = false;
    api.get<PlanningContext>('/planning/context').then(response => { if (!cancelled) {
      setContext(response.data); setClients(response.data.clients); setBuildings(response.data.buildings);
    } });
    return () => { cancelled = true; };
  }, [ready, isAuthenticated, refreshKey]);

  const days = useMemo(() => date ? viewDays(date, view) : [], [date, view]);
  const requestRange = useMemo(() => days.length && validTimeZone(zone) ? requestWindow(days, zone) : null, [days, zone]);

  useEffect(() => {
    if (!ready || !requestRange || (!isAuthenticated && !sessionStorage.getItem('coro_token') && !localStorage.getItem('coro_token'))) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setLoading(true); setError(''); } });
    api.get<PlannerResponse>('/planning/team', { params: {
      start: requestRange.start, end: requestRange.end, displayTimeZone: zone,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(clientId ? { clientId } : {}), ...(buildingId ? { buildingId } : {}),
      ...(projectId ? { projectId } : {}), ...(activityTypeId ? { activityTypeId } : {}),
      ...(bookingStatus ? { bookingStatus } : {}), ...(needsAction ? { needsAction: 'true' } : {}),
    } }).then(response => { if (!cancelled) setData(response.data); }).catch(cause => {
      if (cancelled) return;
      setData(null);
      setError(planningErrorMessage(axios.isAxiosError(cause) ? cause.response?.status : undefined));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ready, requestRange, zone, debouncedSearch, clientId, buildingId, projectId, activityTypeId, bookingStatus, needsAction, isAuthenticated, refreshKey]);

  useEffect(() => {
    const authenticated = isAuthenticated || Boolean(sessionStorage.getItem('coro_token') || localStorage.getItem('coro_token'));
    if (!actionType || !requestRange || !authenticated) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setActionLoading(true); setActionError(''); } });
    api.get('/planning/actions', { params: { start: requestRange.start, end: requestRange.end,
      displayTimeZone: zone, type: actionType, page: actionPage, limit: 25,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(clientId ? { clientId } : {}), ...(buildingId ? { buildingId } : {}),
      ...(projectId ? { projectId } : {}), ...(activityTypeId ? { activityTypeId } : {}),
      ...(bookingStatus ? { bookingStatus } : {}),
    } }).then(response => {
      if (cancelled) return;
      setActionItems(response.data.items ?? []); setActionTotal(response.data.total ?? 0);
    }).catch(() => { if (!cancelled) { setActionItems([]); setActionError('Impossible de charger cette liste. Réduisez la période ou filtrez davantage.'); } })
      .finally(() => { if (!cancelled) setActionLoading(false); });
    return () => { cancelled = true; };
  }, [actionType, actionPage, requestRange, zone, debouncedSearch, clientId, buildingId, projectId, activityTypeId, bookingStatus, isAuthenticated, refreshKey]);

  useEffect(() => {
    const authenticated = isAuthenticated || Boolean(sessionStorage.getItem('coro_token') || localStorage.getItem('coro_token'));
    if (view !== 'month' || !requestRange || !authenticated) { setPeriodActions([]); return; }
    let cancelled = false;
    const load = async () => {
      const collected: PlanningAction[] = [];
      for (let page = 1; ; page++) {
        const response = await api.get('/planning/actions', { params: {
          start: requestRange.start, end: requestRange.end, displayTimeZone: zone, page, limit: 50,
          ...(debouncedSearch ? { search: debouncedSearch } : {}), ...(clientId ? { clientId } : {}),
          ...(buildingId ? { buildingId } : {}), ...(bookingStatus ? { bookingStatus } : {}),
          ...(projectId ? { projectId } : {}), ...(activityTypeId ? { activityTypeId } : {}),
        } });
        const items = (response.data.items ?? []) as PlanningAction[];
        collected.push(...items);
        if (collected.length >= (response.data.total ?? 0) || items.length === 0) break;
      }
      if (!cancelled) setPeriodActions(collected);
    };
    load().catch(() => { if (!cancelled) setPeriodActions([]); });
    return () => { cancelled = true; };
  }, [view, requestRange, zone, debouncedSearch, clientId, buildingId, projectId, activityTypeId, bookingStatus, isAuthenticated, refreshKey]);

  const move = (direction: -1 | 1) => setDate(previous => moveDate(previous, view, direction));
  const closeDrawer = useCallback(() => setSelected(null), []);
  const displayedZone = data?.displayTimeZone ?? zone;
  const mobileEvents = useMemo(() => data?.events.flatMap(event => event.userIds.length
    ? event.userIds.map(userId => ({ ...eventForUser(event, userId), userIds: [userId] }))
    : [event]) ?? [], [data]);
  const totalActions = data ? Object.values(data.actionSummary).reduce((sum, count) => sum + count, 0) : 0;
  const period = periodLabel(days, view);
  const today = dateKey(new Date(), displayedZone);

  return <AppLayout>
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>Planification interne</p><h1>Planification d’équipe</h1>
          <p>Bookings, horaires et disponibilité de l’équipe en un coup d’œil.</p></div>
        <div className={styles.headerMeta}>{context && <button className={styles.primaryButton} type="button" onClick={() => setActivityDrawer({ mode: 'CREATE' })}>Créer une activité</button>}
          <span>Fuseau d’affichage : <strong>{displayedZone}</strong></span>
          {data && <span>Mis à jour à {formatClock(data.asOf, displayedZone)}</span>}</div>
      </header>

      {data && <><ActionSummary summary={data.actionSummary} onFilter={type => { setActionType(type); setActionPage(1); }} />
        <p className={styles.summaryFoot}>{totalActions ? `${totalActions} signalements dans la période` : 'Aucune action dans la période'} · La charge sur 12 semaines ne représente pas la disponibilité d’un créneau.</p></>}
      {actionType && data && <section className={styles.actionList} aria-label="Liste des actions">
        <div className={styles.actionListHeader}><h2>Actions · {actionType.replaceAll('_', ' ').toLowerCase()}</h2>
          <button type="button" onClick={() => setActionType('')} aria-label="Fermer la liste d’actions">×</button></div>
        {actionLoading && <p role="status">Chargement des actions…</p>}
        {actionError && <p role="alert">{actionError}</p>}
        {!actionLoading && !actionError && (actionItems.length ? <ul>{actionItems.map(item =>
          <li key={item.id}><strong>{item.label}</strong>
            {item.startUtc && <span>{formatDay(dateKey(new Date(item.startUtc), displayedZone))} · {formatClock(item.startUtc, displayedZone)}</span>}
            {item.type === 'UNPLANNED_ACTIVITY' && <><span>{item.clientName} · {item.buildingName} · {item.projectName}</span>
              <button type="button" className={styles.inlineButton} onClick={() => setActivityDrawer({ mode: 'PLAN_EXISTING', action: item })}>Ouvrir</button></>}
            {item.bookingId && <Link href="/bookings">Ouvrir Booking</Link>}
          </li>)}</ul> : <p>Aucune action de ce type.</p>)}
        {actionTotal > 25 && <div className={styles.actionPager}>
          <button type="button" disabled={actionPage === 1} onClick={() => setActionPage(page => page - 1)}>Précédent</button>
          <span>Page {actionPage} · {actionTotal} actions</span>
          <button type="button" disabled={actionPage * 25 >= actionTotal} onClick={() => setActionPage(page => page + 1)}>Suivant</button>
        </div>}
      </section>}

      <section className={styles.toolbar} aria-label="Contrôles du planner">
        <div className={styles.periodControls}>
          <button type="button" onClick={() => move(-1)} aria-label="Période précédente">‹</button>
          <button type="button" onClick={() => setDate(dateKey(new Date(), zone))}>Aujourd’hui</button>
          <button type="button" onClick={() => move(1)} aria-label="Période suivante">›</button>
          <strong className={styles.periodLabel} aria-live="polite">{period}</strong>
          <label>Date <input type="date" value={date} onChange={change => setDate(change.target.value)} /></label>
          <label>Vue <select value={view} onChange={change => setView(change.target.value as PlannerView)}>
            <option value="day">Jour</option><option value="week">Semaine</option>
            <option value="workweek">Semaine ouvrée</option><option value="month">Mois</option></select></label>
        </div>
        <div className={styles.filters}>
          <label>Fuseau <select value={zone} onChange={change => setZone(change.target.value)}>
            {ZONES.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Conseiller <input type="search" value={search} onChange={change => setSearch(change.target.value)} placeholder="Rechercher" /></label>
          <label>Client <select value={clientId} onChange={change => { setClientId(change.target.value); setBuildingId(''); setProjectId(''); }}>
            <option value="">Tous</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
          <label>Bâtiment <select value={buildingId} onChange={change => { setBuildingId(change.target.value); setProjectId(''); }}>
            <option value="">Tous</option>{buildings.filter(building => !clientId || building.clientId === clientId).map(building => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label>
          <label>Mandat <select value={projectId} onChange={change => setProjectId(change.target.value)}>
            <option value="">Tous</option>{(context?.projects ?? []).filter(project => (!clientId || project.clientId === clientId) && (!buildingId || project.buildingId === buildingId)).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label>Type d’activité <select value={activityTypeId} onChange={change => setActivityTypeId(change.target.value)}>
            <option value="">Tous</option>{(context?.activityTypes ?? []).map(type => <option key={type.id} value={type.id}>{type.nameFR}</option>)}</select></label>
          <label>Booking <select value={bookingStatus} onChange={change => setBookingStatus(change.target.value)}>
            <option value="">Tous les statuts actifs</option><option value="DEMANDEE">Demandée</option>
            <option value="CONFIRMEE">Confirmée</option><option value="REPORTEE">Reportée</option>
            <option value="REASSIGNEE">Réassignée</option></select></label>
          <label className={styles.checkbox}><input type="checkbox" checked={needsAction}
            onChange={change => setNeedsAction(change.target.checked)} />Nécessite une action</label>
        </div>
      </section>

      {loading && <p className={styles.notice} role="status">Chargement de la planification…</p>}
      {error && <div className={styles.error} role="alert">{error}</div>}
      {data && !error && <section className={styles.gridSection} aria-label="Calendrier d'équipe" aria-busy={loading}>
        {data.warnings.length > 0 && <div className={styles.notice} role="status">{data.warnings.join(' · ')}</div>}
        {view === 'month' ? <MonthCalendar monthDays={days} events={data.events} actions={periodActions}
          timeZone={displayedZone} today={today} onDay={day => { setDate(day); setView('day'); }} onSelect={setSelected} /> : <>
        <div className={styles.desktopTimeline}><ResourceTimeline data={data} days={days} onSelect={setSelected} /></div>
        <div className={styles.mobileAgenda}>
          <h2>{view === 'day' ? 'Journée' : 'Agenda de la semaine'}</h2>
          {days.map(day => <section key={day}><h3>{formatDay(day)}</h3>
            {mobileEvents.filter(event => segmentForDay(event, day, displayedZone, { start: 0, end: 1440 })).length ?
              mobileEvents.filter(event => segmentForDay(event, day, displayedZone, { start: 0, end: 1440 }))
                .map(event => <button type="button" key={`${event.id}:${event.userIds.join(',')}`} onClick={() => setSelected(event)} className={styles.agendaCard}>
                  <strong>{formatClock(event.startUtc, displayedZone)} · {eventLabel(event)}</strong>
                  <span>{eventStatus(event)} · {event.userIds.length ? event.userIds.map(id => data.users.find(person => person.id === id)?.name ?? 'Conseiller').join(', ') : 'À affecter'}</span>
                  {(event.needsAction || event.warnings.length > 0) && <span>⚠ {event.needsAction ? 'Action requise' : 'À vérifier'}</span>}
                </button>) : <p>Aucun événement ce jour.</p>}
          </section>)}
          <h3>Conseillers</h3><ul>{data.users.map(person => <li key={person.id}>{person.name}{person.workScheduleConfigured === false ? ' · Horaire non configuré' : ''}</li>)}</ul>
        </div></>}
      </section>}
      {!data && !loading && !error && <p className={styles.empty}>Aucune projection disponible.</p>}
    </div>
    <PlanningDrawer event={selected} users={data?.users ?? []} displayTimeZone={displayedZone} onClose={closeDrawer} />
    {activityDrawer && context && <ActivityPlanningDrawer mode={activityDrawer.mode} action={activityDrawer.action}
      context={context} onClose={() => setActivityDrawer(null)} onCreated={() => setRefreshKey(key => key + 1)} />}
  </AppLayout>;
}
