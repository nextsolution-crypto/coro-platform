import type { CSSProperties } from 'react';
import { Button } from '@/components/ui/Button';
import { HeroMedia } from './HeroMedia';
import type { HeroCopy, HeroHeading } from './types';
import shared from './hero.module.css';
import styles from './hero-operational.module.css';

export const operationalMedia = { night: '/website-v2/architecture/building-hero-night.webp' } as const;

export type OperationalStatus = { id: string; label: string; value: string; kind: 'ok' | 'number' };

type Props = {
  copy: HeroCopy;
  mediaAlt: string;
  /** Sample-data status panel. Must always be labelled as demonstration data. */
  panel: { title: string; demo: string; note: string; label: string; items: readonly OperationalStatus[] };
  heading?: HeroHeading;
  priority?: boolean;
};

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/**
 * HeroOperational: immersive and immediate.
 * Full-bleed night photograph on deep navy (the photograph is masked into the navy), narrative anchored left,
 * one restrained operational panel. Red is the signal: the primary action and one small marker, never a fill.
 * Every value shown is sample data and is labelled as such.
 */
export function HeroOperational({ copy, mediaAlt, panel, heading: Heading = 'h2', priority = false }: Props) {
  return (
    <section className={styles.hero} data-surface="dark">
      <div className={styles.backdrop}>
        <HeroMedia fit="cover" src={operationalMedia.night} alt={mediaAlt} sizes="100vw" position="62% 40%" priority={priority} />
      </div>
      <div className={styles.inner}>
        <div className={styles.text}>
          <p className={`${shared.label} ${styles.label} ${shared.rise}`}>{copy.label}</p>
          <Heading className={`${shared.headline} ${shared.rise}`} style={delay(80)}>{copy.title.map((line) => <span key={line}>{line}</span>)}</Heading>
          <p className={`${shared.lead} ${styles.lead} ${shared.rise}`} style={delay(160)}>{copy.body}</p>
          <div className={`${shared.actions} ${shared.rise}`} style={delay(240)}>
            <Button href={copy.primary.href} surface="dark">{copy.primary.label}</Button>
            {copy.secondary && <Button href={copy.secondary.href} variant="secondary" surface="dark">{copy.secondary.label}</Button>}
          </div>
        </div>
        <aside className={`${styles.panel} ${shared.rise}`} style={delay(420)} aria-label={panel.label}>
          <header><span className={shared.label}>{panel.title}</span><span className={styles.demo}>{panel.demo}</span></header>
          <dl>
            {panel.items.map((item) => (
              <div key={item.id}>
                <dt className={shared.label}>{item.label}</dt>
                <dd data-kind={item.kind}>{item.kind === 'ok' && <span className={styles.check} aria-hidden="true">✓</span>}{item.value}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.note}>{panel.note}</p>
        </aside>
      </div>
    </section>
  );
}
