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
 * /documents/plan-continuite-activites-pca (MIG-05D) — third of six document guides migrated to V2. Editorial guide first,
 * CORO conversion page second. Authority: docs/website-v2/05-migration/MIG-05-GUIDES-GATE.md (PCA preservation matrix and
 * normative matrix, MIG-05D section).
 * LANGUAGE: FR ONLY (englishAvailable={false}) — the V1 page had no searchParams handling at all (?lang=en rendered the
 * identical French page, confirmed in the baseline); no translation is invented here.
 * PRODUCT BOUNDARY: PCA is available in CORO Documents today (structured drafting, critical-resource modules, contact
 * lists, activation procedures, PDF export). PRA production remains Phase 2 — never implied available. No automatic
 * business-impact analysis, no automatic RTO/RPO calculation, no automatic dependency mapping, no ISO 22301 certification
 * of CORO itself is claimed.
 * NORMATIVE CORRECTIONS/ADDITIONS from V1 (verified during MIG-05D, see the gate's matrix): ISO 22301:2019 kept (VERIFIED,
 * real standard; iso.org blocks scripted link checks but the standard's existence and content are independently
 * confirmed via secondary sources). The V1 claim "doit être testé au moins une fois par année" is REMOVED — ISO 22301
 * requires an exercise/testing programme but frequency is explicitly risk- and activity-based, not a fixed annual
 * figure; no primary source confirms an annual figure. The BSIF source link (V1) was DEAD (404) and pointed to an
 * outdated generic page; REPLACED by naming the current guideline, E-21 (Gestion du risque opérationnel et résilience),
 * linked to the OSFI/BSIF site (the specific French guideline URL could not be resolved during this pass, so the
 * homepage is used rather than a guessed dead link). The Canada.ca source link (V1) was DEAD (404); REPLACED with a
 * working Government of Canada business-continuity-management page. The V1 FAQ claim that a first PCA "peut être produit
 * rapidement" is softened — no speed guarantee, only that CORO structures production and duration depends on
 * organization size and scope.
 * The hero (five people reviewing continuity materials, wall screen and paper diagram with invented editorial labels) is
 * a MARKETING / EDITORIAL ILLUSTRATION (decorative, alt=""), never product proof; none of its on-screen labels are used
 * as sourced content — the page's own categories are derived only from the verified V1/ISO text.
 * VISUAL SIGNATURE (Guide family rule confirmed by PMU + PSI — do not clone either): PCA's own three moments are (1) a
 * navy five-source "what can interrupt your critical activities" composition, drawn verbatim from the guide's own intro
 * paragraph; (2) a two-term RTO/RPO glossary (large stacked definitions, not a numbered ledger); (3) a PCA vs PRA
 * comparison split that keeps the PRA-is-Phase-2 boundary visible in its own column.
 *
 * MIG-05D-B (visual character, density & claim-precision pass — the first PCA composition was rejected on visual
 * review): new "CONTINUER" typographic anchor beside the six existing PCA components (§4) — an editorial concept, not ISO
 * terminology, and explicitly not PSI's "PSI"/01-07 composition. RTO/RPO (§5) strengthened with a plain-language question
 * above each technical term. The ISO section (§6) recomposed into a left/right split: normative explanation + three
 * concepts already present in the ISO clause itself (Exercer / Réviser / Améliorer) — no new normative claim. PCA vs PRA
 * (§7) rebuilt as a major two-territory comparison ("Continuer" vs "Rétablir"), the strongest section on the page,
 * keeping the PRA-is-Phase-2 status visible in its own column. Navy interruption sources (§3) kept unchanged — it was
 * approved and reworking it for novelty alone was explicitly out of scope.
 * CLAIM REVIEW (MIG-05D-B) — sectors/applicability (§2): audited per category rather than grouped under one
 * over-generalized "exigé ou fortement recommandé" claim. Financial institutions: VERIFIED (OSFI/BSIF guideline E-21
 * applies to federally regulated financial institutions). Federal government institutions: VERIFIED (Politique sur la
 * sécurité du gouvernement du Canada requires continuity provisions in emergency management plans) — narrowed from V1's
 * broader "services gouvernementaux et fournisseurs de services essentiels" (essential-service providers generally are
 * NOT covered by that specific policy). Health-care organizations: REFINE — no single source found, generalized to
 * "selon les exigences propres à leur secteur et leur province" rather than stated as a flat requirement. ISO
 * 22301-certified organizations: REFRAMED — this is a voluntary certification status, not a sector; presented as such.
 * The section heading is REWRITTEN from "Exigé ou fortement recommandé selon le secteur" to a neutral, evidence-based
 * "Des exigences qui dépendent du secteur et du contexte." FAQ wording updated to match.
 */
