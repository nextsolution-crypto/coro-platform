import type { CSSProperties } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { HeroMedia } from './HeroMedia';
import type { HeroAnnotation, HeroCopy, HeroHeading } from './types';
import shared from './hero.module.css';
import styles from './hero-technical.module.css';

export const technicalMedia = {
  blueprint: '/website-v2/architecture/building-blueprint.webp',
  blueprintRatio: 1536 / 1024,
  cutaway: '/website-v2/architecture/building-cutaway.webp',
} as const;

export type TechnicalReference = HeroAnnotation & { code: string };

type Props = {
  copy: HeroCopy;
  mediaAlt: string;
  /** Numbered document references; each one is also a pin on the drawing sheet. */
  references: readonly TechnicalReference[];
  referencesLabel: string;
  /** Title block under the sheet: sheet number, subject, scale, demo flag. */
  titleBlock: readonly [string, string, string];
  inset: { alt: string; caption: string };
  heading?: HeroHeading;
  priority?: boolean;
};

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/**
 * HeroTechnical: a drawing sheet, not a picture.
 * Editorial column (technical label, headline, numbered document index) beside a framed blueprint sheet with a
 * title block and numbered balloons, drawing-convention style. Structural blue and hairlines; red stays the action.
 * The drawing carries baked French sheet text — it is ambient material, so the essential content lives in HTML.
 */
export function HeroTechnical({ copy, mediaAlt, references, referencesLabel, titleBlock, inset, heading: Heading = 'h2', priority = false }: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.text}>
          <p className={`${shared.label} ${styles.label} ${shared.rise}`}>{copy.label}</p>
          <Heading className={`${shared.headline} ${shared.rise}`} style={delay(80)}>{copy.title.map((line) => <span key={line}>{line}</span>)}</Heading>
          <p className={`${shared.lead} ${styles.lead} ${shared.rise}`} style={delay(160)}>{copy.body}</p>
          <ol className={`${styles.refs} ${shared.rise}`} style={delay(220)} aria-label={referencesLabel}>
            {references.map((ref) => (
              <li key={ref.id}>
                <span className={styles.refN} aria-hidden="true">{ref.n}</span>
                <b className={styles.refCode}>{ref.code}</b>
                <span className={styles.refText}>{ref.label}<small>{ref.text}</small></span>
              </li>
            ))}
          </ol>
          <div className={`${shared.actions} ${shared.rise}`} style={delay(300)}>
            <Button href={copy.primary.href}>{copy.primary.label}</Button>
            {copy.secondary && <Button href={copy.secondary.href} variant="ghost">{copy.secondary.label}</Button>}
          </div>
        </div>

        <div className={styles.sheetWrap}>
          <figure className={styles.sheet}>
            <HeroMedia src={technicalMedia.blueprint} alt={mediaAlt} ratio={technicalMedia.blueprintRatio} mobileRatio="3 / 2" sizes="(min-width: 68rem) 56vw, 100vw" pins={references} pinsShow="always" priority={priority} />
            <figcaption className={styles.titleBlock}>
              {titleBlock.map((cell) => <span key={cell} className={shared.label}>{cell}</span>)}
            </figcaption>
          </figure>
          <figure className={styles.inset}>
            <div className={styles.insetMedia}><Image src={technicalMedia.cutaway} alt={inset.alt} fill sizes="240px" style={{ objectPosition: '55% 50%' }} /></div>
            <figcaption className={shared.label}>{inset.caption}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
