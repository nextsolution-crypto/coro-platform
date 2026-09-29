import type { CSSProperties } from 'react';
import styles from './page.module.css';

export type FeatureItem = { title: string; text: string; /** Optional technical code, e.g. PMU. */ meta?: string };

/**
 * Capabilities as an ordered index instead of feature cards: numbering, hairlines and hierarchy carry the structure.
 * layout="rows": ledger (number | title | description). layout="steps": a vertical process rail. layout="sequence": REJECTED as a promoted pattern (kept only as a Lab reference); use "steps".
 * Semantic <ol>; numbers are visible text, so order is never conveyed by colour or position alone.
 */
export function FeatureIndex({ items, layout = 'rows', label }: { items: readonly FeatureItem[]; layout?: 'rows' | 'steps' | 'sequence'; label: string }) {
  return (
    <ol className={styles.features} data-layout={layout} aria-label={label} style={{ '--n': items.length } as CSSProperties}>
      {items.map((item, index) => (
        <li key={item.title} className={`${styles.feature} ${styles.reveal}`}>
          <span className={styles.featureNum}>{String(index + 1).padStart(2, '0')}</span>
          <h3 className={styles.featureTitle}>{item.title}{item.meta && <span className={styles.featureMeta}>{item.meta}</span>}</h3>
          <p className={styles.featureText}>{item.text}</p>
        </li>
      ))}
    </ol>
  );
}
