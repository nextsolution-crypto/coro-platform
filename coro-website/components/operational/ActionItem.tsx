import type { ReactNode } from 'react';
import type { OpsTone } from './types';
import styles from './operational.module.css';

export type ActionStatus = 'todo' | 'doing' | 'done';
const glyph: Record<ActionStatus, string> = { todo: '○', doing: '◐', done: '✓' };

/** What must happen next: priority, action, owner role, status. Operational action, not a task-management card. */
export function ActionList({ label, tone, children }: { label: string; tone?: OpsTone; children: ReactNode }) {
  return <ol className={`${styles.ops} ${styles.actions}`} aria-label={label} data-ops-tone={tone}>{children}</ol>;
}

export function ActionItem({ priority, priorityLabel, action, owner, status, statusLabel }: { priority: number; priorityLabel: string; action: string; owner?: string; status: ActionStatus; statusLabel: string }) {
  return (
    <li className={styles.actItem} data-status={status}>
      <span className={styles.prio}><span className={styles.sr}>{priorityLabel} </span><span aria-hidden="true">P</span>{priority}</span>
      <span className={styles.actBody}><span className={styles.actText}>{action}</span>{owner && <span className={styles.actOwner}>{owner}</span>}</span>
      <span className={styles.actStatus}><span className={styles.glyph} aria-hidden="true">{glyph[status]}</span>{statusLabel}</span>
    </li>
  );
}
