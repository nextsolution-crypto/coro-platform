import type { Metadata } from 'next';
import { CTASection } from '@/components/conversion/CTASection';
import { Accordion } from '@/components/page/Accordion';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { EditorialHero } from '@/components/page/EditorialHero';
import { FeatureIndex } from '@/components/page/FeatureIndex';
import { PageSection } from '@/components/page/PageSection';
import { SplitContent } from '@/components/page/SplitContent';
import { V2Shell } from '@/components/site/V2Shell';
import { Button } from '@/components/ui/Button';
import { faqJsonLd } from '@/lib/site/json-ld';
import { localeFromSearchParams, localizedHref } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/**
 * /documents/plan-securite-incendie-psi (MIG-05C) — second of six document guides migrated to V2. Editorial guide first,
 * CORO conversion page second. Authority: docs/website-v2/05-migration/MIG-05-GUIDES-GATE.md (PSI preservation matrix and
 * regulatory matrix, MIG-05C section).
 * LANGUAGE: FR ONLY (englishAvailable={false}) — the V1 page had no searchParams handling at all (?lang=en rendered the
 * identical French page, confirmed in the baseline); no translation is invented here.
 * PRODUCT BOUNDARY: PSI is available in CORO Documents today (standardized fire-safety procedures, building-data reuse,
 * editing, export). No automatic compliance, fire-code approval, fire-department approval or automatic alarm-system
 * integration is claimed.
 * REGULATORY CORRECTIONS/ADDITIONS from V1 (verified against RBQ/CNRC primary sources during MIG-05C, see the gate's matrix):
 * the Code de sécurité du Québec, chapitre VIII (incl. CNPI 2020 modifié) entered into force 2025-04-17 is kept (verified),
 * with an ADDED 18-month transition note (previous chapter still usable until 2026-10-16) that V1 omitted. The V1 blanket
 * claim "le PSI est le document de base de tout bâtiment — toute organisation doit en avoir un" is REMOVED (in tension with
 * V1's own "bâtiments visés" list of specific mandatory categories); the regulatory scope is stated only through that list.
 * Exact CNPI sub-article numbers (2.8.1.2 / 2.8.2.7 / 2.8.3) are GENERALIZED to "section 2.8 (mesures d'urgence)" — the
 * section itself is verified, but the precise sub-paragraph wording could not be confirmed with full confidence. The V1
 * "mise à jour annuelle" is softened to a recommended practice rather than a cited legal figure, since no primary source
 * confirming an exact annual-review article was found during this pass.
 * The hero (people reviewing building/evacuation plans with firefighters in the background) is a MARKETING / EDITORIAL
 * ILLUSTRATION (decorative, alt=""), never product proof; no fact is derived from what is drawn in it.
 *
 * MIG-05C-B (visual character, density & claim clarification pass — the first PSI composition was rejected on visual
 * review): PSI's own signature, still never cloning PMU's oversized "08" / lifecycle / "Agir": (1) a 2x2 building-category
 * matrix beside the legal explanation (§2); (2) a "PSI" typographic anchor — the acronym itself as the visual object,
 * beside the 01-07 content ledger (§3, still the shared `FeatureIndex` "rows" layout — the concept is "what lives inside a
 * PSI", not a step count); (3) four strengthened 2x2 stakeholder cards (§4); (4) the navy section rebuilt as FOUR response
 * TERRITORIES — SIGNAL / AVIS / CONSIGNES / ÉVACUATION (§5) — explicitly not connected by arrows or a mandatory sequence
 * (the `FeatureIndex` "steps" rail from MIG-05C was rejected precisely because it implied that linear reading). "Exercices
 * réguliers" is REMOVED from this operational group — it is not the fifth stage of a real incident — and its content is
 * preserved, relocated into §6 (mise à jour) as its own territory alongside building-change triggers.
 * CLAIM REVIEW (MIG-05C-B): the V1-derived "révision au moins annuelle" wording is REMOVED — no primary source confirming
 * an annual-review requirement or recommendation was found; §6 now cites only change-triggered revision, which the V1
 * content itself already supported. The "service de sécurité incendie ... peut exiger un exemplaire du PSI pour vérifier
 * sa conformité" wording is REFINED: general municipal/fire-authority power to request fire-safety information and
 * documents is grounded in the Loi sur la sécurité incendie and the Loi sur les compétences municipales (verified via
 * primary/institutional sources), so the claim is kept but reworded to that general authority rather than an unqualified
 * "vérifier sa conformité" — applied consistently to the organization card and the FAQ.
 */
