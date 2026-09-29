import Link from 'next/link';
import styles from './conversion.module.css';

export type TrustItem = {
  code: string; title: string; text: string;
  /** A real destination that carries the proof. Omit when the claim is not yet verified. */
  source?: { label: string; href: string };
  /** Present when the wording is not verified: shown as REVIEW instead of asserted. */
  review?: string;
};

/**
 * Trust as evidence: a technical code, one plain statement, and where it can be checked. Fine rules, no cards, no logos,
 * no badges. An item without a verifiable source is labelled REVIEW rather than presented as fact.
 */
export function TrustStrip({ label, items }: { label: string; items: readonly TrustItem[] }) {
  return (
    <ul className={styles.trust} aria-label={label}>
      {items.map((item) => (
        <li key={item.code} className={styles.trustItem}>
          <p className={styles.trustCode}>{item.code}</p>
          <p className={styles.trustTitle}>{item.title}</p>
          <p className={styles.trustText}>{item.text}</p>
          {item.source && <p className={styles.trustSource}><Link href={item.source.href}>{item.source.label}</Link></p>}
          {item.review && <p className={styles.trustReview}><span aria-hidden="true">△</span> {item.review}</p>}
        </li>
      ))}
    </ul>
  );
}
