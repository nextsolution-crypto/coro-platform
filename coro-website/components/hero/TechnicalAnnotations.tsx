import type { CSSProperties } from 'react';
import type { HeroAnnotation } from './types';
import styles from './technical-annotations.module.css';

/**
 * Technical annotation language: a numbered index, a precise label, a fine connector and a small end mark
 * attached to a point of the architecture. No card, no fill, no shadow.
 *
 * Must be a sibling of the media frame inside a positioned stage that defines `--c0` and `--span`
 * (the visible slice of the picture, in percent of image width). Coordinates are picture-relative percentages.
 * Desktop: connector + label over the picture, drafting-style (label above the line, detail below it).
 * Below 68rem: the same content as a plain numbered index list under the media.
 */
export function TechnicalAnnotations({ items, label, datum }: { items: readonly HeroAnnotation[]; label: string; datum?: string }) {
  return (
    <>
      <ol className={styles.list} aria-label={label}>
        {items.map((item, index) => (
          <li key={item.id} className={styles.item} data-side={item.side} style={{ '--x': item.x, '--y': item.y, '--lead': item.lead ?? 9, '--d': `${520 + index * 160}ms` } as CSSProperties}>
            <span className={styles.head}>
              <span className={styles.index}>{String(item.n).padStart(2, '0')}</span>
              <b className={styles.title}>{item.label}</b>
            </span>
            <span className={styles.detail}>{item.text}</span>
            <span className={styles.end} aria-hidden="true" />
          </li>
        ))}
      </ol>
      {datum && <p className={styles.datum} aria-hidden="true"><span>{datum}</span></p>}
    </>
  );
}
