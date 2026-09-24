import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import { Cartouche } from '@/components/page/Technical';
import { SpatialMark } from './SpatialMarks';
import type { SpatialItem, SpatialSlice, SpatialTone } from './types';
import styles from './spatial.module.css';

export type SpatialVariant = 'building' | 'blueprint' | 'map';

export type SpatialFigureProps = {
  variant: SpatialVariant;
  src: string;
  /** Describes the base media only; overlay labels live in the index list. */
  alt: string;
  /** Width / height of the source picture. */
  ratio: number;
  /** Visible slice of the picture on tablet and desktop: [start, span] in percent of image width. */
  slice?: SpatialSlice;
  /** Visible slice below 48rem. */
  mobileSlice?: SpatialSlice;
  tone?: SpatialTone;
  sizes: string;
  items: readonly SpatialItem[];
  indexLabel: string;
  /** Reference (e.g. FIG. 04.1). */
  reference?: string;
  /** Three-cell cartouche: reference, subject, status. */
  cartouche?: readonly [string, string, string];
  /** Extra content between the frame and the index (legend). */
  legend?: ReactNode;
  priority?: boolean;
};

/**
 * Shared geometry for the three spatial frames. The picture is shown as a slice, so percentage coordinates map to the
 * same picture point at every width. Marks live INSIDE the frame (clipped by its edge). Real text: an ordered index
 * under the frame carries every reference; marks on the media are aria-hidden. Below 68rem the media keeps only
 * numbered pins (the items marked "pin") and the index carries the rest.
 */
export function SpatialFigure({ variant, src, alt, ratio, slice = [0, 100], mobileSlice = slice, tone = 'light', sizes, items, indexLabel, reference, cartouche, legend, priority }: SpatialFigureProps) {
  const vars = { '--ratio': ratio, '--c0d': slice[0], '--spand': slice[1], '--c0m': mobileSlice[0], '--spanm': mobileSlice[1] } as CSSProperties;
  return (
    <figure className={styles.figure} data-variant={variant} data-tone={tone} style={vars}>
      <div className={styles.frame}>
        <div className={styles.plate}><Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: 'cover' }} /></div>
        <div className={styles.overlay}>{items.map((item, index) => <SpatialMark key={item.id} item={item} delay={420 + index * 120} />)}</div>
        {reference && <p className={styles.ref}>{reference}</p>}
      </div>
      {cartouche && (variant === 'building' ? <div className={styles.note}>{cartouche.map((cell) => <span key={cell}>{cell}</span>)}</div> : <Cartouche cells={cartouche} />)}
      {legend}
      <ol className={styles.index} aria-label={indexLabel}>
        {items.map((item) => (
          <li key={item.id}>
            <span className={styles.idx}>{String(item.n).padStart(2, '0')}</span>
            <span className={styles.kindLabel}>{item.kindLabel}{item.code ? ` · ${item.code}` : ''}</span>
            <b>{item.title}</b>
            {item.detail && <span className={styles.detailText}>{item.detail}</span>}
          </li>
        ))}
      </ol>
    </figure>
  );
}
