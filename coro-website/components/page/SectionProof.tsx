import type { ReactNode } from 'react';
import { PageSection, type SectionDensity, type SectionTone } from './PageSection';
import { TechLabel } from './Technical';
import styles from './page.module.css';

/**
 * Evidence, not promotion: a heading and a lead beside an evidence composition (a real screenshot in a technical
 * frame, a process, a record). Never used for invented logos, testimonials, certifications or numbers; anything not
 * backed by the product must carry a visible demo tag.
 */
export function SectionProof({ id, tone = 'navy', density = 'standard', label, heading, lead, demo, children }: { id: string; tone?: SectionTone; density?: SectionDensity; label: string; heading: string; lead?: string; demo?: string; children: ReactNode }) {
  return (
    <PageSection tone={tone} density={density} labelledBy={id}>
      <div className={styles.proof}>
        <div className={`${styles.proofHead} ${styles.reveal}`}>
          <TechLabel>{label}</TechLabel>
          <h2 id={id} className={styles.editorialHeading}>{heading}</h2>
          {lead && <p className={styles.proofLead}>{lead}</p>}
          {demo && <span className={styles.demoTag}>{demo}</span>}
        </div>
        <div className={styles.proofBody}>{children}</div>
      </div>
    </PageSection>
  );
}

export type ProofRow = { key: string; text: string; /** Optional machine-readable value for a <time> key. */ dateTime?: string };

/** Structured record: hairline frame at panel radius, a header strip, keyed rows and a note. */
export function ProofRecord({ title, demo, rows, note, label }: { title: string; demo?: string; rows: readonly ProofRow[]; note?: string; label: string }) {
  return (
    <div className={styles.record} role="group" aria-label={label}>
      <div className={styles.recordHead}><TechLabel>{title}</TechLabel>{demo && <span className={styles.demoTag}>{demo}</span>}</div>
      <ul className={styles.recordRows}>
        {rows.map((row) => <li key={row.key}>{row.dateTime ? <time dateTime={row.dateTime}>{row.key}</time> : <span className={styles.cellKey}>{row.key}</span>}<span>{row.text}</span></li>)}
      </ul>
      {note && <p className={styles.recordNote}>{note}</p>}
    </div>
  );
}

/** Two-language output example: one row per pair, French then English, each in its own lang. */
export function ProofPairs({ title, demo, pairs, note, label }: { title: string; demo?: string; pairs: readonly (readonly [string, string])[]; note?: string; label: string }) {
  return (
    <div className={styles.record} role="group" aria-label={label}>
      <div className={styles.recordHead}><TechLabel>{title}</TechLabel>{demo && <span className={styles.demoTag}>{demo}</span>}</div>
      <div className={styles.pairs}>
        {pairs.map(([fr, en]) => <div key={fr}><span className={styles.fr} lang="fr">{fr}</span><span className={styles.en} lang="en">{en}</span></div>)}
      </div>
      {note && <p className={styles.recordNote}>{note}</p>}
    </div>
  );
}

/** Key / value facts under a lead. Semantic <dl>. */
export function ProofFacts({ facts }: { facts: readonly (readonly [string, string])[] }) {
  return <dl className={styles.facts}>{facts.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>;
}
