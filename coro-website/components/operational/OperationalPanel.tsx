import type { ReactNode } from 'react';
import type { OpsTone } from './types';
import styles from './operational.module.css';

/**
 * Structured operational plate, not a dashboard card: a technical label and demo tag, then a few ruled sections.
 * 4px radius, 1px border, no shadow. The plate is a labelled region for assistive technology.
 */
export function OperationalPanel({ label, context, demo, status, tone = 'light', children }: { label: string; context?: string; demo: string; status?: ReactNode; tone?: OpsTone; children: ReactNode }) {
  return (
    <section className={`${styles.ops} ${styles.panel}`} data-ops-tone={tone} aria-label={label}>
      <header className={styles.panelHead}>
        <p className={styles.techLabel}>{context ?? label}</p>
        <span className={styles.demoTag}>{demo}</span>
      </header>
      {status && <div className={styles.panelStatus}>{status}</div>}
      {children}
    </section>
  );
}

/** One ruled section of a panel, with an optional micro-label. */
export function PanelSection({ label, children }: { label?: string; children: ReactNode }) {
  return <div className={styles.sect}>{label && <p className={styles.techLabel}>{label}</p>}{children}</div>;
}
