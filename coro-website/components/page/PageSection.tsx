import type { ReactNode } from 'react';
import styles from './page.module.css';

/** soft: cool architectural neutral, no grid (default accent surface). paper: the graph-paper surface, contextual to technical / documentary pages only. */
export type SectionTone = 'white' | 'soft' | 'paper' | 'navy' | 'ecosystem';
export type SectionDensity = 'compact' | 'standard' | 'immersive';

/**
 * Surface primitive for page composition: white, architectural paper or deep navy, plus a rhythm density.
 * Dark sections carry data-surface="dark" so focus rings switch to the on-dark colour.
 * A section is a landmark only when labelled: pass `labelledBy` with the id of its heading.
 */
export function PageSection({ tone = 'white', density = 'standard', labelledBy, id, children }: { tone?: SectionTone; density?: SectionDensity; labelledBy?: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className={styles.section} data-tone={tone} data-density={density} data-surface={tone === 'navy' ? 'dark' : undefined} aria-labelledby={labelledBy}>
      <div className={styles.inner}>{children}</div>
    </section>
  );
}
