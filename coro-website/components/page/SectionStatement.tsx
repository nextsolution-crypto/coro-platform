import type { ReactNode } from 'react';
import { PageSection, type SectionDensity, type SectionTone } from './PageSection';
import { TechIndex, TechLabel } from './Technical';
import styles from './page.module.css';

/**
 * A strong transition after a hero: large editorial statement, a technical label and index, one thin rule.
 * Not a card. Use for a single idea; do not stack statements. Wrap the emphasised phrase in <em> for the accent colour.
 */
export function SectionStatement({ id, tone = 'white', density = 'immersive', index, label, statement, support }: { id: string; tone?: SectionTone; density?: SectionDensity; index: number; label: string; statement: ReactNode; support?: string }) {
  return (
    <PageSection tone={tone} density={density} labelledBy={id}>
      <div className={styles.statement}>
        <div className={`${styles.statementAside} ${styles.reveal}`}>
          <span className={`${styles.mark} ${styles.rule}`} aria-hidden="true" />
          <TechIndex n={index} />
          <TechLabel>{label}</TechLabel>
        </div>
        <div className={styles.reveal}>
          <h2 id={id} className={styles.statementText}>{statement}</h2>
          {support && <p className={styles.statementSupport}>{support}</p>}
        </div>
      </div>
    </PageSection>
  );
}