const copy = {
  metaTitle: 'Plan de sécurité incendie (PSI) : bâtiments visés, contenu, cadre légal',
  description: 'Qu’est-ce qu’un plan de sécurité incendie, quels bâtiments doivent en avoir un, ce qu’il doit contenir et le cadre réglementaire applicable au Québec (Code de sécurité, chapitre VIII).',
  label: 'Guide', code: 'PSI',
  lines: ['Plan de sécurité', 'incendie (PSI).'],
  lead: 'Le plan de sécurité incendie précise les mesures de prévention, les procédures d’évacuation, les rôles du personnel désigné, les équipements de protection incendie et les protocoles d’intervention propres à un bâtiment ou un établissement.',
  read: 'Lire le guide', guides: 'Voir tous les guides',
  s1: { n: '01', label: 'Qu’est-ce qu’un PSI', title: 'Le document de sécurité incendie d’un bâtiment.',
    text: 'Le PSI est un document détaillé traitant de tous les aspects de la sécurité incendie relativement à un bâtiment ou à un établissement donné. Il précise les mesures de prévention, les procédures d’évacuation, les rôles du personnel désigné, les équipements de protection incendie disponibles et les protocoles d’intervention.' },
  s2: { n: '02', label: 'Bâtiments visés au Québec', title: 'Obligatoire pour certaines catégories de bâtiments.',
    text: 'Selon le Code de sécurité du Québec, chapitre VIII — Bâtiment, qui intègre le Code national de prévention des incendies — Canada 2020 modifié (CNPI 2020), le PSI est obligatoire notamment pour les catégories suivantes.',
    categories: [
      'Les établissements de réunion, de soins, de traitement ou de détention',
      'Les résidences privées pour aînés (RPA) et les ressources intermédiaires (RI)',
      'Les services de garde, selon les exigences du ministère de la Famille (sous forme de PSI-MU)',
      'Les bâtiments d’habitation, selon les guides du gouvernement du Québec',
    ] as const,
    note: 'Ce chapitre du Code de sécurité est entré en vigueur le 17 avril 2025 ; une période de transition de 18 mois est prévue, durant laquelle les dispositions antérieures peuvent encore s’appliquer jusqu’au 16 octobre 2026. Les exigences applicables varient selon le type de bâtiment, le secteur d’activité et la municipalité : consultez votre service de sécurité incendie local ou la RBQ pour votre situation.' },
  s3: { n: '03', label: 'Contenu d’un PSI complet', title: 'Sept éléments structurants.',
    items: [
      { title: 'Désignation et formation du personnel de surveillance', text: 'Le personnel désigné est formé lors de l’implantation ou de la mise à jour du PSI.' },
      { title: 'Inspection et entretien des installations de sécurité', text: 'Les équipements de protection incendie du bâtiment sont inspectés et entretenus selon les exigences applicables.' },
      { title: 'Procédures d’évacuation', text: 'Incluant les mesures pour les personnes nécessitant une assistance.' },
      { title: 'Avis au service d’incendie', text: 'La procédure à suivre pour aviser le service de sécurité incendie local.' },
      { title: 'Instructions aux occupants', text: 'Les consignes à suivre par les occupants lors du déclenchement de l’alarme.' },
      { title: 'Plan d’évacuation par aire de plancher', text: 'Affiché à chaque aire de plancher du bâtiment.' },
      { title: 'Programme d’exercices d’évacuation', text: 'Des exercices réguliers permettent de valider les procédures du PSI.' },
    ] as const },
  s4: { n: '04', label: 'Organisation de la sécurité incendie', title: 'Des rôles et des parties prenantes désignés.',
    text: 'Un PSI utile désigne des personnes et des parties prenantes, pas seulement des procédures.',
    roles: [
      ['Personnel de surveillance', 'Désigné et formé lors de l’implantation ou de la mise à jour du PSI, avec des responsabilités propres au bâtiment.'],
      ['Occupants', 'Reçoivent des instructions à suivre lors du déclenchement de l’alarme.'],
      ['Service de sécurité incendie', 'Avisé selon la procédure prévue au PSI ; en vertu de la Loi sur la sécurité incendie et de la Loi sur les compétences municipales, peut demander des renseignements ou des documents relatifs à la sécurité incendie du bâtiment.'],
      ['Personnes nécessitant une assistance', 'Font l’objet de mesures spécifiques dans les procédures d’évacuation.'],
    ] as const },
  s5: { n: '05', label: 'De l’alerte à l’action', title: 'Quatre volets qu’un PSI structure.',
    text: 'Ces volets illustrent les concepts qu’un PSI structure ; ils ne forment pas une séquence obligatoire et la configuration exacte de l’alarme et des protocoles varie selon le bâtiment.',
    territories: [
      { title: 'Signal', text: 'Le signal d’alerte est détecté dans le bâtiment.' },
      { title: 'Avis', text: 'Le service de sécurité incendie local est avisé selon la procédure prévue au PSI.' },
      { title: 'Consignes', text: 'Les instructions du PSI sont communiquées aux occupants lors du déclenchement de l’alarme.' },
      { title: 'Évacuation', text: 'Incluant les mesures pour les personnes nécessitant une assistance.' },
    ] as const },
  s6: { n: '06', label: 'Mise à jour', title: 'Un document qui doit rester à jour.',
    blocks: [
      ['Révision', 'Le PSI doit être tenu à jour chaque fois qu’un changement significatif affecte le bâtiment : travaux de rénovation, modification des systèmes d’alarme ou de gicleurs, changement d’occupation ou de personnel désigné.'],
      ['Exercices', 'Le programme d’exercices d’évacuation permet de valider les procédures du PSI avant une situation réelle.'],
    ] as const },
  s7: { n: '07', label: 'Relation avec le PMU', title: 'Lié au PMU, pas interchangeable.',
    text: 'Le PSI est spécifique aux situations d’incendie. Le PMU est plus large et couvre tous les types d’urgence propres à l’organisation. Lorsqu’un PMU est requis, il agit comme plan maître et peut contenir le PSI.',
    link: 'Consulter le guide du PMU' },
  s8: { n: '08', label: 'CORO Documents', title: 'Le PSI est disponible dans CORO.',
    text: 'CORO Documents structure la production du PSI à partir des informations du bâtiment : les procédures d’incendie standardisées sont présélectionnées selon le type de bâtiment et d’occupation, et l’éditeur intégré permet de compléter chaque module (personnel désigné, plans d’évacuation par aire de plancher, équipements) puis d’exporter un document PDF professionnel avec mise à jour simplifiée.',
    cta: 'Découvrir CORO Documents' },
  res: { label: 'Ressources', title: 'Pour approfondir', items: [
    { slug: 'que-contient-un-plan-de-securite-incendie', title: 'Que contient un plan de sécurité incendie (PSI) ?', text: 'Le détail des éléments attendus dans un PSI complet.' },
    { slug: 'obligations-plan-securite-incendie-proprietaire-gestionnaire-quebec', title: 'Plan de sécurité incendie : quelles sont les obligations d’un propriétaire ou gestionnaire d’immeuble au Québec ?', text: 'Les obligations propres aux propriétaires et gestionnaires d’immeuble.' },
    { slug: 'cnpi-2020-quebec-plan-securite-incendie', title: 'CNPI 2020 au Québec : comment préparer vos plans de sécurité incendie aux nouvelles exigences', text: 'Le contexte réglementaire du CNPI 2020 modifié Québec.' },
    { slug: 'pmu-vs-psi-quelle-est-la-difference', title: 'PMU vs PSI : quelle est la différence ?', text: 'Comment distinguer les deux documents et savoir lequel est requis.' },
  ] as const },
  faq: 'Questions fréquentes', faqLabel: 'FAQ',
  faqItems: [
    { q: 'Quelle est la différence entre un PSI et un PMU?', a: 'Le PSI est spécifique aux situations d’incendie. Le PMU est plus large et couvre tous les types d’urgence. Lorsqu’un PMU est requis, il agit comme plan maître et peut contenir le PSI.' },
    { q: 'Mon bâtiment a-t-il besoin d’un PSI?', a: 'Selon le Code de sécurité du Québec, les établissements de réunion, de soins, de traitement ou de détention doivent en avoir un, de même que les résidences pour aînés, les services de garde et certains bâtiments d’habitation. Consultez votre service de sécurité incendie local pour les exigences propres à votre territoire.' },
    { q: 'À quelle fréquence doit-on mettre à jour le PSI?', a: 'Le PSI doit être tenu à jour chaque fois qu’un changement significatif affecte le bâtiment : travaux de rénovation, modification des systèmes d’alarme ou de gicleurs, changement d’occupation ou de personnel désigné.' },
    { q: 'Le PSI doit-il être soumis aux autorités?', a: 'En vertu de la Loi sur la sécurité incendie et de la Loi sur les compétences municipales, le service de sécurité incendie local peut demander des renseignements ou des documents relatifs à la sécurité incendie du bâtiment. Renseignez-vous auprès de votre municipalité pour les exigences propres à votre territoire.' },
  ],
  statement: 'Le PSI relie le bâtiment aux personnes qui l’occupent.',
  support: 'Découvrez comment CORO Documents structure la production du PSI à partir des informations de votre bâtiment.',
};

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/documents/plan-securite-incendie-psi', locale: l, hasEnglish: false, title: copy.metaTitle, description: copy.description });
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
      { '@type': 'ListItem', position: 3, name: t.code, item: 'https://getcoro.io/documents/plan-securite-incendie-psi' },
    ],
  };
  return (
    <V2Shell locale={l} pathname="/documents/plan-securite-incendie-psi" englishAvailable={false}>
      <JsonLd value={faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))} />
      <JsonLd value={breadcrumbLd} />

      <EditorialHero id="psi-title" label={`${t.label} · ${t.code}`} title={t.lines} lead={t.lead}
        photo={{ src: '/website-v2/guides/guide-psi-fire-safety.webp', side: 'end', position: '50% 40%', mobilePosition: '50% 35%', coverage: 55, mobileRatio: '16 / 11' }}
        actions={<><Button href="#s1" surface="dark">{t.read}</Button><Button href={localizedHref('/guides', l)} variant="ghost" surface="dark">{t.guides}</Button></>} />

      <PageSection tone="white" density="compact" id="s1" labelledBy="psi-s1-title">
        <EditorialBlock id="psi-s1-title" label={`${t.s1.n} — ${t.s1.label}`} heading={t.s1.title}><p>{t.s1.text}</p></EditorialBlock>
      </PageSection>

      <PageSection tone="soft" labelledBy="psi-s2-title">
        <div className={styles.buildingWrap}>
          <div className={styles.stack}>
            <EditorialBlock id="psi-s2-title" label={`${t.s2.n} — ${t.s2.label}`} heading={t.s2.title}><p>{t.s2.text}</p></EditorialBlock>
            <p className={styles.note}>{t.s2.note}</p>
          </div>
          <ul className={styles.matrix} aria-label={t.s2.title}>{t.s2.categories.map((c) => <li key={c} className={styles.matrixCell}>{c}</li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="psi-s3-title">
        <div className={styles.stack}>
          <EditorialBlock id="psi-s3-title" label={`${t.s3.n} — ${t.s3.label}`} heading={t.s3.title} />
          <div className={styles.anchorWrap}>
            <p className={styles.psiAnchor}>{t.code}<span>Ce que le document structure</span></p>
            <FeatureIndex label={t.s3.title} items={t.s3.items} layout="rows" />
          </div>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="psi-s4-title">
        <div className={styles.stack}>
          <EditorialBlock id="psi-s4-title" label={`${t.s4.n} — ${t.s4.label}`} heading={t.s4.title}><p>{t.s4.text}</p></EditorialBlock>
          <ul className={styles.orgCards}>{t.s4.roles.map(([name, text], i) => <li key={name} className={styles.orgCard}><span className={styles.orgNum} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="psi-s5-title">
        <div className={styles.stack}>
          <EditorialBlock id="psi-s5-title" label={`${t.s5.n} — ${t.s5.label}`} heading={t.s5.title}><p>{t.s5.text}</p></EditorialBlock>
          <ul className={styles.territories} aria-label={t.s5.title}>{t.s5.territories.map((item) => <li key={item.title} className={styles.territory}><h3>{item.title}</h3><p>{item.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" density="compact" labelledBy="psi-s6-title">
        <div className={styles.stack}>
          <EditorialBlock id="psi-s6-title" label={`${t.s6.n} — ${t.s6.label}`} heading={t.s6.title} />
          <ul className={`${styles.rows} ${styles.pair}`}>{t.s6.blocks.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="soft" density="compact" labelledBy="psi-s7-title">
        <SplitContent ratio="7-5" align="start"
          text={<EditorialBlock id="psi-s7-title" label={`${t.s7.n} — ${t.s7.label}`} heading={t.s7.title}><p>{t.s7.text}</p></EditorialBlock>}
          media={<div className={styles.linkCard}><a className={styles.linkCardLink} href={localizedHref('/documents/plan-mesures-urgence-pmu', l)}>{t.s7.link}<span aria-hidden="true"> →</span></a></div>} />
      </PageSection>

      <PageSection tone="white" density="compact" labelledBy="psi-s8-title">
        <SplitContent ratio="7-5" align="start"
          text={<EditorialBlock id="psi-s8-title" label={`${t.s8.n} — ${t.s8.label}`} heading={t.s8.title}><p>{t.s8.text}</p></EditorialBlock>}
          media={<div className={styles.linkCard}><a className={styles.linkCardLink} href={localizedHref('/gestion-documentaire', l)}>{t.s8.cta}<span aria-hidden="true"> →</span></a></div>} />
      </PageSection>

      <PageSection tone="soft" density="compact" labelledBy="psi-res-title">
        <div className={styles.stack}>
          <EditorialBlock id="psi-res-title" label={t.res.label} heading={t.res.title} />
          <ul className={styles.rows}>{t.res.items.map((r) => <li key={r.slug}><h3><a className={styles.link} href={localizedHref(`/blog/${r.slug}`, l)}>{r.title}</a></h3><p>{r.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="psi-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="psi-faq-title" label={t.faqLabel} heading={t.faq} />
          <Accordion label={t.faq} items={t.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="psi-cta-title" tone="dark" label={`${t.label} · ${t.code}`} statement={t.statement} support={t.support} primary={{ label: 'Demander une démonstration', href: demo }} secondary={{ label: t.guides, href: localizedHref('/guides', l) }} />
    </V2Shell>
  );
}
