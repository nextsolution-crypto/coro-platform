import type { CSSProperties } from 'react';
import { TechLabel } from './Technical';
import styles from './page.module.css';

export type MetricDimension = { label: string; value: number };

/**
 * One dominant number with its dimensions arranged as a ledger of lines: typography, hairlines and thin bars instead of
 * four cards. Values are always visible text (the bar is decorative). `demo` is required: a metric that is not backed
 * by product or public truth must say so.
 */
export function MetricComposition({ label, value, max = 100, demo, dimensions, note, dimensionsLabel }: { label: string; value: number; max?: number; demo: string; dimensions: readonly MetricDimension[]; note?: string; dimensionsLabel: string }) {
  return (
    <div className={styles.metric}>
      <div className={`${styles.metricValue} ${styles.reveal}`}>
        <TechLabel>{label}</TechLabel>
        <p className={styles.metricNum}><b>{value}</b><span>/ {max}</span></p>
        <span className={styles.demoTag}>{demo}</span>
        {note && <p className={styles.recordNote} style={{ padding: 0 }}>{note}</p>}
      </div>
      <ul className={styles.dims} aria-label={dimensionsLabel}>
        {dimensions.map((dimension) => (
          <li key={dimension.label} className={styles.reveal}>
            <span>{dimension.label}</span>
            <b>{dimension.value}</b>
            <i aria-hidden="true" style={{ '--v': (dimension.value / max) * 100 } as CSSProperties} />
          </li>
        ))}
      </ul>
    </div>
  );
}
