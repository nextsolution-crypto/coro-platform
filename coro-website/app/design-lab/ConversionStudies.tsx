import { CTASection, DemoCTA } from '@/components/conversion/CTASection';
import { business } from '@/components/conversion/footer-content';
import { SiteFooterV2 } from '@/components/conversion/SiteFooterV2';
import { TrustStrip, type TrustItem } from '@/components/conversion/TrustStrip';
import { SectionStatement } from '@/components/page/SectionStatement';
import { Container } from '@/components/ui/Container';
import { localizedHref, type Locale } from '@/lib/site/locale';
import { conversionCopy, conversionViewKeys, type ConversionViewKey } from './conversion-data';
import { LeadFormDemo } from './LeadFormDemo';
import styles from './design-lab.module.css';

export { conversionViewKeys };
export type { ConversionViewKey };

function StudyHead({ name, href, open }: { name: string; href?: string; open: string }) {
  return <div className={styles.studyBar} data-surface="dark"><Container><span className={styles.label}>{name}</span>{href && <> <a href={href} className={styles.label}>{open}</a></>}</Container></div>;
}

function Lead({ text, children }: { text: string; children?: React.ReactNode }) {
  return <div className={styles.opsBand} data-ops-band="white"><Container><p className={styles.flowLead}>{text}</p>{children}</Container></div>;
}

const trustItems = (locale: Locale): TrustItem[] => conversionCopy[locale].trust.items.map((item) => ('source' in item ? { ...item, source: { label: item.source.label, href: localizedHref(item.source.href, locale) } } : { ...item }));

function Cue({ locale }: { locale: Locale }) {
  return <>{conversionCopy[locale].cta.cue} <a href={`mailto:${business.email}`}>{business.email}</a></>;
}

/* ── A: light CTA. Open, spacious, statement | rule | action. ── */
function StudyA({ locale }: { locale: Locale }) {
  const t = conversionCopy[locale];
  return (
    <div id="conversion-a">
      <Lead text={t.zone.leads.a} />
      <DemoCTA id="cta-a" tone="soft" label={t.cta.label} statement={t.cta.statement} support={t.cta.support} primary={{ label: t.cta.primary, href: localizedHref('/contact', locale) }} secondary={{ label: t.cta.secondary, href: localizedHref('/security', locale) }} cue={<Cue locale={locale} />} />
    </div>
  );
}

/* ── B: dark CTA. Compact and decisive, on one line. ── */
function StudyB({ locale }: { locale: Locale }) {
  const t = conversionCopy[locale];
  return (
    <div id="conversion-b">
      <Lead text={t.zone.leads.b} />
      <DemoCTA id="cta-b" tone="dark" label={t.cta.label} statement={t.cta.statement} support={t.cta.support} primary={{ label: t.cta.primary, href: localizedHref('/contact', locale) }} />
    </div>
  );
}

/* ── C: the lead form, with real states and no submission. ── */
function StudyC({ locale }: { locale: Locale }) {
  const t = conversionCopy[locale];
  return (
    <div id="conversion-c" className={styles.opsBand} data-ops-band="white">
      <Container>
        <p className={styles.flowLead}>{t.zone.leads.c}</p>
        <LeadFormDemo locale={locale} controls={t.form.states} states={t.form.list} referral={t.form.referral} />
        <p className={styles.note}>{t.form.hint}</p>
        <p className={styles.note}>{t.form.contract}</p>
      </Container>
    </div>
  );
}

/* ── D: trust as evidence: a code, a statement, a source. Unverified wording is marked, not asserted. ── */
function StudyD({ locale }: { locale: Locale }) {
  const t = conversionCopy[locale];
  return (
    <div id="conversion-d" className={styles.opsBand} data-ops-band="white">
      <Container>
        <p className={styles.flowLead}>{t.zone.leads.d}</p>
        <h2 className={styles.trustHeading}>{t.trust.heading}</h2>
        <TrustStrip label={t.trust.label} items={trustItems(locale)} />
        <div className={styles.trustContact}>
          <p className={styles.label}>{t.trust.contactLabel}</p>
          <p><a href={`mailto:${business.email}`}>{business.email}</a> · <a href={business.phoneHref}>{business.phone}</a> · {business.address.join(', ')}</p>
          <p className={styles.opsSupport}><a href={localizedHref('/contact', locale)}>{t.trust.contactSource}</a></p>
        </div>
      </Container>
    </div>
  );
}

