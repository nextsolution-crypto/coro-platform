'use client';

import type { PlannerResponse, PlanningAction } from './types';
import type { PlanningDrawerMode } from './PlanningDrawer';
import { dateKey, formatClock, formatDay } from './time';
import styles from './planning.module.css';

const categories = [
  ['Demandes client', 'requestedBookings', 'BOOKING_REQUESTED'],
  ['LEAD à confirmer', 'bookingsWithoutAcceptedLead', 'NO_ACCEPTED_LEAD'],
  ['Affectations en attente', 'pendingAssignments', 'PENDING_ASSIGNMENT'],
  ['Conflits', 'blockedConflicts', 'SCHEDULING_BLOCKED'],
  ['Disponibilités à vérifier', 'unknownAvailability', 'SCHEDULING_UNKNOWN'],
  ['Activités à planifier', 'unplannedActivities', 'UNPLANNED_ACTIVITY'],
] as const;

const emptyLabels: Record<string, string> = {
  BOOKING_REQUESTED: 'Aucune demande client.', NO_ACCEPTED_LEAD: 'Aucun LEAD à confirmer.',
  PENDING_ASSIGNMENT: 'Aucune affectation en attente.', SCHEDULING_BLOCKED: 'Aucun conflit.',
  SCHEDULING_UNKNOWN: 'Aucune disponibilité à vérifier.', UNPLANNED_ACTIVITY: 'Aucune activité à planifier.',
};

export default function PlanningActionCenter({ summary, activeType, items, total, page, loading, error,
  timeZone, canManage, onOpen, onClose, onPage, onAction }: {
  summary: PlannerResponse['actionSummary']; activeType: string; items: PlanningAction[]; total: number; page: number;
  loading: boolean; error: string; timeZone: string; canManage: boolean;
  onOpen: (type: string) => void; onClose: () => void; onPage: (page: number) => void;
  onAction: (item: PlanningAction, mode: PlanningDrawerMode | 'PLAN_EXISTING') => void;
}) {
  const totalActions = Object.values(summary).reduce((sum, count) => sum + count, 0);
  return <section className={styles.actionCenter} aria-label="Centre d’actions">
    <div className={styles.summary}>{categories.map(([label, key, type]) => {
      const count = summary[key];
      return <button key={type} type="button" onClick={() => onOpen(type)}
        className={`${styles.summaryCard} ${count ? styles.summaryCardActive : ''} ${activeType === type ? styles.summaryCardSelected : ''}`}
        aria-expanded={activeType === type} aria-controls="planning-action-panel">
        <strong>{count}</strong><span>{label}{count > 0 && <em>À traiter</em>}</span>
      </button>;
    })}</div>
    <p className={styles.summaryFoot}>{totalActions ? `${totalActions} actions dans la période` : 'Aucune action requise pour cette période.'} · La charge sur 12 semaines reste informative.</p>
    {activeType && <div id="planning-action-panel" className={styles.actionList}>
      <div className={styles.actionListHeader}><h2>{categories.find(row => row[2] === activeType)?.[0] ?? 'Actions'}</h2>
        <button type="button" onClick={onClose} aria-label="Fermer le centre d’actions">×</button></div>
      {loading && <p role="status">Chargement des actions…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!loading && !error && (items.length ? <ul>{items.map(item => <li key={item.id}>
        <div><strong>{item.label}</strong>
          <span>{[item.clientName, item.buildingName, item.projectName].filter(Boolean).join(' · ')}</span>
          {item.userName && <span>Conseiller : {item.userName}</span>}
          {item.startUtc && <span>{formatDay(dateKey(new Date(item.startUtc), timeZone))} · {formatClock(item.startUtc, timeZone)}</span>}
        </div><div className={styles.actionButtons}>
          {item.type === 'UNPLANNED_ACTIVITY' ? canManage ? <button type="button" className={styles.primaryButton}
            onClick={() => onAction(item, 'PLAN_EXISTING')}>Planifier</button> : <span>Consultation seulement</span> : <>
            <button type="button" className={styles.inlineButton} onClick={() => onAction(item, 'VIEW')}>Voir</button>
            {canManage && ['NO_ACCEPTED_LEAD', 'PENDING_ASSIGNMENT', 'SCHEDULING_BLOCKED', 'SCHEDULING_UNKNOWN'].includes(item.type) &&
              <button type="button" className={styles.inlineButton} onClick={() => onAction(item, 'REASSIGN')}>Réaffecter</button>}
            {canManage && item.type === 'SCHEDULING_BLOCKED' && <button type="button" className={styles.inlineButton}
              onClick={() => onAction(item, 'RESCHEDULE')}>Reporter</button>}
          </>}
        </div>
      </li>)}</ul> : <p>{emptyLabels[activeType] ?? 'Aucune action de ce type.'}</p>)}
      {total > 25 && <div className={styles.actionPager}>
        <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>Précédent</button>
        <span>Page {page} · {total} actions</span>
        <button type="button" disabled={page * 25 >= total} onClick={() => onPage(page + 1)}>Suivant</button>
      </div>}
    </div>}
  </section>;
}
