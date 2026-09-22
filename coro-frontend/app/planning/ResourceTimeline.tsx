'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PlannerEvent, PlannerResponse, PlannerUser } from './types';
import { dateKey, formatClock, formatDay, nowMarker, segmentForDay, timelineDayMinWidth, visibleHours } from './time';
import { eventForUser, eventLabel, eventStatus } from './projection';
import { getActivityTypeVisual } from './activityTypeVisual';
import styles from './planning.module.css';

function AdvisorLabel({ user }: { user: PlannerUser }) {
  return <div className={styles.advisor}>
    <strong>{user.name}</strong>
    {user.title && <span>{user.title}</span>}
    {user.capacity && <small>Charge engagée {user.capacity.tauxUtilisationConfirmee} % · 12 sem.</small>}
    {user.availability === 'GENERIC' && <small>Disponibilité générale</small>}
    {user.workScheduleConfigured === false && <small>Horaire non configuré</small>}
  </div>;
}

export default function ResourceTimeline({ data, days, onSelect }: {
  data: PlannerResponse; days: string[]; onSelect: (event: PlannerEvent) => void;
}) {
  const timeZone = data.displayTimeZone;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  const today = dateKey(now, timeZone);
  const rows: PlannerUser[] = data.events.some(event => event.userIds.length === 0)
    ? [...data.users, { id: '__unassigned', name: 'À affecter', title: 'Sans conseiller' }] : data.users;
  const hours = useMemo(() => visibleHours(days, timeZone, [...data.events, ...data.workIntervals]),
    [days, timeZone, data.events, data.workIntervals]);
  const ticks = useMemo(() => Array.from({ length: (hours.end - hours.start) / 30 + 1 },
    (_, index) => hours.start + index * 30), [hours]);
  const current = nowMarker(now, days, timeZone, hours);
  const eventsByUser = useMemo(() => {
    const map = new Map<string, PlannerEvent[]>();
    for (const event of data.events) for (const userId of event.userIds.length ? event.userIds : ['__unassigned']) {
      const row = map.get(userId) ?? [];
      row.push(eventForUser(event, userId));
      map.set(userId, row);
    }
    return map;
  }, [data.events]);
  const workByUser = useMemo(() => {
    const map = new Map<string, PlannerResponse['workIntervals']>();
    for (const interval of data.workIntervals) {
      const row = map.get(interval.userId) ?? [];
      row.push(interval);
      map.set(interval.userId, row);
    }
    return map;
  }, [data.workIntervals]);

  if (!rows.length) return <p className={styles.empty}>Aucun conseiller pour ces filtres.</p>;
  return <div className={styles.timelineScroll} role="region" aria-label="Planification de l'équipe" tabIndex={0}>
    <div className={styles.timeline} style={{ gridTemplateColumns: `205px repeat(${days.length}, minmax(${timelineDayMinWidth(days.length)}px, 1fr))` }}>
      <div className={`${styles.corner} ${styles.stickyLeft}`}>
        <strong>Conseillers</strong>
        <small>{String(hours.start / 60).padStart(2, '0')}:00–{String(hours.end / 60).padStart(2, '0')}:00</small>
      </div>
      {days.map((day, index) => <div className={`${styles.dayHeader} ${day === today ? styles.todayHeader : ''} ${index % 7 >= 5 && days.length === 7 ? styles.weekend : ''}`} key={day}>
        <strong>{formatDay(day)}{day === today ? ' · Aujourd’hui' : ''}</strong>
        <div className={styles.tickLabels}>{ticks.map((tick, index) =>
          <span key={tick} style={{ left: `${index / (ticks.length - 1) * 100}%` }}>
            {tick % 60 === 0 ? `${String(Math.floor(tick / 60)).padStart(2, '0')}h` : '·'}
          </span>)}</div>
        {current?.day === day && <span className={styles.nowBadge} style={{ left: `${current.position}%` }}>Maintenant</span>}
      </div>)}
      {current && <div className={styles.nowColumn} style={{ gridColumn: current.dayIndex + 2, gridRow: '2 / -1' }} aria-hidden="true">
        <span style={{ left: `${current.position}%` }} />
      </div>}
      {rows.map(user => <div className={styles.resourceRow} key={user.id}>
        <div className={`${styles.stickyLeft} ${styles.advisorCell}`}><AdvisorLabel user={user} /></div>
        {days.map(day => {
          const work = (workByUser.get(user.id) ?? []).map(interval => ({ interval,
            segment: segmentForDay(interval, day, timeZone, hours) })).filter(item => item.segment);
          const events = (eventsByUser.get(user.id) ?? []).map(event => ({ event,
            segment: segmentForDay(event, day, timeZone, hours) })).filter(item => item.segment);
          const weekend = days.length === 7 && days.indexOf(day) >= 5;
          return <div className={`${styles.dayTrack} ${work.length ? '' : styles.noSchedule} ${weekend ? styles.weekend : ''}`} key={day}
            style={{ minHeight: `${Math.max(128, 14 + events.length * 38)}px` }}
            aria-label={`${user.name}, ${formatDay(day)}`}>
            <div className={styles.trackLines}>{ticks.map((tick, index) =>
              <span key={tick} style={{ left: `${index / (ticks.length - 1) * 100}%` }} />)}</div>
            {work.map(({ interval, segment }, index) => <div key={`${interval.startUtc}-${index}`}
              className={styles.workBand} style={{ left: `${segment!.left}%`, width: `${segment!.width}%` }}
              title={`Horaire de travail ${formatClock(interval.startUtc, timeZone)}–${formatClock(interval.endUtc, timeZone)}`} />)}
            {work.length === 0 && <span className={styles.noScheduleText}>{user.id === '__unassigned' ? 'Aucun conseiller affecté' : user.workScheduleConfigured === false ? 'Horaire non configuré' : user.availability === 'GENERIC' ? 'Aucune plage projetée' : 'Hors horaire de travail'}</span>}
            {events.map(({ event, segment }, index) => { const visual = getActivityTypeVisual(event.activityType); return <button key={`${event.id}-${index}`} type="button"
              onClick={() => onSelect(event)}
              className={`${styles.event} ${event.source === 'USER_UNAVAILABILITY' ? styles.unavailable :
                event.source === 'LEGACY_ACTIVITY' ? styles.legacy :
                event.status === 'REQUESTED' ? styles.requested :
                event.status === 'PROVISIONAL' ? styles.provisional :
                event.status === 'BUSY' ? styles.busy : styles.confirmed}`}
              style={{ left: `${segment!.left}%`, width: `${Math.max(segment!.width, 1)}%`, borderTopColor: visual.color,
                top: `${6 + index * 38}px` }}
              aria-label={`${eventLabel(event)}, ${eventStatus(event)}, ${formatClock(event.startUtc, timeZone)} à ${formatClock(event.endUtc, timeZone)}${event.needsAction ? ', action requise' : ''}${event.warnings.length ? ', à vérifier' : ''}`}>
              <span className={styles.eventTitle}><span aria-hidden="true">{visual.icon}</span> {eventLabel(event)}</span>
              <span className={styles.eventMeta}>{formatClock(event.startUtc, timeZone)} · {eventStatus(event)}{event.needsAction || event.warnings.length ? ' · ⚠' : ''}</span>
            </button>; })}
          </div>;
        })}
      </div>)}
    </div>
    {data.events.length === 0 && <p className={styles.timelineEmpty}><strong>Aucun événement planifié pour cette période.</strong><span>Les horaires affichés restent indicatifs.</span></p>}
  </div>;
}
