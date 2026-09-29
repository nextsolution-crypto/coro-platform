import type { ReactNode } from 'react';
import { HeroOperational } from '@/components/hero/HeroOperational';
import { HeroSignature } from '@/components/hero/HeroSignature';
import { HeroTechnical } from '@/components/hero/HeroTechnical';
import { Accordion } from '@/components/page/Accordion';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { FeatureIndex } from '@/components/page/FeatureIndex';
import { MediaFrame } from '@/components/page/MediaFrame';
import { MetricComposition } from '@/components/page/MetricComposition';
import { PageSection } from '@/components/page/PageSection';
import { SectionProof, ProofFacts, ProofPairs, ProofRecord } from '@/components/page/SectionProof';
import { SectionStatement } from '@/components/page/SectionStatement';
import { SplitContent } from '@/components/page/SplitContent';
import { SiteHeader, type SiteHeaderTone } from '@/components/site/SiteHeader';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { localizedHref, type Locale } from '@/lib/site/locale';
import { heroStudies } from './heroes-data';
import { rhythmCopy } from './rhythm-data';
import styles from './design-lab.module.css';

/** Committed assets only. Photographs use the 10px rule; the drawing and the product capture are technical media. */
const asset = {
  entry: { src: '/website-v2/architecture/building-entry.webp', ratio: 1515 / 1038 },
  desk: { src: '/website-v2/documents/document-blueprint-desk.webp', ratio: 1536 / 1024 },
  stairs: { src: '/website-v2/sentinel/evacuation-stairs.webp', ratio: 1513 / 1039 },
  assembly: { src: '/website-v2/sentinel/assembly-point.webp', ratio: 1536 / 1024 },
  plan: { src: '/website-v2/architecture/building-blueprint.webp', ratio: 1536 / 1024 },
  cycle: { src: '/images/solutions/portail-client/coro-portail-client-cycle-documentaire.webp', ratio: 1311 / 1005 },
} as const;

const paragraphs = (items: readonly string[]) => items.map((text) => <p key={text}>{text}</p>);
const statement = (s: { before: string; em: string; after: string }) => <>{s.before}<em>{s.em}</em>{s.after}</>;

/* ───────────────────────── Rhythm A — architectural / platform ───────────────────────── */
export function RhythmA({ locale }: { locale: Locale }) {
  const t = rhythmCopy[locale].a;
  return (
    <>
      <SectionStatement id="ra-statement" tone="soft" index={1} label={t.statementLabel} statement={statement(t.statement)} support={t.support} />
      <PageSection tone="white" density="standard" labelledBy="ra-split">
        <SplitContent ratio="4-8" bleed="right" text={<EditorialBlock id="ra-split" label={t.splitLabel} heading={t.splitHeading} items={t.splitItems} cta={{ label: t.splitCta, href: '#page-rhythm' }}>{paragraphs(t.splitBody)}</EditorialBlock>}
          media={<MediaFrame src={asset.entry.src} ratio={asset.entry.ratio} aspect="4 / 3" alt={t.mediaAlt} sizes="(min-width: 68rem) 66vw, 100vw" bleed="right" index={1} caption={t.mediaCaption} />} />
      </PageSection>
      <PageSection tone="soft" density="standard" labelledBy="ra-features">
        <SplitContent ratio="4-8" align="start" text={<EditorialBlock id="ra-features" label={t.featuresLabel} heading={t.featuresHeading} />} media={<FeatureIndex items={t.features} label={t.featuresList} />} />
      </PageSection>
      <SectionProof id="ra-proof" tone="navy" label={t.proofLabel} heading={t.proofHeading} lead={t.proofLead} demo={t.proofDemo}>
        <MediaFrame kind="technical" src={asset.cycle.src} ratio={asset.cycle.ratio} aspect="16 / 10" position="50% 0%" alt={t.proofAlt} sizes="(min-width: 68rem) 62vw, 100vw" cartouche={t.proofCartouche} />
        <ProofFacts facts={t.proofFacts} />
      </SectionProof>
      <CtaPlaceholder label={t.ctaLabel} text={t.ctaText} button={t.ctaButton} />
    </>
  );
}

