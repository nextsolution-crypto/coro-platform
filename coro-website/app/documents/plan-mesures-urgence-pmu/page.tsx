import type { Metadata } from 'next';
import { CTASection } from '@/components/conversion/CTASection';
import { Accordion } from '@/components/page/Accordion';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { EditorialHero } from '@/components/page/EditorialHero';
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
 * /documents/plan-mesures-urgence-pmu (MIG-05B) — the first of six document guides migrated to V2. Editorial guide first,
 * CORO conversion page second. Authority: docs/website-v2/05-migration/MIG-05-GUIDES-GATE.md (PMU preservation matrix, MIG-05B section).
 * LANGUAGE: FR ONLY (englishAvailable={false}) — the V1 "?lang=en" rendered identical French text (confirmed in the baseline); no
 * translation is invented here.
 * PRODUCT BOUNDARY: PMU is available in CORO Documents today (procedures, editing, approval workflow, bilingual PDF export — verified
 * in CLAUDE.md and the product code). No automatic compliance, certification or AI-verified regulatory correctness is claimed.
 * REGULATORY CORRECTIONS from V1 (verified against primary/official sources during MIG-05B, see the gate's regulatory matrix):
 * RSST section IV art. 34-36 kept (verified exact text: évacuation, exercices annuels, extincteurs). LSST art. 51 kept as a general
 * reference WITHOUT the V1 sub-paragraph numbers (51.1/51.5/51.6/51.8), which could not be verified against the current 16-paragraph
 * structure of article 51. "Norme CSA Z731-14" corrected to "CSA Z731-03 (revue en 2014)", the designation confirmed with CSA/SCC —
 * no "Z731-14" edition exists. The V1 claim "un PMU complet peut être produit en quelques heures... plusieurs jours" (unverifiable
 * precision) is removed; "génère automatiquement" is softened to "structure" to avoid overstating ease.
 * The hero and its illustrated evacuation-plan screen are a MARKETING / EDITORIAL ILLUSTRATION (decorative, alt=""), never product proof.
 *
 * MIG-05B-B (editorial density & visual character pass): local density only — per-section `density="compact"` and a tighter
 * `.stack` gap, PageSection and the shared page.module.css untouched. Three visual moments carry the PMU signature: the "08 éléments
 * attendus" typographic anchor + 2x4 ruled grid (§4), the navy preparedness cycle (§5, unchanged content), and the emergency-
 * organization role cards (§6, restricted to the two roles the source text actually names — personnel de surveillance, équipe de
 * première intervention — no invented roles or hierarchy). §7 uses an oversized "Agir" instead of an invented procedure count,
 * paired with the emergency categories already named in the existing paragraph. No new facts, no new claims, no new image.
 */
const copy = {
  metaTitle: 'Plan de mesures d’urgence (PMU) : définition, cadre légal, contenu',
  description: 'Qu’est-ce qu’un plan de mesures d’urgence, qui doit en avoir un, ce qu’il doit contenir et comment le maintenir à jour. Le cadre légal applicable au Québec.',
  label: 'Guide', code: 'PMU',
  lines: ['Plan de mesures', 'd’urgence (PMU).'],
  lead: 'Le plan de mesures d’urgence est le document de référence d’une organisation pour faire face à une situation d’urgence : il définit les rôles, les procédures et les ressources nécessaires, qu’il s’agisse d’un risque naturel ou technologique.',
  read: 'Lire le guide', guides: 'Voir tous les guides',
  s1: { n: '01', label: 'Qu’est-ce qu’un PMU', title: 'Le document de référence en cas d’urgence.',
    text: [
      'Le PMU décrit les responsabilités assignées ainsi que les mesures et les procédures à entreprendre en cas d’urgence. Il ne se limite pas à l’incendie : il couvre les autres types d’urgence propres à l’organisation, comme un déversement de matières dangereuses, une explosion, une alerte à la bombe, une situation nécessitant des opérations de sauvetage, ou un risque naturel ou technologique du site.',
      'Il doit être élaboré en fonction des risques spécifiques de l’organisation et de son environnement : la première étape est toujours une analyse de risque, qui détermine quels documents sont réellement requis.',
    ] },
  s2: { n: '02', label: 'Cadre légal applicable au Québec', title: 'Plusieurs lois et règlements complémentaires.',
    text: 'Au Québec, les obligations en matière de mesures d’urgence découlent de plusieurs textes complémentaires, sans qu’un seul règlement ne couvre l’ensemble d’un PMU.',
    rows: [
      ['RSST, section IV — Mesures de sécurité en cas d’urgence (art. 34 à 36)', 'Prescrit un plan d’évacuation établi et appliqué, des exercices de sauvetage et d’évacuation au moins une fois l’an, et des extincteurs portatifs conformes à la norme applicable.'],
      ['LSST, article 51', 'Impose à l’employeur de prendre les mesures nécessaires pour protéger la santé et assurer la sécurité des travailleurs ; certaines des obligations qui en découlent s’appliquent à la préparation aux urgences.'],
      ['Loi sur la sécurité civile', 'Encadre la sécurité civile au Québec ; complète le cadre applicable aux organisations et aux municipalités.'],
      ['Loi sur la sécurité incendie', 'Encadre la sécurité incendie, dont découle notamment le plan de sécurité incendie (PSI).'],
      ['Norme CSA Z731-03 (révisée en 2014)', 'Norme de référence pour la planification des mesures et interventions d’urgence, au-delà des exigences légales minimales.'],
    ] as const,
    note: 'Ce contenu est fourni à titre informatif. Les exigences applicables varient selon le type de bâtiment, le secteur d’activité et la municipalité : consultez les autorités compétentes pour votre situation.' },
  s3: { n: '03', label: 'PMU et PSI', title: 'Deux documents liés, pas interchangeables.',
    text: 'Le PSI (plan de sécurité incendie) est spécifique aux situations d’incendie. Le PMU est plus large : il couvre tous les types d’urgence propres à l’organisation. Lorsqu’un PMU est requis, il agit comme plan maître et peut contenir le PSI.',
    link: 'Consulter le guide du PSI' },
  s4: { n: '04', label: 'Ce qu’un PMU complet doit structurer', title: 'Huit éléments attendus.',
    items: [
      'La description du bâtiment et de ses systèmes de sécurité',
      'L’organigramme des rôles d’urgence (personnel de surveillance, équipe de première intervention)',
      'Les listes téléphoniques d’urgence',
      'Les procédures propres à chaque type d’urgence identifié lors de l’analyse de risque',
      'Les plans d’évacuation',
      'Les ressources disponibles sur le site',
      'Les mesures pour les occupants nécessitant une assistance',
      'Le programme d’exercices annuels',
    ] as const },
  s5: { n: '05', label: 'Le cycle de préparation', title: 'Connaître, planifier, organiser, préparer, intervenir, exercer, réviser.',
    text: 'Ce cycle est un repère éditorial, pas une séquence réglementaire : il aide à situer les éléments d’un PMU les uns par rapport aux autres.',
    steps: [
      ['Connaître', 'Identifier les risques propres au bâtiment et à l’organisation par une analyse de risque.'],
      ['Planifier', 'Déterminer les documents requis (PMU, PSI) et les procédures nécessaires à chaque risque.'],
      ['Organiser', 'Attribuer les rôles d’urgence et bâtir l’organigramme de l’équipe.'],
      ['Préparer', 'Réunir les listes téléphoniques, les plans d’évacuation et les ressources du site.'],
      ['Intervenir', 'Appliquer les procédures propres à chaque type d’urgence lorsqu’elle survient.'],
      ['Exercer', 'Tenir les exercices de sauvetage et d’évacuation exigés au moins une fois l’an.'],
      ['Réviser', 'Mettre le PMU à jour après tout changement significatif ou après un exercice.'],
    ] as const },
  s6: { n: '06', label: 'Organisation d’urgence', title: 'Des rôles attribués, pas seulement un document.',
    text: 'Un PMU utile désigne des personnes, pas seulement des procédures : le personnel de surveillance et l’équipe de première intervention doivent être identifiés dans l’organigramme des rôles d’urgence, avec leurs responsabilités propres à chaque type d’urgence couvert par le plan.',
    roles: [
      ['Personnel de surveillance', 'Identifié dans l’organigramme des rôles d’urgence, avec des responsabilités propres à chaque type d’urgence couvert par le plan.'],
      ['Équipe de première intervention', 'Identifiée dans l’organigramme des rôles d’urgence, avec des responsabilités propres à chaque type d’urgence couvert par le plan.'],
    ] as const },
  s7: { n: '07', label: 'Procédures et action', title: 'Une procédure par type d’urgence.',
    text: 'Les procédures traduisent l’analyse de risque en actions concrètes : une procédure distincte est prévue pour chaque type d’urgence identifié, avec les ressources et les listes téléphoniques qui s’y rattachent.',
    agir: 'Agir',
    categories: ['Incendie', 'Matières dangereuses', 'Explosion', 'Alerte à la bombe', 'Sauvetage', 'Risques naturels ou technologiques propres au site'] as const },
  s8: { n: '08', label: 'Formation, exercices et mise à jour', title: 'Un plan qui reste utilisable.',
    blocks: [
      ['Révision', 'Le PMU doit être révisé dès qu’un changement significatif survient : modification des opérations, nouveaux risques, changement de personnel clé, travaux majeurs ou modification des systèmes de sécurité.'],
      ['Exercices', 'Des exercices tenus sur une base régulière permettent d’ajuster les ressources et les procédures avant qu’une urgence réelle ne les mette à l’épreuve.'],
    ] as const },
  s9: { n: '09', label: 'Relation avec les autres documents', title: 'Un plan maître, pas un document isolé.',
    text: 'Le PMU peut s’articuler avec d’autres familles de documents selon la réalité de l’organisation : le plan de continuité des activités (PCA) pour maintenir les activités critiques, le plan de gestion de crise (PGC) pour la gouvernance en situation de crise à fort impact, le plan de reprise des activités (PRA) pour rétablir les systèmes, et le plan d’urgence environnementale (PUE) en contexte industriel. Ces familles ont chacune leur propre guide.',
    link: 'Voir tous les guides' },
  s10: { n: '10', label: 'CORO Documents', title: 'Le PMU est disponible dans CORO.',
    text: 'CORO Documents structure la production du PMU à partir des informations du bâtiment : les procédures d’urgence standardisées sont présélectionnées selon la configuration du site, et l’éditeur intégré permet de compléter chaque module (listes téléphoniques, organigramme, plans techniques, matières dangereuses) puis d’exporter un document PDF professionnel bilingue FR/EN.',
    cta: 'Découvrir CORO Documents' },
  res: { label: 'Ressources', title: 'Pour approfondir', items: [
    { slug: 'qu-est-ce-qu-un-plan-de-mesures-d-urgence', title: 'Qu’est-ce qu’un plan de mesures d’urgence (PMU) ?', text: 'Une présentation d’ensemble du PMU, de son rôle et de sa structure.' },
    { slug: 'responsable-plan-mesures-urgence-entreprise', title: 'Qui est responsable du plan de mesures d’urgence dans une entreprise ?', text: 'Direction, coordonnateur, gestionnaire immobilier : qui porte le PMU.' },
    { slug: 'frequence-mise-a-jour-plan-mesures-urgence-pmu', title: 'À quelle fréquence faut-il mettre à jour un plan de mesures d’urgence (PMU) ?', text: 'Ce qui déclenche une révision, entre les mises à jour planifiées.' },
    { slug: 'pmu-10-erreurs-plus-frequentes', title: 'PMU : les 10 erreurs les plus fréquentes dans un plan de mesures d’urgence', text: 'Les lacunes qui rendent un PMU moins utile en situation réelle.' },
  ] as const },
  faq: 'Questions fréquentes', faqLabel: 'FAQ',
  faqItems: [
    { q: 'Toutes les organisations ont-elles besoin d’un PMU?', a: 'Pas nécessairement. La première étape est une analyse de risque qui détermine les documents requis. Le PMU s’ajoute lorsque les risques de l’organisation le justifient au-delà du PSI.' },
    { q: 'Quelle est la différence entre un PMU et un PSI?', a: 'Le PSI est spécifique aux situations d’incendie. Le PMU est plus large et couvre tous les types d’urgence propres à l’organisation. Lorsqu’un PMU est requis, il agit comme plan maître et peut contenir le PSI.' },
    { q: 'Le PMU doit-il être testé?', a: 'Oui. Des exercices de sauvetage et d’évacuation sont exigés au moins une fois l’an, adaptés aux risques et aux activités de l’établissement.' },
    { q: 'CORO permet-il de produire un PMU pour plusieurs bâtiments?', a: 'Oui. CORO est conçu pour les firmes conseil et les gestionnaires de portefeuilles immobiliers, qui gèrent leurs mandats depuis une seule plateforme.' },
  ],
  statement: 'Le PMU relie l’analyse de risque à l’action.',
  support: 'Découvrez comment CORO Documents structure la production du PMU à partir des informations de votre bâtiment.',
};

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/documents/plan-mesures-urgence-pmu', locale: l, hasEnglish: false, title: copy.metaTitle, description: copy.description });
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
      { '@type': 'ListItem', position: 3, name: t.code, item: 'https://getcoro.io/documents/plan-mesures-urgence-pmu' },
    ],
  };
  return (
    <V2Shell locale={l} pathname="/documents/plan-mesures-urgence-pmu" englishAvailable={false}>
      <JsonLd value={faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))} />
      <JsonLd value={breadcrumbLd} />

      <EditorialHero id="pmu-title" label={`${t.label} · ${t.code}`} title={t.lines} lead={t.lead}
        photo={{ src: '/website-v2/guides/guide-pmu-emergency-measures.webp', side: 'end', position: '55% 40%', mobilePosition: '55% 35%', coverage: 55, mobileRatio: '16 / 11' }}
        actions={<><Button href="#s1" surface="dark">{t.read}</Button><Button href={localizedHref('/guides', l)} variant="ghost" surface="dark">{t.guides}</Button></>} />

      <PageSection tone="white" density="compact" id="s1" labelledBy="pmu-s1-title">
        <EditorialBlock id="pmu-s1-title" label={`${t.s1.n} — ${t.s1.label}`} heading={t.s1.title}>{t.s1.text.map((p) => <p key={p}>{p}</p>)}</EditorialBlock>
      </PageSection>

      <PageSection tone="soft" labelledBy="pmu-s2-title">
        <div className={styles.stack}>
          <EditorialBlock id="pmu-s2-title" label={`${t.s2.n} — ${t.s2.label}`} heading={t.s2.title}><p>{t.s2.text}</p></EditorialBlock>
          <ul className={styles.rows}>{t.s2.rows.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ul>
          <p className={styles.note}>{t.s2.note}</p>
        </div>
      </PageSection>

      <PageSection tone="white" density="compact" labelledBy="pmu-s3-title">
        <SplitContent ratio="7-5" align="start"
          text={<EditorialBlock id="pmu-s3-title" label={`${t.s3.n} — ${t.s3.label}`} heading={t.s3.title}><p>{t.s3.text}</p></EditorialBlock>}
          media={<div className={styles.linkCard}><a className={styles.linkCardLink} href={localizedHref('/documents/plan-securite-incendie-psi', l)}>{t.s3.link}<span aria-hidden="true"> →</span></a></div>} />
      </PageSection>

      <PageSection tone="soft" labelledBy="pmu-s4-title">
        <div className={styles.stack}>
          <EditorialBlock id="pmu-s4-title" label={`${t.s4.n} — ${t.s4.label}`} heading={t.s4.title} />
          <div className={styles.elementsWrap}>
            <p className={styles.bigAnchor}><b>{String(t.s4.items.length).padStart(2, '0')}</b><span>Éléments attendus</span></p>
            <ol className={styles.elementsGrid}>{t.s4.items.map((item) => <li key={item}>{item}</li>)}</ol>
          </div>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="pmu-s5-title">
        <div className={styles.stack}>
          <EditorialBlock id="pmu-s5-title" label={`${t.s5.n} — ${t.s5.label}`} heading={t.s5.title}><p>{t.s5.text}</p></EditorialBlock>
          <ol className={styles.cycle}>{t.s5.steps.map(([name, text], i) => <li key={name}><span className={styles.cycleNum} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><h3>{name}</h3><p>{text}</p></li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="pmu-s6-title">
        <div className={styles.rolesWrap}>
          <EditorialBlock id="pmu-s6-title" label={`${t.s6.n} — ${t.s6.label}`} heading={t.s6.title}><p>{t.s6.text}</p></EditorialBlock>
          <ul className={styles.roleCards}>{t.s6.roles.map(([name, text], i) => <li key={name} className={styles.roleCard}><span className={styles.roleNum} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="pmu-s7-title">
        <div className={styles.stack}>
          <EditorialBlock id="pmu-s7-title" label={`${t.s7.n} — ${t.s7.label}`} heading={t.s7.title}><p>{t.s7.text}</p></EditorialBlock>
          <div className={styles.procWrap}>
            <p className={styles.agir}>{t.s7.agir}</p>
            <ul className={styles.procList} aria-label={t.s7.title}>{t.s7.categories.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        </div>
      </PageSection>

      <PageSection tone="white" density="compact" labelledBy="pmu-s8-title">
        <div className={styles.stack}>
          <EditorialBlock id="pmu-s8-title" label={`${t.s8.n} — ${t.s8.label}`} heading={t.s8.title} />
          <ul className={`${styles.rows} ${styles.pair}`}>{t.s8.blocks.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="soft" density="compact" labelledBy="pmu-s9-title">
        <SplitContent ratio="7-5" align="start"
          text={<EditorialBlock id="pmu-s9-title" label={`${t.s9.n} — ${t.s9.label}`} heading={t.s9.title}><p>{t.s9.text}</p></EditorialBlock>}
          media={<div className={styles.linkCard}><a className={styles.linkCardLink} href={localizedHref('/guides', l)}>{t.s9.link}<span aria-hidden="true"> →</span></a></div>} />
      </PageSection>

      <PageSection tone="white" density="compact" labelledBy="pmu-s10-title">
        <SplitContent ratio="7-5" align="start"
          text={<EditorialBlock id="pmu-s10-title" label={`${t.s10.n} — ${t.s10.label}`} heading={t.s10.title}><p>{t.s10.text}</p></EditorialBlock>}
          media={<div className={styles.linkCard}><a className={styles.linkCardLink} href={localizedHref('/gestion-documentaire', l)}>{t.s10.cta}<span aria-hidden="true"> →</span></a></div>} />
      </PageSection>

      <PageSection tone="soft" density="compact" labelledBy="pmu-res-title">
        <div className={styles.stack}>
          <EditorialBlock id="pmu-res-title" label={t.res.label} heading={t.res.title} />
          <ul className={styles.rows}>{t.res.items.map((r) => <li key={r.slug}><h3><a className={styles.link} href={localizedHref(`/blog/${r.slug}`, l)}>{r.title}</a></h3><p>{r.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="pmu-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="pmu-faq-title" label={t.faqLabel} heading={t.faq} />
          <Accordion label={t.faq} items={t.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="pmu-cta-title" tone="dark" label={`${t.label} · ${t.code}`} statement={t.statement} support={t.support} primary={{ label: 'Demander une démonstration', href: demo }} secondary={{ label: t.guides, href: localizedHref('/guides', l) }} />
    </V2Shell>
  );
}
