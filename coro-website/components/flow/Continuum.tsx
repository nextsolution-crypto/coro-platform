import type { CSSProperties } from 'react';
import styles from './flow.module.css';

export type ContinuumPhaseData = { word: string; desc: string };
export type ContinuumMovement = { name: string; intensity: string; from: number; to: number };

/**
 * The CORO continuum: nine canonical stages read as ONE system, not nine feature cards.
 * Four movements (surface changes) carry the change of operational intensity through scale, mass and type:
 *   01–02 calm foundation · 03–04 rising attention · 05–06 highest operational intensity · 07–09 pressure eases, evidence and learning.
 * A single structural line with numbered nodes runs through every stage; a return line carries improvement back to 01 / 02.
 * Semantic: nested ordered lists (numbers are text), intensity is written as well as composed. No hover, no click, no motion needed.
 */
export function Continuum({ label, phases, movements, feedback }: { label: string; phases: readonly ContinuumPhaseData[]; movements: readonly ContinuumMovement[]; feedback: { label: string; from: string; to: string; text: string } }) {
  return (
    <section className={styles.continuum} aria-label={label}>
      <ol className={styles.movements}>
        {movements.map((movement, m) => (
          <li key={movement.name} className={styles.movement} data-m={m + 1} style={{ '--count': movement.to - movement.from + 1 } as CSSProperties}>
            <header className={styles.movementHead}>
              <p className={styles.movementName}>{movement.name}</p>
              <p className={styles.movementIntensity}>{movement.intensity}</p>
            </header>
            <ol className={styles.phases} start={movement.from}>
              {phases.slice(movement.from - 1, movement.to).map((phase, offset) => {
                const n = movement.from + offset;
                return (
                  <li key={phase.word} className={styles.phase} value={n} style={{ '--i': n } as CSSProperties}>
                    <span className={styles.phaseWord}>{phase.word}</span>
                    <span className={styles.phaseDesc}>{phase.desc}</span>
                    <span className={styles.phaseNum}>{String(n).padStart(2, '0')}</span>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
      <div className={styles.feedback}>
        <p className={styles.feedbackLabel}>{feedback.label}</p>
        <p className={styles.feedbackRoute}><span className={styles.feedbackArrow} aria-hidden="true">↺</span><b>{feedback.from}</b> → <b>{feedback.to}</b></p>
        <p className={styles.feedbackText}>{feedback.text}</p>
      </div>
    </section>
  );
}
