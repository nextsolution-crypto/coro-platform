import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import styles from './operational.module.css';

/**
 * Composition of a real situation with its operational information. The photograph is primary (10px radius, no overlay
 * chrome); the information never sits over the people or the building. Layouts express operational INTENSITY:
 *   lead   normal: media leads, the information is a quiet strip under it (children)
 *   plate  incident: strong media and a strong structured plate beside it (children) — the reference for high presence
 *   people accountability: media more dominant, a narrower plate beside it (children)
 *   open   recovery: media and an unframed statement (children), then an open row of proof and learning (`below`)
 * Below 68rem everything is recomposed; `first` chooses what reads first for the side-by-side layouts.
 */
export type SceneLayout = 'lead' | 'plate' | 'people' | 'open';

export function OperationalScene({ src, alt, ratio, position = '50% 50%', mobilePosition = position, layout = 'plate', first = 'panel', note, sizes, priority, below, children }: { src: string; alt: string; ratio: number; position?: string; mobilePosition?: string; layout?: SceneLayout; first?: 'media' | 'panel'; note?: string; sizes: string; priority?: boolean; below?: ReactNode; children: ReactNode }) {
  return (
    <figure className={styles.scene} data-layout={layout} data-first={first} style={{ '--ratio': ratio, '--pos-d': position, '--pos-m': mobilePosition } as CSSProperties}>
      <div className={styles.sceneMedia}><Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: 'cover' }} /></div>
      <div className={styles.scenePanel}>{children}</div>
      {below && <div className={styles.sceneBelow}>{below}</div>}
      {note && <figcaption className={styles.sceneNote}>{note}</figcaption>}
    </figure>
  );
}