const copy = {
  metaTitle: 'Plan de continuité des activités (PCA) : contenu, ISO 22301, PCA vs PRA',
  description: 'Qu’est-ce qu’un plan de continuité des activités, ce qu’il doit contenir (BIA, activités critiques, RTO/RPO, stratégies), la référence ISO 22301 et la différence avec un PRA.',
  label: 'Guide', code: 'PCA',
  lines: ['Plan de continuité', 'des activités (PCA).'],
  lead: 'Le plan de continuité des activités garantit qu’une organisation peut maintenir ses activités critiques lors d’une interruption majeure : sinistre, panne informatique, pandémie, perte d’accès aux locaux ou défaillance d’un fournisseur clé.',
  read: 'Lire le guide', guides: 'Voir tous les guides',
  s1: { n: '01', label: 'Qu’est-ce qu’un PCA', title: 'Le document qui protège vos activités critiques.',
    text: 'Le PCA est un document stratégique qui identifie les activités critiques d’une organisation, évalue les risques d’interruption et définit les mesures pour maintenir ou reprendre rapidement ces activités en cas de sinistre. La norme internationale de référence est l’ISO 22301 — Sécurité et résilience — Systèmes de management de la continuité des activités.' },
  s2: { n: '02', label: 'Applicabilité', title: 'Des exigences qui dépendent du secteur et du contexte.',
    text: 'Il n’existe pas de loi unique rendant le PCA obligatoire pour toutes les organisations canadiennes. Selon le secteur et le contexte, il peut être explicitement exigé, implicitement requis ou volontairement adopté.',
    contexts: [
      { title: 'Institutions financières fédérales', text: 'La ligne directrice E-21 (Gestion du risque opérationnel et résilience) du BSIF s’applique aux institutions financières sous réglementation fédérale.' },
      { title: 'Institutions du gouvernement fédéral', text: 'La Politique sur la sécurité du gouvernement du Canada exige que les plans de gestion des urgences des institutions fédérales incluent des mesures de continuité des opérations.' },
      { title: 'Organisations de soins de santé', text: 'Des exigences de continuité existent, propres à chaque secteur de la santé et à chaque province.' },
      { title: 'Organisations certifiées ISO 22301', text: 'La certification est volontaire ; elle impose ensuite de répondre aux exigences de la norme.' },
    ] as const },
  s3: { n: '03', label: 'Sources d’interruption', title: 'Ce qui peut interrompre vos activités critiques.',
    text: 'Ces cinq sources sont celles que le PCA doit couvrir en priorité ; elles ne sont pas classées par gravité et leur probabilité varie selon l’organisation.',
    triggers: [
      { title: 'Sinistre', text: 'Incendie, dégât d’eau ou autre événement affectant les locaux.' },
      { title: 'Panne informatique', text: 'Perte d’accès aux systèmes ou aux données de l’organisation.' },
      { title: 'Pandémie', text: 'Indisponibilité soudaine d’une partie importante du personnel.' },
      { title: 'Perte d’accès aux locaux', text: 'Impossibilité d’occuper le site habituel des activités.' },
      { title: 'Défaillance d’un fournisseur clé', text: 'Interruption d’un service ou d’une ressource externe essentielle.' },
    ] as const },
  s4: { n: '04', label: 'Contenu d’un PCA complet', title: 'Six éléments structurants.',
    items: [
      ['Analyse d’impact sur les activités (BIA)', 'Business Impact Analysis : évalue les conséquences d’une interruption sur chaque activité.'],
      ['Activités critiques et délais tolérables', 'Les activités qui ne peuvent rester interrompues, avec leurs objectifs de reprise (RTO/RPO).'],
      ['Stratégies de continuité', 'Les mesures prévues pour maintenir ou reprendre rapidement les activités critiques.'],
      ['Procédures de mise en œuvre', 'Les étapes concrètes pour activer les stratégies de continuité.'],
      ['Plan de communication de crise', 'Les modalités de communication interne et externe pendant l’interruption.'],
      ['Programme de tests et d’exercices', 'La validation régulière des stratégies et procédures du PCA.'],
    ] as const },
  s5: { n: '05', label: 'RTO et RPO', title: 'Deux repères pour prioriser la reprise.',
    terms: [
      { word: 'RTO', name: 'Recovery Time Objective', text: 'Le délai maximal acceptable pour reprendre une activité après une interruption.' },
      { word: 'RPO', name: 'Recovery Point Objective', text: 'La quantité maximale de données qu’une organisation peut se permettre de perdre, exprimée en temps.' },
    ] as const },
  s6: { n: '06', label: 'Norme et tests', title: 'Un système géré en continu.',
    text: 'L’ISO 22301:2019 définit les exigences pour planifier, établir, mettre en œuvre, exploiter, surveiller, réviser, maintenir et améliorer continuellement un système de management de la continuité des activités.',
    concepts: [
      ['Exercer', 'Le PCA doit être testé selon un programme d’exercices adapté aux activités et au profil de risque de l’organisation.'],
      ['Réviser', 'Le plan est révisé après chaque test, après tout changement organisationnel significatif ou après l’activation réelle du plan.'],
      ['Améliorer', 'Les résultats des tests et révisions alimentent l’amélioration continue du système de management.'],
    ] as const },
  s7: { n: '07', label: 'PCA et PRA', title: 'Complémentaires, pas interchangeables.',
    duel: [
      { code: 'PCA', word: 'Continuer', text: 'Maintenir les activités critiques pendant une interruption.', status: 'Disponible dans CORO Documents.' },
      { code: 'PRA', word: 'Rétablir', text: 'Rétablir les systèmes, ressources et opérations après l’interruption.', status: 'Guide disponible · Production CORO prévue en phase 2.' },
    ] as const,
    link: 'Consulter le guide du PRA' },
  s8: { n: '08', label: 'CORO Documents', title: 'Le PCA est disponible dans CORO.',
    text: 'CORO structure la rédaction du PCA avec des modèles adaptés au secteur d’activité : les modules de gestion des ressources critiques, les listes de contacts et les procédures d’activation sont intégrés à la plateforme, avec export en document PDF professionnel.',
    cta: 'Découvrir CORO Documents' },
  res: { label: 'Ressources', title: 'Pour approfondir', items: [
    { slug: 'que-doit-contenir-plan-continuite-activites-pca', title: 'Que doit contenir un plan de continuité des activités (PCA) ?', text: 'Le détail des éléments attendus dans un PCA complet.' },
    { slug: 'bia-rto-rpo-priorites-continuite', title: 'BIA, RTO et RPO : comment définir les priorités de continuité ?', text: 'Comment ces trois repères s’articulent dans un PCA.' },
    { slug: 'identifier-activites-critiques-entreprise', title: 'Comment identifier les activités critiques d’une entreprise ?', text: 'La démarche pour prioriser les activités à protéger en premier.' },
    { slug: 'pca-vs-pra-difference', title: 'PCA vs PRA : quelle est la différence ?', text: 'Comment distinguer les deux documents et savoir lequel est requis.' },
  ] as const },
  faq: 'Questions fréquentes', faqLabel: 'FAQ',
  faqItems: [
    { q: 'Le PCA est-il obligatoire?', a: 'Il n’existe pas de loi unique rendant le PCA obligatoire pour toutes les organisations canadiennes. Il est explicitement exigé pour les institutions financières fédérales (ligne directrice E-21) et les institutions du gouvernement fédéral, requis pour les organisations certifiées ISO 22301, et recommandé selon le secteur et la province pour les organisations de soins de santé.' },
    { q: 'Quelle est la différence entre un PCA et un PRA?', a: 'Le PCA vise à maintenir les activités critiques pendant une interruption. Le PRA se concentre sur le retour à la normale après l’interruption : rétablir les systèmes et ressources. Les deux sont complémentaires.' },
    { q: 'Qu’est-ce que le RTO et le RPO?', a: 'Le RTO (Recovery Time Objective) est le délai maximal acceptable pour reprendre une activité. Le RPO (Recovery Point Objective) est la quantité maximale de données qu’on peut se permettre de perdre, exprimée en temps.' },
    { q: 'Combien de temps faut-il pour développer un PCA?', a: 'CORO structure la production du PCA à partir de modèles adaptés au secteur d’activité. La durée dépend de la taille de l’organisation et du nombre d’activités critiques à couvrir.' },
  ],
  statement: 'Le PCA maintient vos activités critiques, quoi qu’il arrive.',
  support: 'Découvrez comment CORO structure la production du PCA à partir des activités critiques de votre organisation.',
};

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/documents/plan-continuite-activites-pca', locale: l, hasEnglish: false, title: copy.metaTitle, description: copy.description });
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
      { '@type': 'ListItem', position: 3, name: t.code, item: 'https://getcoro.io/documents/plan-continuite-activites-pca' },
    ],
  };
  return (
    <V2Shell locale={l} pathname="/documents/plan-continuite-activites-pca" englishAvailable={false}>
      <JsonLd value={faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))} />
      <JsonLd value={breadcrumbLd} />

      <EditorialHero id="pca-title" label={`${t.label} · ${t.code}`} title={t.lines} lead={t.lead}
        photo={{ src: '/website-v2/guides/guide-pca-business-continuity.webp', side: 'end', position: '50% 38%', mobilePosition: '50% 32%', coverage: 55, mobileRatio: '16 / 11' }}
        actions={<><Button href="#s1" surface="dark">{t.read}</Button><Button href={localizedHref('/guides', l)} variant="ghost" surface="dark">{t.guides}</Button></>} />

      <PageSection tone="white" density="compact" id="s1" labelledBy="pca-s1-title">
        <EditorialBlock id="pca-s1-title" label={`${t.s1.n} — ${t.s1.label}`} heading={t.s1.title}><p>{t.s1.text}</p></EditorialBlock>
      </PageSection>

      <PageSection tone="soft" labelledBy="pca-s2-title">
        <div className={styles.contextWrap}>
          <EditorialBlock id="pca-s2-title" label={`${t.s2.n} — ${t.s2.label}`} heading={t.s2.title}><p>{t.s2.text}</p></EditorialBlock>
          <ul className={styles.contextBlocks} aria-label={t.s2.title}>{t.s2.contexts.map((c) => <li key={c.title} className={styles.contextBlock}><h3>{c.title}</h3><p>{c.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="pca-s3-title">
        <div className={styles.stack}>
          <EditorialBlock id="pca-s3-title" label={`${t.s3.n} — ${t.s3.label}`} heading={t.s3.title}><p>{t.s3.text}</p></EditorialBlock>
          <ul className={styles.triggers} aria-label={t.s3.title}>{t.s3.triggers.map((item) => <li key={item.title} className={styles.trigger}><h3>{item.title}</h3><p>{item.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="pca-s4-title">
        <div className={styles.stack}>
          <EditorialBlock id="pca-s4-title" label={`${t.s4.n} — ${t.s4.label}`} heading={t.s4.title} />
          <div className={styles.continueWrap}>
            <p className={styles.continueAnchor}>Continuer<span>Les activités critiques</span></p>
            <ul className={styles.rows}>{t.s4.items.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ul>
          </div>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="pca-s5-title">
        <div className={styles.stack}>
          <EditorialBlock id="pca-s5-title" label={`${t.s5.n} — ${t.s5.label}`} heading={t.s5.title} />
          <ul className={styles.glossary} aria-label={t.s5.title}>
            <li className={styles.term}><p className={styles.glossaryQ}>Combien de temps ?</p><p className={styles.termWord}>RTO</p><EditorialBlock heading={t.s5.terms[0].name} level="h3" size="md"><p>{t.s5.terms[0].text}</p></EditorialBlock></li>
            <li className={styles.term}><p className={styles.glossaryQ}>Combien de données ?</p><p className={styles.termWord}>RPO</p><EditorialBlock heading={t.s5.terms[1].name} level="h3" size="md"><p>{t.s5.terms[1].text}</p></EditorialBlock></li>
          </ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="pca-s6-title">
        <div className={styles.isoWrap}>
          <EditorialBlock id="pca-s6-title" label={`${t.s6.n} — ${t.s6.label}`} heading={t.s6.title}><p>{t.s6.text}</p></EditorialBlock>
          <ul className={styles.isoConcepts} aria-label={t.s6.title}>{t.s6.concepts.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="pca-s7-title">
        <div className={styles.stack}>
          <EditorialBlock id="pca-s7-title" label={`${t.s7.n} — ${t.s7.label}`} heading={t.s7.title} />
          <ul className={styles.duel}>{t.s7.duel.map((item) => <li key={item.code} className={styles.duelSide}><p className={styles.duelCode}>{item.code}</p><p className={styles.duelWord}>{item.word}</p><p>{item.text}</p><p className={styles.duelStatus}>{item.status}</p></li>)}</ul>
          <div className={styles.linkCard}><a className={styles.linkCardLink} href={localizedHref('/documents/plan-reprise-activites-pra', l)}>{t.s7.link}<span aria-hidden="true"> →</span></a></div>
        </div>
      </PageSection>

      <PageSection tone="white" density="compact" labelledBy="pca-s8-title">
        <SplitContent ratio="7-5" align="start"
          text={<EditorialBlock id="pca-s8-title" label={`${t.s8.n} — ${t.s8.label}`} heading={t.s8.title}><p>{t.s8.text}</p></EditorialBlock>}
          media={<div className={styles.linkCard}><a className={styles.linkCardLink} href={localizedHref('/gestion-documentaire', l)}>{t.s8.cta}<span aria-hidden="true"> →</span></a></div>} />
      </PageSection>

      <PageSection tone="soft" density="compact" labelledBy="pca-res-title">
        <div className={styles.stack}>
          <EditorialBlock id="pca-res-title" label={t.res.label} heading={t.res.title} />
          <ul className={styles.rows}>{t.res.items.map((r) => <li key={r.slug}><h3><a className={styles.link} href={localizedHref(`/blog/${r.slug}`, l)}>{r.title}</a></h3><p>{r.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="pca-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="pca-faq-title" label={t.faqLabel} heading={t.faq} />
          <Accordion label={t.faq} items={t.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="pca-cta-title" tone="dark" label={`${t.label} · ${t.code}`} statement={t.statement} support={t.support} primary={{ label: 'Demander une démonstration', href: demo }} secondary={{ label: t.guides, href: localizedHref('/guides', l) }} />
    </V2Shell>
  );
}
