import type { ReactNode } from 'react';
import { TechLabel } from './Technical';
import styles from './page.module.css';

type Heading = 'h2' | 'h3';

/**
 * Longer explanatory content without a wall of text: technical label, heading, readable measure (54ch), optional
 * dash list and inline link. Never a card; it inherits the surrounding section's ink and muted colours.
 */
export function EditorialBlock({ id, label, heading, level: Level = 'h2', size = 'lg', children, items, cta }: { id?: string; label?: string; heading: string; level?: Heading; size?: 'md' | 'lg'; children?: ReactNode; items?: readonly string[]; cta?: { label: string; href: string } }) {
  return (
    <div className={`${styles.editorial} ${styles.reveal}`} data-size={size}>
      {label && <TechLabel>{label}</TechLabel>}
      <Level id={id} className={styles.editorialHeading}>{heading}</Level>
      {children && <div className={styles.editorialBody}>{children}</div>}
      {items && <ul className={styles.dashes}>{items.map((item) => <li key={item}>{item}</li>)}</ul>}
      {cta && <a className={styles.inlineLink} href={cta.href}>{cta.label}<span aria-hidden="true">→</span></a>}
    </div>
  );
}