/* ───────────────────────── Rhythm B — operational ───────────────────────── */
export function RhythmB({ locale }: { locale: Locale }) {
  const t = rhythmCopy[locale].b;
  return (
    <>
      <SectionStatement id="rb-statement" tone="white" density="standard" index={1} label={t.statementLabel} statement={statement(t.statement)} support={t.support} />
      <PageSection tone="soft" density="standard" labelledBy="rb-info">
        <SplitContent ratio="5-7" text={<EditorialBlock id="rb-info" label={t.infoLabel} heading={t.infoHeading}>{paragraphs(t.infoBody)}</EditorialBlock>}
          media={<MetricComposition label={t.metricLabel} value={78} demo={t.metricDemo} note={t.metricNote} dimensions={t.dimensions} dimensionsLabel={t.dimensionsLabel} />} />
      </PageSection>
      <PageSection tone="white" density="standard" labelledBy="rb-field">
        <div style={{ display: 'grid', gap: 'var(--coro-v1-space-8)' }}>
          <EditorialBlock id="rb-field" label={t.fieldLabel} heading={t.fieldHeading} />
          <MediaFrame src={asset.stairs.src} ratio={asset.stairs.ratio} aspect="21 / 9" position="50% 40%" alt={t.fieldAlt} sizes="(min-width: 82rem) 1320px, 100vw" index={1} caption={t.fieldCaption} overlayLabel="Tour Prémont" />
        </div>
      </PageSection>
      <SectionProof id="rb-process" tone="navy" label={t.processLabel} heading={t.processHeading} lead={t.processLead}>
        <FeatureIndex items={t.process} layout="steps" label={t.processList} />
      </SectionProof>
      <PageSection tone="white" density="standard" labelledBy="rb-recovery">
        <SplitContent ratio="5-7" bleed="right" text={<EditorialBlock id="rb-recovery" label={t.recoveryLabel} heading={t.recoveryHeading} items={t.recoveryItems} cta={{ label: t.recoveryCta, href: '#page-rhythm' }}>{paragraphs(t.recoveryBody)}</EditorialBlock>}
          media={<MediaFrame src={asset.assembly.src} ratio={asset.assembly.ratio} aspect="4 / 3" position="40% 50%" alt="" sizes="(min-width: 68rem) 58vw, 100vw" bleed="right" />} />
      </PageSection>
    </>
  );
}

/* ───────────────────────── Rhythm C — technical ───────────────────────── */
export function RhythmC({ locale }: { locale: Locale }) {
  const t = rhythmCopy[locale].c;
  return (
    <>
      <PageSection tone="white" density="standard" labelledBy="rc-editorial">
        <SplitContent order="media-text" ratio="5-7" bleed="left" text={<EditorialBlock id="rc-editorial" label={t.editorialLabel} heading={t.editorialHeading} items={t.editorialItems}>{paragraphs(t.editorialBody)}</EditorialBlock>}
          media={<MediaFrame src={asset.desk.src} ratio={asset.desk.ratio} aspect="4 / 3" position="35% 50%" alt={t.deskAlt} sizes="(min-width: 68rem) 58vw, 100vw" bleed="left" index={1} caption={t.deskCaption} />} />
      </PageSection>
      <PageSection tone="paper" density="standard" labelledBy="rc-index">
        <SplitContent ratio="4-8" align="start" text={<EditorialBlock id="rc-index" label={t.indexLabel} heading={t.indexHeading} />} media={<FeatureIndex items={t.index} label={t.indexList} />} />
      </PageSection>
      <PageSection tone="white" density="standard" labelledBy="rc-plan">
        <SplitContent order="media-text" ratio="4-8" text={<EditorialBlock id="rc-plan" size="md" label={t.planLabel} heading={t.planHeading}>{paragraphs(t.planBody)}</EditorialBlock>}
          media={<MediaFrame kind="technical" src={asset.plan.src} ratio={asset.plan.ratio} alt={t.planAlt} sizes="(min-width: 68rem) 64vw, 100vw" cartouche={t.planCartouche} />} />
      </PageSection>
      <SectionProof id="rc-proof" tone="navy" label={t.proofLabel} heading={t.proofHeading} lead={t.proofLead} demo={t.proofDemo}>
        <ProofPairs title={t.proofTitle} demo={t.proofDemo} pairs={t.proofPairs} note={t.proofNote} label={t.proofLabelAria} />
      </SectionProof>
      <PageSection tone="white" density="standard" labelledBy="rc-faq">
        <SplitContent ratio="4-8" align="start" text={<EditorialBlock id="rc-faq" label={t.faqLabel} heading={t.faqHeading} />} media={<Accordion items={t.faq} defaultOpen={['q1']} label={t.faqList} />} />
      </PageSection>
    </>
  );
}

function CtaPlaceholder({ label, text, button }: { label: string; text: string; button: string }) {
  return (
    <PageSection tone="white" density="compact">
      <div className={styles.ctaPlaceholder}>
        <p className={styles.label}>{label}</p>
        <p className={styles.ctaText}>{text}</p>
        <Button href="#page-rhythm">{button}</Button>
      </div>
    </PageSection>
  );
}

/* ───────────────────────── Primitives ───────────────────────── */
function PrimBar({ locale, prim }: { locale: Locale; prim: { name: string; use: string; avoid: string } }) {
  const z = rhythmCopy[locale].zone;
  return (
    <div className={styles.primBar}>
      <Container>
        <code>{prim.name}</code>
        <span><b>{z.use}</b> {prim.use}</span>
        <span><b>{z.avoid}</b> {prim.avoid}</span>
      </Container>
    </div>
  );
}

