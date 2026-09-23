'use client';

import { useState } from 'react';

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
  timeZone, canManage, onOpen, onClose, onPage, onAction, onRemove }: {
  summary: PlannerResponse['actionSummary']; activeType: string; items: PlanningAction[]; total: number; page: number;
  loading: boolean; error: string; timeZone: string; canManage: boolean;
  onOpen: (type: string) => void; onClose: () => void; onPage: (page: number) => void;
  onAction: (item: PlanningAction, mode: PlanningDrawerMode | 'PLAN_EXISTING') => void;
  onRemove: (item: PlanningAction) => Promise<void>;
}) {
  const [pendingRemoval, setPendingRemoval] = useState<PlanningAction | null>(null);
  const [removing, setRemoving] = useState(false);
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
      {!loading && !error && (items.length ? <ul>{items.map(item => <li key={item.id} className={item.type === 'UNPLANNED_ACTIVITY' ? styles.backlogCard : undefined}>
        <div className={styles.actionContent}><div className={styles.actionTitle}><strong>{item.label}</strong>
          {item.type === 'UNPLANNED_ACTIVITY' && <em>{item.hasBookingHistory ? 'À replanifier' : 'À planifier'}</em>}</div>
          {item.activityTypeName && item.activityTypeName !== item.label && <span>{item.activityTypeName}</span>}
          <span>{[item.clientName, item.buildingName].filter(Boolean).join(' · ')}</span>
          {item.projectName && <span>{item.projectName}</span>}
          {item.userName && <span>Conseiller : {item.userName}</span>}
          {(item.lastEffectiveStartUtc || item.lastLead) && <div className={styles.actionHistory}>
            {item.lastEffectiveStartUtc && <span><small>Dernier créneau</small>{formatDay(dateKey(new Date(item.lastEffectiveStartUtc), timeZone))} · {formatClock(item.lastEffectiveStartUtc, timeZone)}</span>}
            {item.lastLead && <span><small>Dernier LEAD</small>{item.lastLead.displayName}</span>}
          </div>}
          {item.startUtc && item.type !== 'UNPLANNED_ACTIVITY' && <span>{formatDay(dateKey(new Date(item.startUtc), timeZone))} · {formatClock(item.startUtc, timeZone)}</span>}
        </div><div className={styles.actionButtons}>
          {item.type === 'UNPLANNED_ACTIVITY' ? canManage ? <button type="button" className={styles.primaryButton}
            onClick={() => onAction(item, 'PLAN_EXISTING')}>{item.hasBookingHistory ? 'Replanifier' : 'Planifier'}</button> : <span>Consultation seulement</span> : <>
            <button type="button" className={styles.inlineButton} onClick={() => onAction(item, 'VIEW')}>Voir</button>
            {canManage && ['NO_ACCEPTED_LEAD', 'PENDING_ASSIGNMENT', 'SCHEDULING_BLOCKED', 'SCHEDULING_UNKNOWN'].includes(item.type) &&
              <button type="button" className={styles.inlineButton} onClick={() => onAction(item, 'REASSIGN')}>Réaffecter</button>}
            {canManage && item.type === 'SCHEDULING_BLOCKED' && <button type="button" className={styles.inlineButton}
              onClick={() => onAction(item, 'RESCHEDULE')}>Reporter</button>}
          </>}
          {item.type === 'UNPLANNED_ACTIVITY' && canManage && <button type="button" className={styles.inlineButton}
            onClick={() => setPendingRemoval(item)}>{item.removalAction === 'DELETE' ? 'Supprimer' : 'Ne plus planifier'}</button>}
        </div>
      </li>)}</ul> : <p className={styles.compactEmpty}>{activeType === 'UNPLANNED_ACTIVITY' ? '✓ Toutes les activités sont planifiées ou traitées.' : emptyLabels[activeType] ?? 'Aucune action de ce type.'}</p>)}
      {pendingRemoval && <section className={styles.confirmPanel} role="alertdialog" aria-label="Confirmer le retrait de l’activité">
        <h3>{pendingRemoval.removalAction === 'DELETE' ? 'Supprimer cette activité ?' : 'Ne plus planifier cette activité ?'}</h3>
        <p>{pendingRemoval.removalAction === 'DELETE'
          ? 'Cette activité n’a jamais été planifiée. Elle sera supprimée définitivement.'
          : 'Cette activité ne sera plus à planifier. Son historique de planification sera conservé.'}</p>
        <div className={styles.formActions}><button type="button" disabled={removing} onClick={() => setPendingRemoval(null)}>Retour</button>
          <button type="button" className={styles.dangerButton} disabled={removing} onClick={async () => {
            setRemoving(true); try { await onRemove(pendingRemoval); setPendingRemoval(null); } finally { setRemoving(false); }
          }}>{removing ? 'Traitement…' : pendingRemoval.removalAction === 'DELETE' ? 'Supprimer définitivement' : 'Ne plus planifier'}</button></div>
      </section>}
      {total > 25 && <div className={styles.actionPager}>
        <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>Précédent</button>
        <span>Page {page} · {total} actions</span>
        <button type="button" disabled={page * 25 >= total} onClick={() => onPage(page + 1)}>Suivant</button>
      </div>}
    </div>}
  </section>;
}
