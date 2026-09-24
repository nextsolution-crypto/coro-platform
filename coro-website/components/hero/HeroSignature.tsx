import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { TechnicalAnnotations } from './TechnicalAnnotations';
import type { HeroAnnotation, HeroCopy, HeroHeading } from './types';
import shared from './hero.module.css';
import styles from './hero-signature.module.css';

export const signatureMedia = { day: '/website-v2/architecture/building-hero-day.webp', ratio: 1672 / 941 } as const;

export type SignatureHeaderMode = 'separate' | 'integrated';

type Props = {
  copy: HeroCopy;
  /** What the photograph shows. */
  mediaAlt: string;
  /** Small caption on the media (demo building). */
  caption: string;
  /** Level-reference micro label on the datum line (large desktop only). */
  datum: string;
  annotations: readonly HeroAnnotation[];
  annotationsLabel: string;
  heading?: HeroHeading;
  /**
   * 'separate': the header is rendered by the page above the hero.
   * 'integrated': pass the header as `header`; it sits over the hero and the photograph bleeds up under it (Lab-only study).
   */
  headerMode?: SignatureHeaderMode;
  header?: ReactNode;
  priority?: boolean;
};

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/**
 * HeroSignature (A2): architectural publication + operational annotation.
 * The building is monumental and contained: 10px on visible corners only, bleeding off the right edge (and off the
 * top when the header is integrated). The headline overlaps the sky at the picture's edge; body copy never touches
 * the facade. Annotations use the CORO technical language (index, label, connector, end mark) attached to the
 * architecture. No cards, no shadows, no glass. Status: REVIEW.
 */
export function HeroSignature({ copy, mediaAlt, caption, datum, annotations, annotationsLabel, heading: Heading = 'h1', headerMode = 'separate', header, priority = false }: Props) {
  return (
    <section className={styles.hero} data-header={headerMode}>
      {headerMode === 'integrated' && header && <div className={styles.headerSlot}>{header}</div>}
      <div className={styles.inner}>
        <div className={styles.text}>
          <p className={`${shared.label} ${styles.label} ${shared.rise}`}>{copy.label}</p>
          <Heading className={`${shared.headline} ${styles.title} ${shared.rise}`} style={delay(80)}>{copy.title.map((line) => <span key={line}>{line}</span>)}</Heading>
          <p className={`${shared.lead} ${styles.lead} ${shared.rise}`} style={delay(160)}>{copy.body}</p>
          <div className={`${shared.actions} ${shared.rise}`} style={delay(240)}>
            <Button href={copy.primary.href}>{copy.primary.label}</Button>
            {copy.secondary && <Button href={copy.secondary.href} variant="ghost">{copy.secondary.label}</Button>}
          </div>
        </div>

        <div className={styles.stage} style={{ '--ratio': signatureMedia.ratio } as CSSProperties}>
          <div className={styles.frame}>
            <div className={styles.plate}>
              <Image src={signatureMedia.day} alt={mediaAlt} fill sizes="(min-width: 68rem) 84vw, 180vw" priority={priority} style={{ objectFit: 'cover', objectPosition: '50% 50%' }} />
            </div>
            {annotations.map((item) => <span key={item.id} className={styles.pin} aria-hidden="true" style={{ '--x': item.x, '--y': item.y } as CSSProperties}>{item.n}</span>)}
            <p className={`${shared.label} ${styles.caption}`}><i aria-hidden="true" />{caption}</p>
          </div>
          <TechnicalAnnotations items={annotations} label={annotationsLabel} datum={datum} />
        </div>
      </div>
    </section>
  );
}
