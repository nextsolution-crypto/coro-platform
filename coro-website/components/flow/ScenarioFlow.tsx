import type { ReactNode } from 'react';
import styles from './flow.module.css';

export type ScenarioOption = { text: string; chosen: boolean; chosenLabel: string };
export type ScenarioStep = { label: string; text: string; options?: readonly ScenarioOption[] };

/**
 * A scenario read as cause → decision → consequence: signal, assessment, decision (with the options that were weighed),
 * response, outcome. Decision logic is a two-option fork written as text; the chosen option carries a mark AND a word
 * (never colour alone). `after` receives the evidence-and-learning strip. Not a flowchart engine.
 */
export function ScenarioFlow({ label, steps, demo, after }: { label: string; steps: readonly ScenarioStep[]; demo: string; after?: ReactNode }) {
  return (
    <section className={styles.scenario} aria-label={label}>
      <p className={styles.processDemo}>{demo}</p>
      <ol className={styles.scenarioList}>
        {steps.map((step, index) => (
          <li key={step.label} className={styles.scenarioStep}>
            <span className={styles.scenarioLabel}>{String(index + 1).padStart(2, '0')} · {step.label}</span>
            <span className={styles.scenarioText}>{step.text}</span>
            {step.options && (
              <ul className={styles.fork}>
                {step.options.map((option) => (
                  <li key={option.text} data-chosen={option.chosen ? 'true' : 'false'}>
                    <span className={styles.forkMark} aria-hidden="true">{option.chosen ? '✓' : '×'}</span>
                    {option.text} <span className={styles.forkTag}>{option.chosenLabel}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      {after}
    </section>
  );
}