/* ── E: the candidate V2 footer, in both languages. ── */
function StudyE({ locale }: { locale: Locale }) {
  const other: Locale = locale === 'fr' ? 'en' : 'fr';
  const t = conversionCopy[locale];
  return (
    <div id="conversion-e">
      <Lead text={t.zone.leads.e} />
      <SiteFooterV2 locale={locale} pathname="/design-lab" />
      <div className={styles.footerCompare}><Container><span className={styles.label}>{other.toUpperCase()}</span></Container></div>
      <SiteFooterV2 locale={other} pathname="/design-lab" />
    </div>
  );
}

/* ── Page-ending sequence: content → proof → CTA → footer. ── */
function Ending({ locale }: { locale: Locale }) {
  const t = conversionCopy[locale];
  return (
    <div id="conversion-end">
      <SectionStatement id="end-statement" tone="soft" index={1} label={t.end.label} statement={<>{t.end.statementBefore}<em>{t.end.statementEm}</em>{t.end.statementAfter}</>} support={t.end.support} />
      <div className={styles.opsBand} data-ops-band="white"><Container><TrustStrip label={t.trust.label} items={trustItems(locale)} /></Container></div>
      <CTASection id="end-cta" tone="soft" label={t.cta.label} statement={t.cta.statement} support={t.cta.support} primary={{ label: t.cta.primary, href: localizedHref('/contact', locale) }} secondary={{ label: t.cta.secondary, href: localizedHref('/security', locale) }} cue={<Cue locale={locale} />} />
      <SiteFooterV2 locale={locale} pathname="/design-lab" />
    </div>
  );
}

/** Zone 07: principles, then five studies and one full page ending. */
export function ConversionZone({ locale }: { locale: Locale }) {
  const t = conversionCopy[locale];
  const view = (key: ConversionViewKey) => `${localizedHref('/design-lab', locale)}${locale === 'en' ? '&' : '?'}view=${key}`;
  return (
    <section id="conversion" className={styles.zone} aria-labelledby="conversion-title">
      <Container><header className={styles.zoneHead}><span>07</span><h2 id="conversion-title">{t.zone.title}</h2></header></Container>
      <div className={styles.band} data-tone="white"><Container>
        <div className={styles.block}>
          <ul className={styles.opsPrinciples}>{t.zone.principles.map((line) => <li key={line}>{line}</li>)}</ul>
          <p className={styles.blockLead}>{t.zone.lead}</p>
          <p className={styles.note}>{t.zone.demo}</p>
        </div>
      </Container></div>
      <StudyHead name={t.zone.studies.a} href={view('conversion-a')} open={t.zone.open} /><StudyA locale={locale} />
      <StudyHead name={t.zone.studies.b} href={view('conversion-b')} open={t.zone.open} /><StudyB locale={locale} />
      <StudyHead name={t.zone.studies.c} href={view('conversion-c')} open={t.zone.open} /><StudyC locale={locale} />
      <StudyHead name={t.zone.studies.d} href={view('conversion-d')} open={t.zone.open} /><StudyD locale={locale} />
      <StudyHead name={t.zone.studies.e} href={view('conversion-e')} open={t.zone.open} /><StudyE locale={locale} />
      <StudyHead name={t.zone.studies.end} href={view('conversion-end')} open={t.zone.open} /><Ending locale={locale} />
    </section>
  );
}

/** Chromeless view for responsive QA. */
export function ConversionView({ locale, study }: { locale: Locale; study: 'a' | 'b' | 'c' | 'd' | 'e' | 'end' }) {
  const Study = { a: StudyA, b: StudyB, c: StudyC, d: StudyD, e: StudyE, end: Ending }[study];
  return <div data-design-lab data-coro-system="v1" className={styles.lab}><main id="lab-main"><Study locale={locale} /></main></div>;
}
