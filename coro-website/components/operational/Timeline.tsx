import type { CSSProperties, ReactNode } from 'react';
import { StatusChip } from './StatusChip';
import type { OpsState, OpsTone } from './types';
import styles from './operational.module.css';

/** Incident-log timeline: time, event, optional state and source. Not a feed: no avatars, no bubbles. */
export function Timeline({ label, tone, children }: { label: string; tone?: OpsTone; children: ReactNode }) {
  return <ol className={`${styles.ops} ${styles.timeline}`} aria-label={label} data-ops-tone={tone}>{children}</ol>;
}

export function TimelineEvent({ time, dateTime, event, state, stateLabel, source, index = 0 }: { time: string; dateTime: string; event: string; state?: OpsState; stateLabel?: string; source?: string; index?: number }) {
  return (
    <li className={styles.tlItem} data-state={state ?? 'none'} style={{ '--i': index } as CSSProperties}>
      <time dateTime={dateTime}>{time}</time>
      <span className={styles.tlBody}>
        <span className={styles.tlEvent}>{event}</span>
        {source && <span className={styles.tlSource}>{source}</span>}
      </span>
      {state && stateLabel && <StatusChip state={state} label={stateLabel} />}
    </li>
  );
}
