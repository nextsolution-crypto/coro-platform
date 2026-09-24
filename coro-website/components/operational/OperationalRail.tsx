import type { ReactNode } from 'react';
import type { OpsTone } from './types';
import styles from './operational.module.css';

/**
 * Quiet operational strip for a normal situation: hairlines and text, no plate, no fill, no border box.
 * It reads after the situation, in a row on desktop and as calm stacked lines on mobile.
 */
export function OperationalRail({ label, tone = 'light', children }: { label: string; tone?: OpsTone; children: ReactNode }) {
  return <section className={`${styles.ops} ${styles.rail}`} data-ops-tone={tone} aria-label={label}>{children}</section>;
}

export function RailCell({ children }: { children: ReactNode }) {
  return <div className={styles.railCell}>{children}</div>;
}
