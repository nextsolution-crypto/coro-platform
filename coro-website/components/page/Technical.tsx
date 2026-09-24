import type { ReactNode } from 'react';
import styles from './page.module.css';

/** Technical label: small, precise, spaced. Colour comes from the surrounding section (blue on light, light blue on navy). */
export function TechLabel({ children }: { children: ReactNode }) {
  return <p className={styles.label}>{children}</p>;
}

/** Numbered technical index, e.g. 01. */
export function TechIndex({ n }: { n: number }) {
  return <span className={styles.index}>{String(n).padStart(2, '0')}</span>;
}

/** Restrained cartouche (title block) that closes a technical frame. Exactly three cells: reference, subject, status. */
export function Cartouche({ cells }: { cells: readonly [string, string, string] }) {
  return <figcaption className={styles.cartouche}>{cells.map((cell) => <span key={cell}>{cell}</span>)}</figcaption>;
}
