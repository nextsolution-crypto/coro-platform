import type { CSSProperties } from 'react';
import { Button } from '@/components/ui/Button';
import { HeroCallouts } from './HeroCallouts';
import { HeroMedia } from './HeroMedia';
import type { HeroAnnotation, HeroCopy, HeroHeading } from './types';
import shared from './hero.module.css';
import styles from './hero-architectural.module.css';

export const architecturalMedia = { day: '/website-v2/architecture/building-hero-day.webp', ratio: 1672 / 941 } as const;

type Props = {
  copy: HeroCopy;
  /** What the photograph shows. */
  mediaAlt: string;
  /** Short caption tag on the media (demo building, etc.). */
  caption: string;
  annotations: readonly HeroAnnotation[];
  annotationsLabel: string;
  heading?: HeroHeading;
  priority?: boolean;
};

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/**
 * HeroArchitectural: the building is the subject.
 * Asymmetric: narrative on white, the building in a ratio-locked plate that bleeds to the viewport edge, 2 to 3
 * annotations tied to real points of the picture. Depth comes from surface contrast and media; no shadows.
 */
export function HeroArchitectural({ copy, mediaAlt, caption, annotations, annotationsLabel, heading: Heading = 'h1', priority = false }: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.text}>
          <p className={`${shared.label} ${styles.label} ${shared.rise}`}>{copy.label}</p>
          <Heading className={`${shared.headline} ${shared.rise}`} style={delay(80)}>{copy.title.map((line) => <span key={line}>{line}</span>)}</Heading>
          <p className={`${shared.lead} ${styles.lead} ${shared.rise}`} style={delay(160)}>{copy.body}</p>
          <div className={`${shared.actions} ${shared.rise}`} style={delay(240)}>
            <Button href={copy.primary.href}>{copy.primary.label}</Button>
            {copy.secondary && <Button href={copy.secondary.href} variant="ghost">{copy.secondary.label}</Button>}
          </div>
        </div>
        <div className={styles.stage}>
          <HeroMedia src={architecturalMedia.day} alt={mediaAlt} ratio={architecturalMedia.ratio} mobileRatio="4 / 3" mobileShift="-19%" position="50% 50%" sizes="(min-width: 68rem) 66vw, 100vw" pins={annotations} priority={priority} />
          <p className={`${shared.label} ${styles.caption}`}>{caption}</p>
          <HeroCallouts items={annotations} label={annotationsLabel} />
        </div>
      </div>
    </section>
  );
}
