import type { OpsTone } from './types';
import styles from './operational.module.css';

/** One important operational number. The number dominates; the chrome disappears. `demo` is mandatory: invented values are always marked. */
export function MetricTile({ value, label, demo, dateTime, tone }: { value: string; label: string; demo: string; dateTime?: string; tone?: OpsTone }) {
  return (
    <div className={`${styles.ops} ${styles.metric}`} data-ops-tone={tone}>
      <p className={styles.metricValue}>{dateTime ? <time dateTime={dateTime}>{value}</time> : value}</p>
      <p className={styles.metricLabel}>{label} <span className={styles.demoTag}>{demo}</span></p>
    </div>
  );
}
