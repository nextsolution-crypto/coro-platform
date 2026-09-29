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
 * /documents/plan-gestion-crise-pgc (MIG-05E) — fourth of six document guides migrated to V2. Built to final editorial
 * and visual quality on this first pass (family lesson from PMU/PSI/PCA, each of which needed a later density/character
 * pass — see MIG-05B-B/MIG-05C-B/MIG-05D-B in the gate). Editorial guide first, CORO roadmap context second.
 * Authority: docs/website-v2/05-migration/MIG-05-GUIDES-GATE.md (PGC preservation matrix and normative matrix,
 * MIG-05E section).
 * LANGUAGE: FR ONLY (englishAvailable={false}) — the V1 page had no searchParams handling at all (?lang=en rendered the
 * identical French page, confirmed in the baseline); no translation is invented here.
 * PRODUCT BOUNDARY — CRITICAL: PGC production in CORO is PHASE 2, unlike PMU/PSI/PCA. This page never says "disponible
 * dans CORO", "Générer votre PGC" or "Produire votre PGC dans CORO" — that exact overclaim existed in V1's hero CTA
 * ("Structurer votre PGC avec CORO"), directly contradicting V1's own Phase-2 banner one row below it. REMOVED. The
 * only current claim is that the GUIDE is available today; CORO production is explicitly "prévue en phase 2".
 * NORMATIVE AUDIT (verified during MIG-05E, see the gate's matrix): ISO 22361:2022 (Sécurité et résilience — Gestion de
 * crise — Lignes directrices) VERIFIED as guidance for top management on strategic crisis-management capability,
 * decision-making and crisis leadership (iso.org blocks scripted link checks with a 403 — not a dead link, a bot
 * protection; the standard's existence and scope are independently confirmed via secondary institutional sources).
 * ISO 22301:2019 is REMOVED from this page's sources — it is PCA's standard (already covered on the PCA guide) and V1
 * never actually referenced it in body text, only in the source list, which was confusing cross-listing. The
 * Government of Canada Emergency Management Framework link is VERIFIED (200) and kept. The V1 claims "révisé
 * annuellement" and "exercices... tous les 12 à 18 mois" are REMOVED — no primary source (including the ISO 22361 scope
 * itself) confirms a fixed review/exercise frequency; same family lesson already applied to PMU/PSI/PCA. No crisis
 * level/tier, no escalation threshold, no response time, and no ICS/SCI-style command-chain role is invented anywhere
 * on this page — the crisis-cell composition (§4) is presented as typical FUNCTIONS, not an organizational hierarchy.
 * HERO: the prepared illustration is busier than PMU/PSI/PCA's heroes (a multi-panel "crisis-room" dashboard with
 * weather radar, site-status indicators and a hand-lettered whiteboard action plan). Audited specifically for whether
 * it could be mistaken for live CORO software: no CORO logo, no real product UI, generic fictional site codes and a
 * visibly staged whiteboard — read as stylized editorial illustration, not a screenshot. Classified EDITORIAL /
 * MARKETING ILLUSTRATION, decorative (alt=""), image not modified. No fact, category or label on this page is derived
 * from what is drawn in it — including where the illustration coincidentally displays words ("DÉCIDER", "COORDONNER")
 * that also appear in this page's own copy: those words come from the verified V1 text and the independently-confirmed
 * ISO 22361 scope, never from the image.
 * VISUAL SIGNATURE (Guide family rule confirmed by PMU + PSI + PCA — do not clone any): PGC's own three moments are
 * (1) a "DÉCIDER" typographic anchor with three qualifiers drawn verbatim from the guide's own definition sentence;
 * (2) a five-function crisis-cell matrix (no connecting lines, no invented hierarchy, framed as typical/example only);
 * (3) a navy strategic composition as three full-width ruled bands (Décision / Communication / Coordination) — a
 * horizontal-band shape, deliberately distinct from PSI's columns and PCA's five-column grid.
 * RESOURCES: OMITTED. No strong PGC/crisis-management-specific blog article exists in the current published inventory
 * (searched during MIG-05E) — reusing PMU/PCA articles merely to fill the section was explicitly out of scope. This is
 * a recorded editorial gap, not a silent omission (see the gate's MIG-05E section).
 */
const copy = {
  metaTitle: 'Plan de gestion de crise (PGC) : cellule de crise, communication, ISO 22361',
  description: 'Qu’est-ce qu’un plan de gestion de crise, la différence avec une urgence, la cellule de crise, la communication de crise et les lignes directrices ISO 22361.',
  label: 'Guide', code: 'PGC',
  lines: ['Plan de gestion', 'de crise (PGC).'],
  lead: 'Le plan de gestion de crise définit les protocoles de décision, de communication et d’intervention lors de situations affectant gravement l’organisation : crise médiatique, cyberattaque, incident majeur, ou toute situation à fort impact réputationnel ou opérationnel.',
  read: 'Lire le guide', guides: 'Voir tous les guides',
  s1: { n: '01', label: 'Qu’est-ce qu’un PGC', title: 'Le cadre décisionnel d’une organisation en crise.',
    text: 'Le PGC est un cadre décisionnel qui permet à une organisation de réagir rapidement et de façon coordonnée lors d’une crise. Il définit qui décide quoi, comment communiquer en interne et en externe, et comment minimiser l’impact sur les opérations et la réputation. La norme ISO 22361:2022 — Gestion de crise fournit des lignes directrices sur les principes et le cadre de la gestion de crise, destinées aux dirigeants responsables de cette capacité.' },
  s2: { n: '02', label: 'Urgence et crise', title: 'Deux notions liées, pas identiques.',
    text: 'Ces deux situations peuvent survenir simultanément et nécessitent des plans distincts mais complémentaires.',
    comparison: [
      { code: 'Urgence', text: 'Affecte principalement la sécurité physique des personnes (incendie, accident) et nécessite un PMU ou un PSI.' },
      { code: 'Crise', text: 'Affecte la réputation, la viabilité ou la confiance envers l’organisation, et nécessite un PGC.' },
    ] as const },
  s3: { n: '03', label: 'Décider en situation de crise', title: 'Le PGC existe pour une chose : décider.',
    qualifiers: [
      'Rapidement',
      'De façon coordonnée',
      'En limitant l’impact sur les opérations et la réputation',
    ] as const },
  s4: { n: '04', label: 'La cellule de crise', title: 'Des fonctions désignées, pas une improvisation.',
    text: 'Typiquement, la cellule de crise réunit ces fonctions — la composition exacte varie selon l’organisation et le type de crise.',
    functions: [
      ['Direction', 'La direction générale ou la présidence, responsable des décisions finales.'],
      ['Communications', 'Le responsable des communications, porte-parole et gestion des messages.'],
      ['Juridique', 'Le conseiller juridique, pour évaluer les implications légales des décisions.'],
      ['Ressources humaines', 'Le directeur des ressources humaines, pour les enjeux touchant le personnel.'],
      ['Opérations', 'Les responsables opérationnels concernés selon le type de crise.'],
    ] as const },
  s5: { n: '05', label: 'Trois volets stratégiques', title: 'Ce que le PGC structure.',
    text: 'Ces volets sont liés, pas séquentiels : une crise peut exiger de décider, communiquer et coordonner en parallèle.',
    bands: [
      { title: 'Décision', text: 'Qui décide quoi : les procédures d’escalade décisionnelle et les scénarios préétablis pour les types de crise les plus probables selon l’analyse de risque de l’organisation.' },
      { title: 'Communication', text: 'Les porte-paroles autorisés, les messages clés par scénario, les canaux prioritaires et les protocoles de validation avant diffusion, en interne comme en externe.' },
      { title: 'Coordination', text: 'Les déclencheurs d’activation du plan et la mobilisation de la cellule de crise pour agir de façon coordonnée.' },
    ] as const },
  s6: { n: '06', label: 'Communication de crise', title: 'Au cœur de la gestion de crise.',
    text: 'Une mauvaise communication de crise peut aggraver significativement l’impact d’un incident. Le PGC définit les audiences à considérer selon le scénario :',
    audiences: [
      ['Autorités', 'Les autorités compétentes selon la nature de la crise.'],
      ['Médias', 'Les médias, via les porte-paroles autorisés et les messages validés.'],
      ['Employés', 'La communication interne, souvent prioritaire pour maintenir la cohésion.'],
      ['Parties prenantes', 'Clients, partenaires et autres parties prenantes selon le scénario.'],
    ] as const },
  s7: { n: '07', label: 'Exercices et révision', title: 'Un plan qui reste utilisable.',
    blocks: [
      ['Exercices', 'Des exercices de simulation (tabletop exercises) sont recommandés pour tester la réactivité de la cellule de crise et identifier les lacunes du plan.'],
      ['Révision', 'Le PGC est révisé après chaque activation réelle et chaque fois qu’un changement significatif affecte l’organisation.'],
    ] as const },
  s8: { n: '08', label: 'PGC, PMU et PCA', title: 'Trois plans complémentaires, pas une hiérarchie unique.',
    relations: [
      { code: 'PMU', text: 'Agir face à l’urgence.' },
      { code: 'PGC', text: 'Gouverner la crise.' },
      { code: 'PCA', text: 'Maintenir les activités critiques.' },
    ] as const },
  s9: { n: '09', label: 'PGC dans CORO', title: 'Le PGC dans CORO : une capacité prévue en phase 2.',
    facts: [
      { label: 'Guide', text: 'Disponible dès aujourd’hui, sur cette page.' },
      { label: 'Production dans CORO', text: 'Guide disponible · Production CORO prévue en phase 2.' },
    ] as const,
    cta: 'Voir les documents disponibles aujourd’hui' },
  faq: 'Questions fréquentes', faqLabel: 'FAQ',
  faqItems: [
    { q: 'Toutes les organisations ont-elles besoin d’un PGC?', a: 'Toute organisation exposée à des risques réputationnels, médiatiques, cybernétiques ou opérationnels majeurs devrait avoir un PGC. La taille n’est pas le critère principal — c’est l’exposition au risque.' },
    { q: 'Qui fait partie de la cellule de crise?', a: 'Typiquement : la direction générale, le responsable des communications, le conseiller juridique, le directeur des ressources humaines et les responsables opérationnels concernés selon le type de crise.' },
    { q: 'Le PGC est-il relié au PCA?', a: 'Oui. Le PGC gère la dimension décisionnelle et communicationnelle, tandis que le PCA assure la continuité opérationnelle. Les deux fonctionnent en parallèle lors d’une crise majeure.' },
    { q: 'Comment tester un PGC?', a: 'Par des exercices tabletop : simulation d’un scénario de crise avec la cellule de crise pour tester les réflexes, les outils et les communications. Ces exercices doivent être documentés.' },
  ],
  statement: 'Le PGC relie la décision, la communication et la coordination.',
  support: 'Parlons de votre environnement de gestion de crise et de la place du PGC dans votre stratégie de résilience.',
};

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/documents/plan-gestion-crise-pgc', locale: l, hasEnglish: false, title: copy.metaTitle, description: copy.description });
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
      { '@type': 'ListItem', position: 3, name: t.code, item: 'https://getcoro.io/documents/plan-gestion-crise-pgc' },
    ],
  };
  return (
    <V2Shell locale={l} pathname="/documents/plan-gestion-crise-pgc" englishAvailable={false}>
      <JsonLd value={faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))} />
      <JsonLd value={breadcrumbLd} />

      <EditorialHero id="pgc-title" label={`${t.label} · ${t.code}`} title={t.lines} lead={t.lead}
        photo={{ src: '/website-v2/guides/guide-pgc-crisis-management.webp', side: 'end', position: '50% 35%', mobilePosition: '50% 30%', coverage: 55, mobileRatio: '16 / 11' }}
        actions={<><Button href="#s1" surface="dark">{t.read}</Button><Button href={localizedHref('/guides', l)} variant="ghost" surface="dark">{t.guides}</Button></>} />

      <PageSection tone="white" density="compact" id="s1" labelledBy="pgc-s1-title">
        <EditorialBlock id="pgc-s1-title" label={`${t.s1.n} — ${t.s1.label}`} heading={t.s1.title}><p>{t.s1.text}</p></EditorialBlock>
      </PageSection>

      <PageSection tone="soft" labelledBy="pgc-s2-title">
        <div className={styles.stack}>
          <EditorialBlock id="pgc-s2-title" label={`${t.s2.n} — ${t.s2.label}`} heading={t.s2.title}><p>{t.s2.text}</p></EditorialBlock>
          <ul className={styles.comparison}>{t.s2.comparison.map((item) => <li key={item.code}><h3>{item.code}</h3><p>{item.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="pgc-s3-title">
        <div className={styles.stack}>
          <EditorialBlock id="pgc-s3-title" label={`${t.s3.n} — ${t.s3.label}`} heading={t.s3.title} />
          <div className={styles.decideWrap}>
            <p className={styles.decideWord}>Décider</p>
            <ul className={styles.qualifiers}>{t.s3.qualifiers.map((q) => <li key={q}>{q}</li>)}</ul>
          </div>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="pgc-s4-title">
        <div className={styles.stack}>
          <EditorialBlock id="pgc-s4-title" label={`${t.s4.n} — ${t.s4.label}`} heading={t.s4.title}><p>{t.s4.text}</p></EditorialBlock>
          <ul className={styles.functions}>{t.s4.functions.map(([name, text]) => <li key={name} className={styles.functionCell}><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="pgc-s5-title">
        <div className={styles.stack}>
          <EditorialBlock id="pgc-s5-title" label={`${t.s5.n} — ${t.s5.label}`} heading={t.s5.title}><p>{t.s5.text}</p></EditorialBlock>
          <ul className={styles.bands} aria-label={t.s5.title}>{t.s5.bands.map((item) => <li key={item.title} className={styles.band}><h3>{item.title}</h3><p>{item.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="pgc-s6-title">
        <div className={styles.stack}>
          <EditorialBlock id="pgc-s6-title" label={`${t.s6.n} — ${t.s6.label}`} heading={t.s6.title}><p>{t.s6.text}</p></EditorialBlock>
          <ul className={styles.audiences}>{t.s6.audiences.map(([name, text]) => <li key={name} className={styles.audience}><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="soft" density="compact" labelledBy="pgc-s7-title">
        <div className={styles.stack}>
          <EditorialBlock id="pgc-s7-title" label={`${t.s7.n} — ${t.s7.label}`} heading={t.s7.title} />
          <ul className={`${styles.rows} ${styles.pair}`}>{t.s7.blocks.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" density="compact" labelledBy="pgc-s8-title">
        <div className={styles.stack}>
          <EditorialBlock id="pgc-s8-title" label={`${t.s8.n} — ${t.s8.label}`} heading={t.s8.title} />
          <ul className={styles.relations}>{t.s8.relations.map((r) => <li key={r.code} className={styles.relation}><h3>{r.code}</h3><p>{r.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="soft" density="compact" labelledBy="pgc-s9-title">
        <div className={styles.stack}>
          <EditorialBlock id="pgc-s9-title" label={`${t.s9.n} — ${t.s9.label}`} heading={t.s9.title} />
          <ul className={styles.phaseWrap}>{t.s9.facts.map((f) => <li key={f.label}><h3>{f.label}</h3><p>{f.text}</p></li>)}</ul>
          <div className={styles.linkCard}><a className={styles.linkCardLink} href={localizedHref('/gestion-documentaire', l)}>{t.s9.cta}<span aria-hidden="true"> →</span></a></div>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="pgc-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="pgc-faq-title" label={t.faqLabel} heading={t.faq} />
          <Accordion label={t.faq} items={t.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="pgc-cta-title" tone="dark" label={`${t.label} · ${t.code}`} statement={t.statement} support={t.support} primary={{ label: 'Demander une démonstration', href: demo }} secondary={{ label: t.guides, href: localizedHref('/guides', l) }} />
    </V2Shell>
  );
}
