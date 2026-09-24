import type { CSSProperties } from 'react';
import styles from './flow.module.css';

export type ProcessStep = { name: string; time: string; text: string; output: string; gate?: boolean };

/**
 * A bounded operational process, read top to bottom as a ruled ledger with a spine: time offset, step, what happens,
 * what it produces. A decision gate is marked by a diamond node AND the written gate label. Offsets are demonstration data.
 * Different from the continuum on purpose: bounded, timed, with outputs; vertical on every width.
 */
export function ProcessFlow({ label, steps, demo, gateLabel, outputLabel }: { label: string; steps: readonly ProcessStep[]; demo: string; gateLabel: string; outputLabel: string }) {
  return (
    <section className={styles.process} aria-label={label}>
      <p className={styles.processDemo}>{demo}</p>
      <ol className={styles.processList}>
        {steps.map((step, index) => (
          <li key={step.name} className={styles.processStep} data-gate={step.gate ? 'true' : undefined} data-last={index === steps.length - 1 ? 'true' : undefined} style={{ '--i': index } as CSSProperties}>
            <span className={styles.processTime}>{step.time}</span>
            <span className={styles.processNode} aria-hidden="true" />
            <span className={styles.processBody}>
              <span className={styles.processName}>{String(index + 1).padStart(2, '0')} · {step.name}{step.gate && <span className={styles.processGate}>{gateLabel}</span>}</span>
              <span className={styles.processText}>{step.text}</span>
            </span>
            <span className={styles.processOut}><span className={styles.processOutLabel}>{outputLabel}</span>{step.output}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
