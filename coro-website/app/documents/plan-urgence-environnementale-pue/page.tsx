import type { Metadata } from 'next';
import { CTASection } from '@/components/conversion/CTASection';
import { Accordion } from '@/components/page/Accordion';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { EditorialHero } from '@/components/page/EditorialHero';
import { PageSection } from '@/components/page/PageSection';
import { V2Shell } from '@/components/site/V2Shell';
import { Button } from '@/components/ui/Button';
import { faqJsonLd } from '@/lib/site/json-ld';
import { localeFromSearchParams, localizedHref } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/**
 * /documents/plan-urgence-environnementale-pue (MIG-05G) — sixth and final document guide migrated to V2. Built to
 * final editorial and visual quality on this first pass (method confirmed by PGC/PRA). Editorial guide first, CORO
 * roadmap context second. Authority: docs/website-v2/05-migration/MIG-05-GUIDES-GATE.md (MIG-05G section — full
 * preservation matrix, RUE/E2 regulatory claim table, hero audit, publication-blocker closure).
 * LANGUAGE: FR ONLY (englishAvailable={false}) — the V1 page had no searchParams handling at all (?lang=en rendered
 * the identical French page, confirmed in the baseline); no translation is invented here.
 * PUBLICATION-BLOCKER PUE-01 (identified MIG-05-PRE) — RESOLVED BY REMOVAL: V1's hero CTA "Générer votre PUE avec
 * CORO" and body claim "CORO... génère les sections réglementaires du PUE" directly contradicted V1's own Phase-2
 * banner. Both REMOVED. PUE production in CORO is Phase 2 — stated explicitly in §09, never implied elsewhere.
 * REGULATORY AUDIT (verified against current official sources during MIG-05G, see the gate's claim table):
 * Règlement sur les urgences environnementales (2019), DORS/2019-51, VERIFIED — published in the Canada Gazette
 * March 6 2019, in force August 24 2019 (Justice Laws Website, consolidated text, 200 confirmed — replaces V1's dead
 * pollution-dechets.canada.ca link). Schedule 1 = 249 substances across six hazard categories, VERIFIED (ECCC
 * regulatory overview). Applicability is CONDITIONAL (substance + quantity/threshold + other regulatory conditions)
 * — never simplified to "listed substance = regulated"; V1's own phrasing already avoided this but is further
 * refined here. LCPE Part 8 notification: VERIFIED as conditional on the release having/could-have a harmful
 * effect, not an unqualified "any release" — V1's "avisé immédiatement" is REFINED to remove the unverified
 * "immédiatement" adverb. Exercise requirement VERIFIED and PRESERVED ACCURATELY (unlike PMU/PSI/PCA/PRA, this is a
 * real regulatory frequency, not an unsupported number): an annual administrative simulation, plus one full-scale
 * simulation within a five-year cycle (ECCC publications). canada.ca (ECCC E2 program page) could not be re-verified
 * live during this pass — general domain-level connectivity failure in this environment (homepage itself timed
 * out), not a 404; recorded as BLOCKED-BUT-KNOWN rather than removed.
 * PRODUCT/CLIENT SAFETY: no client-specific values (no Sobeys/Lassonde/Rougemont/Prémont, no NH3 quantities, no
 * 2.6 km, no ERPG/AEGL) appear anywhere on this page — verified by review. No fake impact-zone map, plume, radius or
 * population count is created; §04's "Protéger" navy composition is a conceptual territory field, never a map.
 * HERO: the prepared illustration is the most visually elaborate in the family — it includes a fictional on-screen
 * "Scénario" map with qualitative colour-coded zone rings and a visible "AMMONIAC" tank placard. This was audited
 * specifically for misleading-technical-content risk (per the gate's heightened hero-risk note): no CORO branding,
 * no numeric distance/concentration/population values, no real facility identification, no CORO UI. Classified
 * EDITORIAL / MARKETING ILLUSTRATION, decorative (alt=""), image not modified. NO fact, zone, category, quantity or
 * substance identity on this page is derived from what is drawn in it — including the pictured "AMMONIAC" label and
 * the pictured zone legend, neither of which appears anywhere in this page's copy.
 * VISUAL SIGNATURE (Guide family rule confirmed by PMU + PSI + PCA + PGC + PRA — do not clone any): PUE's own three
 * moments are (1) a "Protéger" typographic moment beside a Substance/Scénario/Conséquence three-territory
 * composition (conceptual relationship, no arrows, no numeric values); (2) a navy composition with one dominant
 * central field ("Protéger") surrounded by four source-supported protected interests in a perimeter arrangement —
 * no map, no rings, no distance; (3) a two-band exercise section distinguishing the verified annual vs five-year
 * full-scale simulation requirement.
 * RESOURCES: OMITTED. No strong PUE-specific blog article exists in the current published inventory (searched
 * during MIG-05G) — recorded as an editorial gap, not a silent omission.
 */
