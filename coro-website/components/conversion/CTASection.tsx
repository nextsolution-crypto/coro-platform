import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import styles from './conversion.module.css';

export type CTAAction = { label: string; href: string };

/**
 * Page-ending call to action, composed as an architectural statement: a technical label and rule, a strong statement,
 * a short support line, then the action. Never a giant rounded card, gradient or banner. Two intensities:
 *   tone "light" / "soft": open and spacious, after a calm page (statement left, action beside it, separated by a hairline)
 *   tone "dark": compact and decisive, after operational content (statement and action on one line)
 * The primary action is the CORO red button (shared Button). One optional secondary action and one optional reference cue.
 */
export function CTASection({ id, tone = 'soft', label, statement, support, primary, secondary, cue }: { id: string; tone?: 'white' | 'soft' | 'dark'; label: string; statement: ReactNode; support?: string; primary: CTAAction; secondary?: CTAAction; cue?: ReactNode }) {
  const dark = tone === 'dark';
  return (
    <section className={styles.cta} data-tone={tone} data-surface={dark ? 'dark' : undefined} aria-labelledby={id}>
      <Container>
        <div className={styles.ctaInner}>
          <div className={styles.ctaCopy}>
            <p className={styles.ctaLabel}><span className={styles.ctaRule} aria-hidden="true" />{label}</p>
            <h2 id={id} className={styles.ctaStatement}>{statement}</h2>
            {support && <p className={styles.ctaSupport}>{support}</p>}
          </div>
          <div className={styles.ctaAction}>
            <div className={styles.ctaButtons}>
              <Button href={primary.href} surface={dark ? 'dark' : 'light'}>{primary.label}</Button>
              {secondary && <Button href={secondary.href} variant="ghost" surface={dark ? 'dark' : 'light'}>{secondary.label}</Button>}
            </div>
            {cue && <p className={styles.ctaCue}>{cue}</p>}
          </div>
        </div>
      </Container>
    </section>
  );
}

/** DemoCTA: the demonstration use case of CTASection. Lab copy only; production copy is not replaced. */
export function DemoCTA({ id, tone, label, statement, support, primary, secondary, cue }: Parameters<typeof CTASection>[0]) {
  return <CTASection id={id} tone={tone} label={label} statement={statement} support={support} primary={primary} secondary={secondary} cue={cue} />;
}
