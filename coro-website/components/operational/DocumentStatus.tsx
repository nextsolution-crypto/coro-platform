import type { ReactNode } from 'react';
import { StatusChip } from './StatusChip';
import type { OpsState, OpsTone } from './types';
import styles from './operational.module.css';

/** Evidence reference: a code, a title, and the state of that document. Reads as a citation, not as a file-manager row. */
export function DocumentList({ label, tone, children }: { label: string; tone?: OpsTone; children: ReactNode }) {
  return <ul className={`${styles.ops} ${styles.docs}`} aria-label={label} data-ops-tone={tone}>{children}</ul>;
}

export function DocumentStatus({ code, title, state, stateLabel }: { code: string; title: string; state: OpsState; stateLabel: string }) {
  return (
    <li className={styles.docItem}>
      <span className={styles.docCode}>{code}</span>
      <span className={styles.docTitle}>{title}</span>
      <StatusChip state={state} label={stateLabel} />
    </li>
  );
}