const copy = {
  metaTitle: 'Plan d’urgence environnementale (PUE) : RUE/E2, applicabilité, contenu',
  description: 'Qu’est-ce qu’un plan d’urgence environnementale, le Règlement sur les urgences environnementales (RUE/E2), l’applicabilité conditionnelle, le contenu du plan et les exercices requis.',
  label: 'Guide', code: 'PUE',
  lines: ['Plan d’urgence', 'environnementale (PUE).'],
  lead: 'Le plan d’urgence environnementale définit les mesures de prévention et d’intervention en cas d’incident environnemental impliquant des substances dangereuses. Au Canada, le cadre de référence est le Règlement sur les urgences environnementales (2019).',
  read: 'Lire le guide', guides: 'Voir tous les guides',
  s1: { n: '01', label: 'Qu’est-ce qu’un PUE', title: 'Le document qui prépare l’organisation à un incident environnemental.',
    text: 'Le PUE définit les mesures de prévention, de préparation, d’intervention et de rétablissement applicables en cas d’incident environnemental impliquant des substances dangereuses. Au Canada, le Règlement sur les urgences environnementales (2019) — DORS/2019-51, pris en vertu de la Loi canadienne sur la protection de l’environnement (1999), en vigueur depuis le 24 août 2019, encadre les installations visées.' },
  s2: { n: '02', label: 'Applicabilité', title: 'Une évaluation conditionnelle, pas un critère unique.',
    text: 'Une installation peut être assujettie au Règlement lorsqu’elle possède une substance figurant à l’annexe 1, ou en a l’autorité, à des concentrations et quantités égales ou supérieures aux seuils prévus, et que les autres conditions réglementaires applicables sont remplies. L’évaluation doit se faire à partir de l’inventaire réel de l’installation, pas d’une catégorie d’industrie.',
    conditions: [
      ['Substance listée', 'La substance figure à l’annexe 1 du Règlement, qui comprend 249 substances réparties en six catégories de danger (toxicité en milieu aquatique, combustible, danger d’explosion, danger de feu en nappe, danger en cas d’inhalation, oxydant pouvant exploser).'],
      ['Quantité et seuil', 'La concentration et la quantité présentes sont égales ou supérieures au seuil défini pour cette substance.'],
      ['Situation réglementaire', 'Les obligations varient selon que l’installation est en situation de déclaration seulement ou de planification complète.'],
    ] as const },
  s3: { n: '03', label: 'Substance, scénario, conséquence', statement: 'Protéger',
    support: 'Le PUE existe pour préparer l’organisation à protéger les personnes, l’environnement et les activités face à un incident environnemental.',
    triad: [
      { title: 'Substance', text: 'Quelle matière dangereuse présente sur le site est visée par le Règlement.' },
      { title: 'Scénario', text: 'Quel événement environnemental est envisagé pour cette substance.' },
      { title: 'Conséquence', text: 'Quelles personnes, quels milieux ou quelles infrastructures pourraient être touchés.' },
    ] as const },
  s4: { n: '04', label: 'Ce que le PUE protège', title: 'Une organisation, pas une zone calculée.',
    text: 'Le PUE structure la préparation autour de plusieurs intérêts à protéger, sans prétendre calculer une zone d’impact précise — cette évaluation relève de l’analyse propre à chaque installation.',
    interests: [
      ['Population', 'Les personnes susceptibles d’être touchées, selon le scénario envisagé.'],
      ['Environnement', 'Les milieux naturels pouvant subir un effet nocif en cas de rejet.'],
      ['Installation', 'Le site, ses systèmes et son personnel.'],
      ['Intervenants', 'Les autorités et services d’intervention concernés.'],
    ] as const },
  s5: { n: '05', label: 'Contenu d’un PUE complet', title: 'Ce qu’un plan structure.',
    items: [
      ['Inventaire des substances', 'Les substances dangereuses présentes sur le site et leurs fiches de données de sécurité (FDS).'],
      ['Scénarios d’incident', 'L’identification des risques et des scénarios d’accidents potentiels.'],
      ['Prévention et confinement', 'Les mesures prévues pour prévenir un rejet ou en limiter la portée.'],
      ['Notification aux autorités', 'Les procédures pour aviser les autorités désignées.'],
      ['Responsabilités', 'Les rôles en cas d’intervention.'],
      ['Équipements de réponse', 'Les équipements disponibles pour intervenir.'],
      ['Décontamination et remédiation', 'Les mesures prévues pour restaurer le site et l’environnement affecté.'],
    ] as const },
  s6: { n: '06', label: 'Notification et matières dangereuses', title: 'Aviser les autorités, documenter les substances.',
    blocks: [
      ['Notification', 'En vertu de la LCPE, un rejet ayant ou pouvant avoir un effet nocif sur l’environnement doit faire l’objet d’un avis transmis aux autorités désignées, dont la Division des urgences environnementales d’Environnement et Changement climatique Canada.'],
      ['SIMDUT et REPTOX', 'Le SIMDUT exige des fiches de données de sécurité (FDS) pour les matières dangereuses utilisées au travail. Au Québec, le répertoire REPTOX de l’IRSST fournit les informations toxicologiques correspondantes.'],
    ] as const },
  s7: { n: '07', label: 'Exercices', title: 'Deux types d’exercices, deux fréquences.',
    exercises: [
      { name: 'Simulation annuelle', freq: 'Chaque année', text: 'Un exercice de nature administrative, tenu chaque année.' },
      { name: 'Simulation à grande échelle', freq: 'Cycle de cinq ans', text: 'Un exercice basé sur l’action, avec déploiement de personnel, de ressources et d’équipement, requis au moins une fois par cycle de cinq ans.' },
    ] as const },
  s8: { n: '08', label: 'PUE et PMU', title: 'Lié à l’urgence, pas toujours distinct.',
    text: 'Le PUE peut être intégré au PMU comme procédure propre aux incidents environnementaux, ou constituer un document distinct selon le contexte réglementaire et organisationnel de l’installation.',
    link: 'Consulter le guide du PMU' },
  s9: { n: '09', label: 'PUE dans CORO', title: 'Le PUE dans CORO : une capacité prévue en phase 2.',
    facts: [
      { label: 'Guide', text: 'Disponible dès aujourd’hui, sur cette page.' },
      { label: 'Production dans CORO', text: 'Guide disponible · Production CORO prévue en phase 2. CORO Documents prend actuellement en charge le PMU, le PSI et le PCA.' },
    ] as const,
    cta: 'Voir les documents disponibles aujourd’hui' },
  faq: 'Questions fréquentes', faqLabel: 'FAQ',
  faqItems: [
    { q: 'Mon installation est-elle assujettie au Règlement?', a: 'Une installation peut être assujettie lorsqu’elle possède une substance figurant à l’annexe 1 à des concentrations et quantités égales ou supérieures aux seuils définis, et que les autres critères réglementaires sont remplis. L’assujettissement doit être évalué à partir de l’inventaire réel de l’installation.' },
    { q: 'Que faire en cas de rejet accidentel?', a: 'En vertu de la LCPE, un rejet ayant ou pouvant avoir un effet nocif doit faire l’objet d’un avis aux autorités désignées, dont la Division des urgences environnementales d’Environnement et Changement climatique Canada.' },
    { q: 'Qu’est-ce qu’une fiche de données de sécurité (FDS)?', a: 'La FDS est un document standardisé décrivant les propriétés d’une substance chimique, ses risques et les mesures de sécurité. Le SIMDUT exige des FDS pour les matières dangereuses utilisées au travail.' },
    { q: 'Le PUE est-il relié au PMU?', a: 'Oui. Le PUE peut être intégré au PMU comme procédure propre aux incidents environnementaux, ou constituer un document distinct selon le contexte réglementaire et organisationnel de l’installation.' },
  ],
  statement: 'Le PUE prépare l’organisation à protéger, pas à improviser.',
  support: 'Parlons de votre contexte d’urgence environnementale et de la place du PUE dans votre stratégie de préparation.',
};

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/documents/plan-urgence-environnementale-pue', locale: l, hasEnglish: false, title: copy.metaTitle, description: copy.description });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = copy;
  const demo = localizedHref('/#demo', l);
  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://getcoro.io' },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://getcoro.io/guides' },
      { '@type': 'ListItem', position: 3, name: t.code, item: 'https://getcoro.io/documents/plan-urgence-environnementale-pue' },
    ],
  };
  return (
    <V2Shell locale={l} pathname="/documents/plan-urgence-environnementale-pue" englishAvailable={false}>
      <JsonLd value={faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))} />
      <JsonLd value={breadcrumbLd} />

      <EditorialHero id="pue-title" label={`${t.label} · ${t.code}`} title={t.lines} lead={t.lead}
        photo={{ src: '/website-v2/guides/guide-pue-environmental-emergency.webp', side: 'end', position: '50% 40%', mobilePosition: '50% 32%', coverage: 55, mobileRatio: '16 / 11' }}
        actions={<><Button href="#s1" surface="dark">{t.read}</Button><Button href={localizedHref('/guides', l)} variant="ghost" surface="dark">{t.guides}</Button></>} />

      <PageSection tone="white" density="compact" id="s1" labelledBy="pue-s1-title">
        <EditorialBlock id="pue-s1-title" label={`${t.s1.n} — ${t.s1.label}`} heading={t.s1.title}><p>{t.s1.text}</p></EditorialBlock>
      </PageSection>

      <PageSection tone="soft" labelledBy="pue-s2-title">
        <div className={styles.conditionsWrap}>
          <EditorialBlock id="pue-s2-title" label={`${t.s2.n} — ${t.s2.label}`} heading={t.s2.title}><p>{t.s2.text}</p></EditorialBlock>
          <ul className={styles.conditions} aria-label={t.s2.title}>{t.s2.conditions.map(([name, text]) => <li key={name} className={styles.condition}><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="pue-s3-title">
        <div className={styles.stack}>
          <EditorialBlock id="pue-s3-title" label={`${t.s3.n} — ${t.s3.label}`} heading="Substance, scénario, conséquence." />
          <div className={styles.protectWrap}>
            <div>
              <p className={styles.protectWord}>{t.s3.statement}</p>
              <p className={styles.protectSupport}>{t.s3.support}</p>
            </div>
            <ul className={styles.triad}>{t.s3.triad.map((item) => <li key={item.title} className={styles.triadItem}><h3>{item.title}</h3><p>{item.text}</p></li>)}</ul>
          </div>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="pue-s4-title">
        <div className={styles.stack}>
          <EditorialBlock id="pue-s4-title" label={`${t.s4.n} — ${t.s4.label}`} heading={t.s4.title}><p>{t.s4.text}</p></EditorialBlock>
          <div className={styles.territoryField}>
            <div className={styles.territoryCentral}><p>Protéger</p><p>Intérêt central de la préparation aux urgences environnementales.</p></div>
            <ul className={styles.perimeter} aria-label={t.s4.title}>{t.s4.interests.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ul>
          </div>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="pue-s5-title">
        <div className={styles.stack}>
          <EditorialBlock id="pue-s5-title" label={`${t.s5.n} — ${t.s5.label}`} heading={t.s5.title} />
          <ul className={styles.rows}>{t.s5.items.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="soft" density="compact" labelledBy="pue-s6-title">
        <div className={styles.stack}>
          <EditorialBlock id="pue-s6-title" label={`${t.s6.n} — ${t.s6.label}`} heading={t.s6.title} />
          <ul className={`${styles.rows} ${styles.pair}`}>{t.s6.blocks.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="pue-s7-title">
        <div className={styles.stack}>
          <EditorialBlock id="pue-s7-title" label={`${t.s7.n} — ${t.s7.label}`} heading={t.s7.title} />
          <ul className={styles.exerciseBands}>{t.s7.exercises.map((ex) => <li key={ex.name} className={styles.exerciseBand}><p className={styles.exerciseFreq}>{ex.freq}</p><h3>{ex.name}</h3><p>{ex.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="soft" density="compact" labelledBy="pue-s8-title">
        <div className={styles.stack}>
          <EditorialBlock id="pue-s8-title" label={`${t.s8.n} — ${t.s8.label}`} heading={t.s8.title}><p>{t.s8.text}</p></EditorialBlock>
          <div className={styles.linkCard}><a className={styles.linkCardLink} href={localizedHref('/documents/plan-mesures-urgence-pmu', l)}>{t.s8.link}<span aria-hidden="true"> →</span></a></div>
        </div>
      </PageSection>

      <PageSection tone="white" density="compact" labelledBy="pue-s9-title">
        <div className={styles.stack}>
          <EditorialBlock id="pue-s9-title" label={`${t.s9.n} — ${t.s9.label}`} heading={t.s9.title} />
          <ul className={styles.phaseWrap}>{t.s9.facts.map((f) => <li key={f.label}><h3>{f.label}</h3><p>{f.text}</p></li>)}</ul>
          <div className={styles.linkCard}><a className={styles.linkCardLink} href={localizedHref('/gestion-documentaire', l)}>{t.s9.cta}<span aria-hidden="true"> →</span></a></div>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="pue-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="pue-faq-title" label={t.faqLabel} heading={t.faq} />
          <Accordion label={t.faq} items={t.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="pue-cta-title" tone="dark" label={`${t.label} · ${t.code}`} statement={t.statement} support={t.support} primary={{ label: 'Demander une démonstration', href: demo }} secondary={{ label: t.guides, href: localizedHref('/guides', l) }} />
    </V2Shell>
  );
}
