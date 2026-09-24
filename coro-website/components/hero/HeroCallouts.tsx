import type { CSSProperties } from 'react';
import type { HeroAnnotation } from './types';
import styles from './hero.module.css';

/**
 * Optional annotations tied to points of the media. Real list content, so screen readers get the same
 * information as sighted users. Desktop: cards on leader lines over the media. Mobile: a short numbered list
 * (the media carries matching numbered pins). Place it as a sibling AFTER <HeroMedia/> inside a positioned stage.
 */
export function HeroCallouts({ items, label, baseDelay = 500 }: { items: readonly HeroAnnotation[]; label: string; baseDelay?: number }) {
  return (
    <ol className={styles.callouts} aria-label={label}>
      {items.map((item, index) => (
        <li key={item.id} className={styles.callout} data-side={item.side} style={{ '--x': `${item.x}%`, '--y': `${item.y}%`, '--lead': item.lead ?? 3, '--d': `${baseDelay + index * 140}ms` } as CSSProperties}>
          <span className={styles.dot} aria-hidden="true" />
          <div className={styles.tag}>
            <span className={styles.tagN} aria-hidden="true">{item.n}</span>
            <b>{item.label}</b>
            <small>{item.text}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}
