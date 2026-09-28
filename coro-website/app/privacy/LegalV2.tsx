import type { ReactNode } from 'react';
import { PageSection } from '@/components/page/PageSection';
import type { LegalContent } from './content';
import { legalIdentity } from './content';
import styles from './page.module.css';

/**
 * Shared legal-document renderer for /privacy and /terms (MIG-06). Deliberately restrained: no hero image, no
 * product screenshot, no CTA, no DemoForm, no cards, no "visual punch" — an authoritative, quiet, readable
 * legal document, consistent with V1/V2 tokens. Content is rendered exactly as supplied by content.ts; this
 * component adds no legal wording of its own beyond static labels (eyebrow text, "Contact" fallback), which
 * are presentation chrome, not legal clauses.
 */
export function LegalV2({ content: t, id, extra }: { content: LegalContent; id: string; extra?: (section: LegalContent['sections'][number]) => ReactNode }) {
  return (
    <>
      <PageSection tone="navy" density="compact" labelledBy={id}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h1 id={id} className={styles.title}>{t.title}</h1>
        <p className={styles.updated}>{t.updated}</p>
      </PageSection>

      <PageSection tone="white" density="standard">
        <article className={styles.article}>
          <p className={styles.intro}>{t.intro}</p>
          {t.sections.map((section) => (
            <section key={section.title} className={styles.section} aria-labelledby={`${id}-${section.title}`}>
              <h2 id={`${id}-${section.title}`} className={styles.sectionTitle}>{section.title}</h2>
              {section.paragraphs?.map((p) => <p key={p} className={styles.paragraph}>{p}</p>)}
              {section.bullets && (
                <ul className={styles.bullets}>
                  {section.bullets.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
              {extra?.(section)}
              {section.contact && (
                <div className={styles.contact}>
                  <p className={styles.contactBody}>
                    <strong>{t.contactLabel}</strong><br />
                    {legalIdentity.name}<br />
                    {legalIdentity.neq}<br />
                    {legalIdentity.addressLines.map((line) => <span key={line}>{line}<br /></span>)}
                    <a className={styles.contactLink} href={`mailto:${legalIdentity.email}`}>{legalIdentity.email}</a><br />
                    {legalIdentity.phone}
                  </p>
                </div>
              )}
            </section>
          ))}
        </article>
      </PageSection>
    </>
  );
}
