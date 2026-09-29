import type { CSSProperties } from 'react';
import styles from './flow.module.css';

export type DataToActionStep = { word: string; caption: string; evidence: string };

/**
 * The CORO mechanism in four beats: DATA → DECISION → ACTION → IMPROVEMENT. Not four cards: one baseline connector, and
 * type that gains weight and size from beat to beat. The improvement beat carries a return note (it feeds the data again).
 * Exactly four concepts by design.
 */
export function DataToActionFlow({ label, steps, returnNote }: { label: string; steps: readonly [DataToActionStep, DataToActionStep, DataToActionStep, DataToActionStep]; returnNote: string }) {
  return (
    <section className={styles.d2a} aria-label={label}>
      <ol className={styles.d2aList}>
        {steps.map((step, index) => (
          <li key={step.word} className={styles.d2aStep} style={{ '--k': index } as CSSProperties}>
            <span className={styles.d2aNum}>{String(index + 1).padStart(2, '0')}</span>
            <span className={styles.d2aWord}>{step.word}</span>
            <span className={styles.d2aCaption}>{step.caption}</span>
            <span className={styles.d2aEvidence}>{step.evidence}</span>
          </li>
        ))}
      </ol>
      <p className={styles.d2aReturn}><span aria-hidden="true">↺</span> {returnNote}</p>
    </section>
  );
}
