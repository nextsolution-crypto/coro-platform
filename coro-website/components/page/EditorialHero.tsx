import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import { PageSection, type SectionDensity } from './PageSection';
import styles from './editorial-hero.module.css';

/** Photographic mode (VISUAL-01). The image is a MARKETING ILLUSTRATION, never product proof: it is decorative by default (alt = ""). */
export type HeroPhoto = {
  src: string;
  /** Informative alt text. Omit for a decorative image, which is the default: the surrounding HTML carries all the meaning. */
  alt?: string;
  /** Which side the photograph occupies on wide screens; the text sits on the opposite, solid navy side. Default `end`. */
  side?: 'start' | 'end';
  /** object-position of the crop on wide screens and on narrow screens: keeps the subject in frame. */
  position?: string;
  mobilePosition?: string;
  priority?: boolean;
};

/**
 * EditorialHero: the editorial opening for institutional and product pages (technical label, display headline, lead copy,
 * optional detail, signature and actions). Renders its own page-opening section and the page's single h1.
 * `title` may be a string or one entry per line.
 *
 * Plain mode (default): a white PageSection. `compactTop` shortens the top space on narrow screens; `density` and `narrow`
 * keep each page's established rhythm.
 *
 * Photographic mode (`photo`): approved when real-world context materially strengthens page identity. A navy field carries the
 * text (always HTML); the photograph occupies about two thirds of the width and dissolves into the navy through a controlled
 * gradient, so the image stays clearly visible and readable contrast never depends on darkening the whole picture. On narrow
 * screens the photograph sits on top and fades into the text block. Pass `surface="dark"` to the action Buttons.
 * No motion, no parallax, no glow.
 */
export function EditorialHero({ id, label, title, lead, detail, signature, actions, compactTop = false, density = 'immersive', narrow = false, photo }: { id: string; label: string; title: string | readonly string[]; lead: string; detail?: string; signature?: string; actions?: ReactNode; compactTop?: boolean; density?: SectionDensity; narrow?: boolean; photo?: HeroPhoto }) {
  const lines = typeof title === 'string' ? [title] : title;
  const copy = (
    <>
      <p className={styles.label}>{label}</p>
      <h1 id={id} className={styles.title}>{lines.map((line) => <span key={line}>{line}</span>)}</h1>
      <p className={styles.lead}>{lead}</p>
      {detail && <p className={styles.detail}>{detail}</p>}
      {signature && <p className={styles.signature}>{signature}</p>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </>
  );
  if (photo) {
    const side = photo.side ?? 'end';
    const vars = { '--pos': photo.position ?? 'center', '--pos-m': photo.mobilePosition ?? photo.position ?? 'center' } as CSSProperties;
    return (
      <section className={styles.photoHero} data-side={side} data-surface="dark" aria-labelledby={id} style={vars}>
        <div className={styles.photoField}>
          <Image className={styles.photoImage} src={photo.src} alt={photo.alt ?? ''} fill sizes="(min-width: 48rem) 64vw, 100vw" priority={photo.priority ?? true} />
          <span className={styles.scrim} aria-hidden="true" />
        </div>
        <div className={styles.photoInner}>
          <div className={styles.photoCopy}>{copy}</div>
        </div>
      </section>
    );
  }
  return (
    <PageSection tone="white" density={density} labelledBy={id}>
      <div className={styles.hero} data-compact={compactTop ? 'true' : undefined} data-narrow={narrow ? 'true' : undefined}>
        {copy}
      </div>
    </PageSection>
  );
}
