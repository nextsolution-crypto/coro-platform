'use client';

import type { PlannerEvent } from './types';
import { formatClock, formatDay, monthDaySummary, monthGridDays } from './time';
import { eventLabel } from './projection';
import { getActivityTypeVisual } from './activityTypeVisual';
import styles from './planning.module.css';

type DatedPlanningAction = { id: string; type: string; startUtc: string | null };

export default function MonthCalendar({ monthDays, events, actions, timeZone, today, onDay, onSelect }: {
  monthDays: string[]; events: PlannerEvent[]; actions: DatedPlanningAction[]; timeZone: string; today: string;
  onDay: (day: string) => void; onSelect: (event: PlannerEvent) => void;
}) {
  const month = monthDays[0].slice(0, 7);
  return <div className={styles.monthWrap}>
    <div className={styles.monthWeekdays} aria-hidden="true">
      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(label => <span key={label}>{label}</span>)}
    </div>
    <div className={styles.monthGrid} role="grid" aria-label="Calendrier mensuel">
      {monthGridDays(monthDays[0]).map((day, index) => {
        const { events: dayEvents, requested, conflicts, unknown, unplanned } = monthDaySummary(day, events, actions, timeZone);
        const outside = day.slice(0, 7) !== month; const weekend = index % 7 >= 5;
        return <div role="gridcell" key={day} className={`${styles.monthCell} ${outside ? styles.outsideMonth : ''} ${weekend ? styles.weekend : ''} ${day === today ? styles.todayCell : ''}`}>
          <button type="button" className={styles.dayTarget} onClick={() => onDay(day)}
            aria-label={`${formatDay(day)}${day === today ? ', aujourd’hui' : ''}${weekend ? ', fin de semaine' : ''}, ${dayEvents.length} événements`}>
            <span className={styles.dayNumber}>{Number(day.slice(-2))}{day === today && <em>Aujourd’hui</em>}</span>
            {!outside && <span className={styles.dayCounts}>{dayEvents.length} événement{dayEvents.length === 1 ? '' : 's'}</span>}
            {!outside && <span className={styles.daySignals}>
              {requested > 0 && <span>Demandes {requested}</span>}{conflicts > 0 && <span>⚠ Conflits {conflicts}</span>}
              {unknown > 0 && <span>? À vérifier {unknown}</span>}{unplanned > 0 && <span>À planifier {unplanned}</span>}
            </span>}
          </button>
          {!outside && <div className={styles.monthEvents}>{dayEvents.slice(0, 2).map(event => { const visual = getActivityTypeVisual(event.activityType); return <button type="button" key={event.id} onClick={() => onSelect(event)} title={`${visual.label} · ${eventLabel(event)}`} style={{ borderLeftColor: visual.color }}>
              <span aria-hidden="true">{visual.icon}</span> {formatClock(event.startUtc, timeZone)} {eventLabel(event)}
            </button>; })}{dayEvents.length > 2 && <span>+ {dayEvents.length - 2} autres</span>}</div>}
        </div>;
      })}
    </div>
  </div>;
}
