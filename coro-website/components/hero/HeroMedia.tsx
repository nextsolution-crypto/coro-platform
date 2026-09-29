import type { CSSProperties } from 'react';
import Image from 'next/image';
import type { HeroAnnotation } from './types';
import styles from './hero.module.css';

type CommonProps = {
  src: string;
  /** Informative alt text: what the picture shows, not a keyword list. */
  alt: string;
  /** Responsive `sizes` for next/image — describe the rendered width, not the source width. */
  sizes: string;
  /** Preload only for the single hero that is the page LCP element. */
  priority?: boolean;
  /** object-position, e.g. "70% 40%" */
  position?: string;
  className?: string;
};

type PlateProps = CommonProps & {
  fit?: 'plate';
  /** Intrinsic width / height of the source image. */
  ratio: number;
  /** Cropped aspect ratio below 48rem, e.g. "4 / 3". */
  mobileRatio?: string;
  /** Horizontal shift of the plate below 48rem (negative = show the right side), e.g. "-20%". */
  mobileShift?: string;
  /** Points of interest. Drawn as numbered pins where `pinsShow` allows. */
  pins?: readonly HeroAnnotation[];
  pinsShow?: 'mobile' | 'always';
};
type CoverProps = CommonProps & { fit: 'cover' };

/**
 * Environmental media for a hero.
 * `plate` (default): ratio-locked, so percentage coordinates map to the same picture point at every width;
 * on small screens the plate is cropped and shifted rather than scaled down.
 * `cover`: fills its parent (immersive backdrop); no coordinates.
 */
export function HeroMedia(props: PlateProps | CoverProps) {
  const { src, alt, sizes, priority = false, position = '50% 50%', className = '' } = props;
  const image = <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectPosition: position }} />;
  if (props.fit === 'cover') return <div className={`${styles.cover} ${className}`}>{image}</div>;
  const { ratio, mobileRatio = '4 / 3', mobileShift = '0%', pins = [], pinsShow = 'mobile' } = props;
  const vars = { '--ratio': ratio, '--mobile-ratio': mobileRatio, '--plate-left': mobileShift } as CSSProperties;
  return (
    <div className={`${styles.mediaBox} ${className}`} style={vars}>
      <div className={styles.plate}>
        {image}
        {pins.map((pin) => <span key={pin.id} className={styles.pin} data-show={pinsShow} aria-hidden="true" style={{ '--x': `${pin.x}%`, '--y': `${pin.y}%` } as CSSProperties}>{pin.n}</span>)}
      </div>
    </div>
  );
}
