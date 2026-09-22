'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { PlannerEvent, PlannerUser } from './types';
import { eventLabel, eventStatus } from './projection';
import styles from './planning.module.css';

function instant(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('fr-CA', { timeZone, weekday: 'long', day: 'numeric', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function PlanningDrawer({ event, users, displayTimeZone, onClose }: {
  event: PlannerEvent | null; users: PlannerUser[]; displayTimeZone: string; onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!event) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (key: KeyboardEvent) => {
      if (key.key === 'Escape') { onClose(); return; }
      if (key.key !== 'Tab') return;
      const focusable = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] button, [role="dialog"] a[href]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (key.shiftKey && document.activeElement === first) { key.preventDefault(); last.focus(); }
      else if (!key.shiftKey && document.activeElement === last) { key.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [event, onClose]);
  if (!event) return null;
  const names = new Map(users.map(user => [user.id, user.name]));
  return <div className={styles.drawerBackdrop} onMouseDown={mouse => { if (mouse.target === mouse.currentTarget) onClose(); }}>
    <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="planner-drawer-title">
      <div className={styles.drawerHeader}>
        <div><small>Détail de planification</small><h2 id="planner-drawer-title">{eventLabel(event)}</h2></div>
        <button ref={closeRef} type="button" className={styles.closeButton} aria-label="Fermer le détail" onClick={onClose}>×</button>
      </div>
      <dl className={styles.details}>
        <dt>Statut</dt><dd>{eventStatus(event)}</dd>
        <dt>Conseiller</dt><dd>{event.userIds.map(id => names.get(id) ?? 'Conseiller').join(', ')}</dd>
        <dt>Début</dt><dd>{instant(event.startUtc, displayTimeZone)}</dd>
        <dt>Fin</dt><dd>{instant(event.endUtc, displayTimeZone)}</dd>
        <dt>Fuseau d’affichage</dt><dd>{displayTimeZone}</dd>
        <dt>Fuseau source</dt><dd>{event.sourceTimeZone}</dd>
        {event.projectName && <><dt>Projet</dt><dd>{event.projectName}</dd></>}
        {event.clientName && <><dt>Client</dt><dd>{event.clientName}</dd></>}
        {event.buildingName && <><dt>Bâtiment</dt><dd>{event.buildingName}</dd></>}
        {event.ownerName && <><dt>Responsable du dossier</dt><dd>{event.ownerName}</dd></>}
        {event.source === 'BOOKING' && event.bookingStatus && <><dt>Booking</dt><dd>{event.bookingStatus}</dd></>}
        {event.source === 'LEGACY_ACTIVITY' && <><dt>Source</dt><dd>Activité non gérée par Booking</dd></>}
      </dl>
      {event.source === 'BOOKING' && event.assignments?.length ? <section className={styles.drawerSection}>
        <h3>Équipe affectée</h3>
        <ul>{event.assignments.map(assignment => <li key={`${assignment.userId}-${assignment.role}`}>
          {assignment.role} · {names.get(assignment.userId) ?? 'Conseiller'} · {assignment.status === 'PENDING' ? 'En attente' : 'Accepté'}
        </li>)}</ul>
      </section> : null}
      {event.warnings.length > 0 && <section className={styles.drawerSection}>
        <h3>À vérifier</h3><ul>{event.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
      </section>}
      {event.needsAction && <p className={styles.actionNotice}>Une action est requise pour cet événement.</p>}
      {event.source !== 'USER_UNAVAILABILITY' && <div className={styles.drawerLinks}>
        {event.bookingId && <Link href="/bookings">Résoudre dans Booking</Link>}
        {event.projectId && <Link href={`/projects/${event.projectId}`}>Ouvrir le projet</Link>}
        {event.activityId && event.projectId && <Link href={`/projects/${event.projectId}/activities`}>Ouvrir l’activité</Link>}
        {event.clientId && <Link href={`/clients/${event.clientId}`}>Ouvrir le client</Link>}
        {event.buildingId && <Link href={`/buildings/${event.buildingId}`}>Ouvrir le bâtiment</Link>}
      </div>}
    </aside>
  </div>;
}