function PrimitivesDemo({ locale }: { locale: Locale }) {
  const t = rhythmCopy[locale];
  const a = t.a; const b = t.b; const c = t.c;
  return (
    <>
      <PrimBar locale={locale} prim={t.prim.statement} />
      <SectionStatement id="pd-statement-light" tone="white" density="standard" index={1} label={a.statementLabel} statement={statement(a.statement)} support={a.support} />
      <SectionStatement id="pd-statement-dark" tone="navy" density="standard" index={2} label={b.statementLabel} statement={statement(b.statement)} support={b.support} />

      <PrimBar locale={locale} prim={t.prim.editorial} />
      <PageSection tone="white" density="standard" labelledBy="pd-split-1">
        <SplitContent ratio="5-7" text={<EditorialBlock id="pd-split-1" label={a.splitLabel} heading={a.splitHeading} items={a.splitItems} cta={{ label: a.splitCta, href: '#page-rhythm' }}>{paragraphs(a.splitBody)}</EditorialBlock>}
          media={<MediaFrame src={asset.entry.src} ratio={asset.entry.ratio} aspect="16 / 11" alt={a.mediaAlt} sizes="(min-width: 68rem) 58vw, 100vw" index={1} caption={a.mediaCaption} />} />
      </PageSection>
      <PageSection tone="soft" density="standard" labelledBy="pd-split-2">
        <SplitContent order="media-text" ratio="7-5" text={<EditorialBlock id="pd-split-2" size="md" label={c.editorialLabel} heading={c.editorialHeading}>{paragraphs(c.editorialBody)}</EditorialBlock>}
          media={<MediaFrame src={asset.desk.src} ratio={asset.desk.ratio} aspect="16 / 10" alt={c.deskAlt} sizes="(min-width: 68rem) 58vw, 100vw" caption={c.deskCaption} index={2} />} />
      </PageSection>

      <PrimBar locale={locale} prim={t.prim.media} />
      <PageSection tone="white" density="standard">
        <div className={styles.mediaPair}>
          <MediaFrame src={asset.stairs.src} ratio={asset.stairs.ratio} aspect="4 / 3" alt={b.fieldAlt} sizes="(min-width: 68rem) 56vw, 100vw" overlayLabel="Tour Prémont" caption={b.fieldCaption} index={1} />
          <MediaFrame kind="technical" src={asset.plan.src} ratio={asset.plan.ratio} aspect="4 / 3" alt={c.planAlt} sizes="(min-width: 68rem) 28vw, 100vw" cartouche={c.planCartouche} />
        </div>
      </PageSection>

      <PrimBar locale={locale} prim={t.prim.features} />
      <PageSection tone="paper" density="standard" labelledBy="pd-features">
        <SplitContent ratio="4-8" align="start" text={<EditorialBlock id="pd-features" label={a.featuresLabel} heading={a.featuresHeading} />} media={<FeatureIndex items={a.features} label={a.featuresList} />} />
      </PageSection>
      <PageSection tone="navy" density="standard" labelledBy="pd-sequence">
        <div style={{ display: 'grid', gap: 'var(--coro-v1-space-12)' }}>
          <EditorialBlock id="pd-sequence" label={b.processLabel} heading={b.processHeading} />
          <FeatureIndex items={b.process} layout="steps" label={b.processList} />
        </div>
      </PageSection>

      <PrimBar locale={locale} prim={t.prim.proof} />
      <SectionProof id="pd-proof" tone="navy" label={a.proofLabel} heading={a.proofHeading} lead={a.proofLead} demo={a.proofDemo}>
        <ProofRecord label="Traceability" title="Historique du document" demo="Démo" note="Démo" rows={[{ key: '12 sept. 2026', dateTime: '2026-09-12', text: 'V2.3 · Mise à jour des procédures' }, { key: '15 juin 2026', dateTime: '2026-06-15', text: 'V2.2 · Ajout des annexes' }, { key: '12 janv. 2026', dateTime: '2026-01-12', text: 'V2.0 · Version initiale' }]} />
      </SectionProof>

      <PrimBar locale={locale} prim={t.prim.metric} />
      <PageSection tone="soft" density="standard" labelledBy="pd-metric">
        <SplitContent ratio="5-7" text={<EditorialBlock id="pd-metric" label={b.infoLabel} heading={b.infoHeading}>{paragraphs(b.infoBody)}</EditorialBlock>}
          media={<MetricComposition label={b.metricLabel} value={78} demo={b.metricDemo} note={b.metricNote} dimensions={b.dimensions} dimensionsLabel={b.dimensionsLabel} />} />
      </PageSection>

      <PrimBar locale={locale} prim={t.prim.accordion} />
      <PageSection tone="white" density="standard" labelledBy="pd-faq">
        <SplitContent ratio="4-8" align="start" text={<EditorialBlock id="pd-faq" label={c.faqLabel} heading={c.faqHeading} />} media={<Accordion items={c.faq} defaultOpen={['q1']} label={c.faqList} />} />
      </PageSection>
    </>
  );
}

