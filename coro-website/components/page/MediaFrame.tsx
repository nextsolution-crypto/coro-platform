import type { CSSProperties } from 'react';
import Image from 'next/image';
import { Cartouche, TechIndex } from './Technical';
import styles from './page.module.css';

type Common = {
  src: string;
  /** Informative alt text: what the picture shows. */
  alt: string;
  /** Width / height of the source picture. */
  ratio: number;
  /** Crop, e.g. "16 / 8"; defaults to the natural ratio. */
  aspect?: string;
  position?: string;
  /** Responsive sizes: the rendered width, not the source width. */
  sizes: string;
  priority?: boolean;
};
type PhotoProps = Common & {
  kind?: 'photo';
  /** Which viewport edge the frame bleeds off; that side gets square corners. */
  bleed?: 'none' | 'left' | 'right';
  overlayLabel?: string;
  index?: number;
  caption?: string;
};
type TechnicalProps = Common & {
  kind: 'technical';
  /** Reference, subject, status. */
  cartouche?: readonly [string, string, string];
};

/**
 * Media treatment. Photographic media: 10px on visible, contained corners only (a bleeding side is square).
 * Technical media (drawings, screenshots): a 1px blue frame at panel radius (4px) closed by a cartouche.
 * No shadow, no card. Text that matters is never baked into the frame: captions are HTML.
 */
export function MediaFrame(props: PhotoProps | TechnicalProps) {
  const aspect = props.aspect ?? String(props.ratio);
  const image = <Image src={props.src} alt={props.alt} fill sizes={props.sizes} priority={props.priority} style={{ objectPosition: props.position ?? '50% 50%' }} />;
  const vars = { '--aspect': aspect } as CSSProperties;
  if (props.kind === 'technical') {
    return (
      <figure className={`${styles.figure} ${styles.mediaReveal}`} data-kind="technical" data-plain={props.cartouche ? undefined : 'true'}>
        <div className={styles.frame} style={vars}>{image}</div>
        {props.cartouche && <Cartouche cells={props.cartouche} />}
      </figure>
    );
  }
  return (
    <figure className={`${styles.figure} ${styles.mediaReveal}`} data-kind="photo" data-bleed={props.bleed ?? 'none'}>
      <div className={styles.frame} style={vars}>
        {image}
        {props.overlayLabel && <p className={styles.overlay}><i aria-hidden="true" />{props.overlayLabel}</p>}
      </div>
      {props.caption && <figcaption className={styles.caption}>{props.index !== undefined && <TechIndex n={props.index} />}<span>{props.caption}</span></figcaption>}
    </figure>
  );
}
