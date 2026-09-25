import type { ReactNode } from 'react';
import { PageSection, type SectionDensity } from './PageSection';
import styles from './editorial-hero.module.css';

/**
 * EditorialHero: the minimal editorial opening for institutional pages (technical label, display headline, lead copy, optional
 * detail, signature and actions). Stands in for the unbuilt HeroMinimal (D-08); extracted at its third real use (/about, /contact, /partners).
 * It renders its own white PageSection and the page's single h1. `title` may be a string or one entry per line.
 * `compactTop` shortens the top space on narrow screens (About); desktop composition is never affected.
 * `density` (default immersive) and `narrow` (52rem measure instead of 60rem) keep each page's established rhythm.
 */
export function EditorialHero({ id, label, title, lead, detail, signature, actions, compactTop = false, density = 'immersive', narrow = false }: { id: string; label: string; title: string | readonly string[]; lead: string; detail?: string; signature?: string; actions?: ReactNode; compactTop?: boolean; density?: SectionDensity; narrow?: boolean }) {
  const lines = typeof title === 'string' ? [title] : title;
  return (
    <PageSection tone="white" density={density} labelledBy={id}>
      <div className={styles.hero} data-compact={compactTop ? 'true' : undefined} data-narrow={narrow ? 'true' : undefined}>
        <p className={styles.label}>{label}</p>
        <h1 id={id} className={styles.title}>{lines.map((line) => <span key={line}>{line}</span>)}</h1>
        <p className={styles.lead}>{lead}</p>
        {detail && <p className={styles.detail}>{detail}</p>}
        {signature && <p className={styles.signature}>{signature}</p>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </PageSection>
  );
}