/* ───────────────────────── Zone 03 and isolated views ───────────────────────── */
type Study = 'a' | 'b' | 'c';
export const rhythmStudyKeys = ['rhythm-a', 'rhythm-b', 'rhythm-c'] as const;
export type RhythmStudyKey = (typeof rhythmStudyKeys)[number];

function HeroRef({ locale, study, name, tone }: { locale: Locale; study: Study; name: string; tone: 'white' | 'paper' | 'navy' }) {
  const z = rhythmCopy[locale].zone;
  return (
    <div className={styles.heroRef} data-tone={tone} data-surface={tone === 'navy' ? 'dark' : undefined}>
      <Container>
        <span className={styles.label}>{z.heroRef}</span>
        <b>{name}</b>
        <a href={localizedHref(`/design-lab?view=rhythm-${study}`, locale)}>{z.openView}</a>
      </Container>
    </div>
  );
}

function StudyHead({ name }: { name: string }) {
  return <div className={styles.studyBar} data-surface="dark"><Container><span className={styles.label}>{name}</span></Container></div>;
}

/** Zone 03: primitives, then three vertical rhythm studies (hero shown as a reference strip; full hero in the isolated view). */
export function PageRhythmZone({ locale }: { locale: Locale }) {
  const t = rhythmCopy[locale];
  return (
    <section id="page-rhythm" className={styles.zone} aria-labelledby="page-rhythm-title">
      <Container><header className={styles.zoneHead}><span>03</span><h2 id="page-rhythm-title">{t.zone.title}</h2></header></Container>
      <div className={styles.band} data-tone="white"><Container><div className={styles.block}><p className={styles.blockLead}>{t.zone.lead}</p><p className={styles.note}>{t.zone.rule}</p></div><div className={styles.familyRule}><p className={styles.label}>{t.zone.surfaceRule}</p><dl>{t.zone.families.map(([name, text]) => <div key={name}><dt className={styles.label}>{name}</dt><dd>{text}</dd></div>)}</dl></div></Container></div>

      <div className={styles.study} id="primitives"><StudyHead name={t.zone.primitives} /><PrimitivesDemo locale={locale} /></div>

      <div className={styles.study} id="rhythm-a"><StudyHead name={`${t.zone.studies} · A — ${t.a.heroName}`} /><HeroRef locale={locale} study="a" name={t.a.heroName} tone="white" /><RhythmA locale={locale} /></div>
      <div className={styles.study} id="rhythm-b"><StudyHead name={`${t.zone.studies} · B — ${t.b.heroName}`} /><HeroRef locale={locale} study="b" name={t.b.heroName} tone="navy" /><RhythmB locale={locale} /></div>
      <div className={styles.study} id="rhythm-c"><StudyHead name={`${t.zone.studies} · C — ${t.c.heroName}`} /><HeroRef locale={locale} study="c" name={t.c.heroName} tone="paper" /><RhythmC locale={locale} /></div>
    </section>
  );
}

/** Chromeless full page: real header, real approved hero, then the rhythm. For responsive QA. */
export function RhythmView({ locale, study }: { locale: Locale; study: Study }) {
  const h = heroStudies[locale];
  const tone: SiteHeaderTone = study === 'b' ? 'dark' : 'light';
  let hero: ReactNode;
  let rhythm: ReactNode;
  if (study === 'a') {
    hero = <HeroSignature heading="h1" copy={h.a2.copy} mediaAlt={h.a2.mediaAlt} caption={h.a2.caption} datum={h.a2.datum} annotations={h.a2.annotations} annotationsLabel={h.a2.annotationsLabel} />;
    rhythm = <RhythmA locale={locale} />;
  } else if (study === 'b') {
    hero = <HeroOperational heading="h1" copy={h.b.copy} mediaAlt={h.b.mediaAlt} panel={h.b.panel} />;
    rhythm = <RhythmB locale={locale} />;
  } else {
    hero = <HeroTechnical heading="h1" copy={h.c.copy} mediaAlt={h.c.mediaAlt} references={h.c.references} referencesLabel={h.c.referencesLabel} titleBlock={h.c.titleBlock} inset={h.c.inset} />;
    rhythm = <RhythmC locale={locale} />;
  }
  return (
    <div data-design-lab data-coro-system="v1" className={styles.stage}>
      <SiteHeader locale={locale} pathname={`/design-lab?view=rhythm-${study}`} tone={tone} />
      <main id="lab-main">{hero}{rhythm}</main>
    </div>
  );
}
