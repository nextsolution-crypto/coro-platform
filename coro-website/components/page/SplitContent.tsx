import type { CSSProperties, ReactNode } from 'react';
import styles from './page.module.css';

/** Text : media proportion in twelfths. Never a universal 50/50. */
export type SplitRatio = '4-8' | '5-7' | '7-5' | '8-4';

const template: Record<SplitRatio, [number, number]> = { '4-8': [4, 8], '5-7': [5, 7], '7-5': [7, 5], '8-4': [8, 4] };

/**
 * Text + media (or text + structured information), either way round. DOM order is always text first (reading
 * order); order="media-text" only swaps the visual order on wide screens. Below 68rem it is a single column.
 * `bleed` lets the media run off the viewport edge; give <MediaFrame/> the matching `bleed` so visible corners are right.
 */
export function SplitContent({ order = 'text-media', ratio = '5-7', bleed = 'none', align = 'center', text, media }: { order?: 'text-media' | 'media-text'; ratio?: SplitRatio; bleed?: 'none' | 'left' | 'right'; align?: 'start' | 'center' | 'end'; text: ReactNode; media: ReactNode }) {
  const [t, m] = template[ratio];
  const cols = order === 'text-media' ? `minmax(0, ${t}fr) minmax(0, ${m}fr)` : `minmax(0, ${m}fr) minmax(0, ${t}fr)`;
  const vars = { '--cols': cols, '--align': align } as CSSProperties;
  return (
    <div className={styles.split} style={vars} data-order={order} data-bleed={bleed}>
      <div className={styles.splitText}>{text}</div>
      <div className={styles.splitMedia}>{media}</div>
    </div>
  );
}
