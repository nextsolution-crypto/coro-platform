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
 * /documents/plan-reprise-activites-pra (MIG-05F) — fifth of six document guides migrated to V2. Built to final
 * editorial and visual quality on this first pass (method confirmed by PGC in MIG-05E — no separate density/character
 * pass needed). Editorial guide first, CORO roadmap context second.
 * Authority: docs/website-v2/05-migration/MIG-05-GUIDES-GATE.md (PRA preservation matrix and normative matrix,
 * MIG-05F section).
 * LANGUAGE: FR ONLY (englishAvailable={false}) — the V1 page had no searchParams handling at all (?lang=en rendered
 * the identical French page, confirmed in the baseline); no translation is invented here.
 * PRODUCT BOUNDARY — CRITICAL: PRA production in CORO is PHASE 2, unlike PMU/PSI/PCA. Never says "disponible dans
 * CORO", "Générer votre PRA" or "Produire votre PRA" — that exact overclaim existed in V1's hero CTA ("Structurer
 * votre PRA avec CORO"), directly contradicting V1's own Phase-2 banner one row below it. REMOVED. Only claim: the
 * GUIDE is available today; CORO production is explicitly "prévue en phase 2". No automatic recovery, dependency
 * mapping or RTO/RPO calculation is claimed anywhere.
 * NORMATIVE AUDIT (verified during MIG-05F, see the gate's matrix): ISO 22301:2019 VERIFIED (iso.org blocks scripted
 * requests with a 403 — bot protection, not a dead standard). ISO/IEC 27031:2011 VERIFIED as a real, still-valid
 * designation for ICT readiness for business continuity (a newer FDIS 27031:2024 exists but does not invalidate the
 * 2011 citation). The V1 claim "doit être testé au moins une fois par année" is REMOVED — ISO 22301 clause 8.5
 * requires a regular exercise programme but does not mandate a fixed annual figure; same family lesson already
 * applied to PMU/PSI/PCA/PGC. The Government of Canada source link could not be re-verified live during this pass
 * (transient network failure, 000) but was independently confirmed 200 during MIG-05D for the same URL — kept, with
 * the limitation recorded in the gate. The V1 FAQ claim that CORO "intègre un module de suivi des exercices" for PRA
 * specifically is REMOVED — PRA production is Phase 2, so no CORO feature tied to PRA testing is currently promoted.
 * The hero (four people reviewing a "PRA — Reprise des systèmes" dashboard with fictional live-looking status
 * indicators — "En ligne", "Complétées", "Prêt", "Planifiés" — and a hand-drawn recovery-flow diagram) is a
 * MARKETING / EDITORIAL ILLUSTRATION (decorative, alt=""), never product proof; no fact, sequence or category on this
 * page is derived from what is drawn in it — including the diagram's arrow flow, which is NOT reproduced as this
 * page's recovery model.
 * VISUAL SIGNATURE (Guide family rule confirmed by PMU + PSI + PCA + PGC — do not clone any): PRA's own three moments
 * are (1) a solo "RÉTABLIR" typographic statement with no adjacent ledger — deliberately not a third instance of the
 * anchor+list pattern already used by PSI and PCA; (2) a 2x2 recovery-domain matrix (Systèmes/Données/Ressources/
 * Locaux); (3) a navy ASYMMETRIC composition — one dominant territory ("Prioriser") beside two smaller supporting
 * territories ("Restaurer"/"Valider"), distinct from every prior guide's navy geometry.
 * RTO/RPO: NOT duplicated from PCA's dedicated glossary moment — referenced here as recovery constraints already
 * established by the continuity analysis, with a contextual link to the PCA guide's fuller treatment.
 */
const copy = {
  metaTitle: 'Plan de reprise des activités (PRA) : domaines de reprise, PCA vs PRA',
  description: 'Qu’est-ce qu’un plan de reprise des activités, la différence avec le PCA, les domaines de reprise, les priorités de restauration et les normes ISO 22301 / ISO-IEC 27031.',
  label: 'Guide', code: 'PRA',
  lines: ['Plan de reprise', 'des activités (PRA).'],
  lead: 'Le plan de reprise des activités définit les procédures permettant à une organisation de restaurer ses activités normales après un sinistre ou une interruption majeure. Il complète le PCA en se concentrant sur le retour à la normale.',
  read: 'Lire le guide', guides: 'Voir tous les guides',
  s1: { n: '01', label: 'Qu’est-ce qu’un PRA', title: 'Le document qui guide le retour à la normale.',
    text: 'Le PRA (aussi appelé DRP — Disaster Recovery Plan) définit les étapes pour restaurer les systèmes, les données, les infrastructures et les opérations après une interruption. Il précise les priorités de reprise, les objectifs de délai de reprise (RTO) et les objectifs de point de reprise (RPO). La norme de référence est la série ISO 22301, et pour les aspects informatiques, la norme ISO/IEC 27031.' },
  s2: { n: '02', label: 'PRA et PCA', title: 'Deux plans complémentaires, deux perspectives.',
    comparison: [
      { code: 'PCA', text: 'Maintient les activités critiques pendant l’interruption.', status: 'Disponible dans CORO Documents.' },
      { code: 'PRA', text: 'Rétablit les systèmes, les ressources et les capacités nécessaires après l’interruption.', status: 'Guide disponible · Production CORO prévue en phase 2.' },
    ] as const,
    text: 'Dans la pratique, les deux plans fonctionnent en séquence : le PCA prend le relais lors de l’interruption, le PRA guide le retour à la normale. Ils doivent être développés ensemble pour assurer une couverture complète.',
    link: 'Consulter le guide du PCA' },
  s3: { n: '03', label: 'Le retour à la normale', title: 'Ce que le PRA existe pour faire.', statement: 'Rétablir',
    support: 'Restaurer les systèmes, les données, les infrastructures et les opérations pour revenir à des activités normales après un sinistre.' },
  s4: { n: '04', label: 'Domaines de reprise', title: 'Ce qu’un PRA complet couvre.',
    domains: [
      ['Systèmes', 'L’inventaire des systèmes critiques et les objectifs de reprise (RTO/RPO) propres à chacun.'],
      ['Données', 'Les sauvegardes et les objectifs de point de reprise associés à chaque système.'],
      ['Ressources', 'Les équipements de remplacement et les services infonuagiques envisagés comme stratégies de reprise.'],
      ['Locaux', 'Les sites de secours, lorsque la stratégie de reprise en prévoit un.'],
    ] as const },
  s5: { n: '05', label: 'Priorités de reprise', title: 'Restaurer dans le bon ordre, puis valider.',
    text: 'Un PRA complet précise les procédures de restauration par ordre de priorité, les responsabilités de chaque équipe et les procédures de validation avant un retour à des opérations normales.',
    priority: { title: 'Prioriser', text: 'Les procédures de restauration sont ordonnées par priorité, propre à chaque organisation — il n’existe pas d’ordre universel.' },
    support: [
      ['Restaurer', 'Chaque équipe impliquée connaît ses responsabilités dans la restauration des systèmes, données et ressources qui la concernent.'],
      ['Valider', 'Le retour à des opérations normales est confirmé par des procédures de validation avant la reprise complète.'],
    ] as const },
  s6: { n: '06', label: 'PRA informatique et opérationnel', title: 'Deux dimensions, un seul plan.',
    blocks: [
      ['PRA informatique', 'Se concentre sur la restauration des systèmes technologiques, encadré par la norme ISO/IEC 27031.'],
      ['PRA opérationnel', 'Couvre la reprise des processus métiers ; un PRA complet intègre les deux dimensions et leurs interdépendances.'],
    ] as const },
  s7: { n: '07', label: 'RTO et RPO', title: 'Des repères déjà établis par l’analyse de continuité.',
    text: 'Le RTO (délai maximal acceptable pour reprendre une activité) et le RPO (quantité maximale de données qu’une organisation peut se permettre de perdre) guident les priorités de restauration du PRA ; ils sont établis lors de l’analyse de continuité qui alimente le PCA.',
    link: 'Voir le repère RTO/RPO du guide PCA' },
  s8: { n: '08', label: 'Tests et révision', title: 'Un plan non testé est un plan non fiable.',
    blocks: [
      ['Tests', 'Les tests peuvent être partiels (restauration d’un système spécifique) ou complets (simulation d’une reprise totale), à intervalle régulier adapté à la criticité.'],
      ['Révision', 'Chaque test est documenté et ses enseignements sont intégrés au plan.'],
    ] as const },
  s9: { n: '09', label: 'PRA dans CORO', title: 'Le PRA dans CORO : une capacité prévue en phase 2.',
    facts: [
      { label: 'Guide', text: 'Disponible dès aujourd’hui, sur cette page.' },
      { label: 'Production dans CORO', text: 'Guide disponible · Production CORO prévue en phase 2.' },
    ] as const,
    cta: 'Voir les documents disponibles aujourd’hui' },
  res: { label: 'Ressources', title: 'Pour approfondir', items: [
    { slug: 'pca-vs-pra-difference', title: 'PCA vs PRA : quelle est la différence ?', text: 'Comment distinguer les deux documents et savoir lequel est requis.' },
    { slug: 'bia-rto-rpo-priorites-continuite', title: 'BIA, RTO et RPO : comment définir les priorités de continuité ?', text: 'Comment ces repères guident les priorités de reprise.' },
  ] as const },
  faq: 'Questions fréquentes', faqLabel: 'FAQ',
  faqItems: [
    { q: 'Quelle est la différence entre RTO et RPO?', a: 'Le RTO (Recovery Time Objective) est le délai maximal acceptable pour reprendre une activité après une interruption. Le RPO (Recovery Point Objective) est la quantité maximale de données qu’on peut se permettre de perdre, exprimée en durée (ex. : 4 heures = on accepte de perdre au maximum 4 heures de données).' },
    { q: 'Le PRA s’applique-t-il uniquement à l’informatique?', a: 'Non. Le PRA couvre toutes les ressources critiques : systèmes informatiques, équipements, fournisseurs, locaux et personnel.' },
    { q: 'Doit-on avoir un site de secours?', a: 'Pas nécessairement. Les stratégies de reprise peuvent inclure le télétravail, des ententes avec des fournisseurs alternatifs ou l’utilisation de services infonuagiques. Le PRA définit la stratégie adaptée à votre organisation.' },
    { q: 'Le PRA doit-il être testé?', a: 'Absolument. Un plan non testé est un plan non fiable ; chaque test doit être documenté et ses enseignements intégrés au plan.' },
  ],
  statement: 'Le PRA guide le retour à des activités normales.',
  support: 'Préparez aujourd’hui les conditions de votre reprise et la place du PRA dans votre stratégie de résilience.',
};

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/documents/plan-reprise-activites-pra', locale: l, hasEnglish: false, title: copy.metaTitle, description: copy.description });
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
      { '@type': 'ListItem', position: 3, name: t.code, item: 'https://getcoro.io/documents/plan-reprise-activites-pra' },
    ],
  };
  return (
    <V2Shell locale={l} pathname="/documents/plan-reprise-activites-pra" englishAvailable={false}>
      <JsonLd value={faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))} />
      <JsonLd value={breadcrumbLd} />

      <EditorialHero id="pra-title" label={`${t.label} · ${t.code}`} title={t.lines} lead={t.lead}
        photo={{ src: '/website-v2/guides/guide-pra-disaster-recovery.webp', side: 'end', position: '50% 38%', mobilePosition: '50% 32%', coverage: 55, mobileRatio: '16 / 11' }}
        actions={<><Button href="#s1" surface="dark">{t.read}</Button><Button href={localizedHref('/guides', l)} variant="ghost" surface="dark">{t.guides}</Button></>} />

      <PageSection tone="white" density="compact" id="s1" labelledBy="pra-s1-title">
        <EditorialBlock id="pra-s1-title" label={`${t.s1.n} — ${t.s1.label}`} heading={t.s1.title}><p>{t.s1.text}</p></EditorialBlock>
      </PageSection>

      <PageSection tone="soft" labelledBy="pra-s2-title">
        <div className={styles.stack}>
          <EditorialBlock id="pra-s2-title" label={`${t.s2.n} — ${t.s2.label}`} heading={t.s2.title}><p>{t.s2.text}</p></EditorialBlock>
          <ul className={styles.comparison}>{t.s2.comparison.map((item) => <li key={item.code}><h3>{item.code}</h3><p>{item.text}</p><p className={styles.comparisonStatus}>{item.status}</p></li>)}</ul>
          <div className={styles.linkCard}><a className={styles.linkCardLink} href={localizedHref('/documents/plan-continuite-activites-pca', l)}>{t.s2.link}<span aria-hidden="true"> →</span></a></div>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="pra-s3-title">
        <EditorialBlock id="pra-s3-title" label={`${t.s3.n} — ${t.s3.label}`} heading={t.s3.title}>
          <p className={styles.statement}>{t.s3.statement}</p>
          <p className={styles.statementSupport}>{t.s3.support}</p>
        </EditorialBlock>
      </PageSection>

      <PageSection tone="soft" labelledBy="pra-s4-title">
        <div className={styles.stack}>
          <EditorialBlock id="pra-s4-title" label={`${t.s4.n} — ${t.s4.label}`} heading={t.s4.title} />
          <ul className={styles.domains}>{t.s4.domains.map(([name, text]) => <li key={name} className={styles.domain}><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="pra-s5-title">
        <div className={styles.stack}>
          <EditorialBlock id="pra-s5-title" label={`${t.s5.n} — ${t.s5.label}`} heading={t.s5.title}><p>{t.s5.text}</p></EditorialBlock>
          <div className={styles.priorityWrap}>
            <div className={styles.priorityMain}><h3>{t.s5.priority.title}</h3><p>{t.s5.priority.text}</p></div>
            <ul className={styles.supportList}>{t.s5.support.map(([name, text]) => <li key={name} className={styles.supportItem}><h3>{name}</h3><p>{text}</p></li>)}</ul>
          </div>
        </div>
      </PageSection>

      <PageSection tone="white" density="compact" labelledBy="pra-s6-title">
        <div className={styles.stack}>
          <EditorialBlock id="pra-s6-title" label={`${t.s6.n} — ${t.s6.label}`} heading={t.s6.title} />
          <ul className={`${styles.rows} ${styles.pair}`}>{t.s6.blocks.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="soft" density="compact" labelledBy="pra-s7-title">
        <div className={styles.stack}>
          <EditorialBlock id="pra-s7-title" label={`${t.s7.n} — ${t.s7.label}`} heading={t.s7.title}><p>{t.s7.text}</p></EditorialBlock>
          <div className={styles.linkCard}><a className={styles.linkCardLink} href={localizedHref('/documents/plan-continuite-activites-pca', l)}>{t.s7.link}<span aria-hidden="true"> →</span></a></div>
        </div>
      </PageSection>

      <PageSection tone="white" density="compact" labelledBy="pra-s8-title">
        <div className={styles.stack}>
          <EditorialBlock id="pra-s8-title" label={`${t.s8.n} — ${t.s8.label}`} heading={t.s8.title} />
          <ul className={`${styles.rows} ${styles.pair}`}>{t.s8.blocks.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="soft" density="compact" labelledBy="pra-s9-title">
        <div className={styles.stack}>
          <EditorialBlock id="pra-s9-title" label={`${t.s9.n} — ${t.s9.label}`} heading={t.s9.title} />
          <ul className={styles.phaseWrap}>{t.s9.facts.map((f) => <li key={f.label}><h3>{f.label}</h3><p>{f.text}</p></li>)}</ul>
          <div className={styles.linkCard}><a className={styles.linkCardLink} href={localizedHref('/gestion-documentaire', l)}>{t.s9.cta}<span aria-hidden="true"> →</span></a></div>
        </div>
      </PageSection>

      <PageSection tone="white" density="compact" labelledBy="pra-res-title">
        <div className={styles.stack}>
          <EditorialBlock id="pra-res-title" label={t.res.label} heading={t.res.title} />
          <ul className={styles.rows}>{t.res.items.map((r) => <li key={r.slug}><h3><a className={styles.link} href={localizedHref(`/blog/${r.slug}`, l)}>{r.title}</a></h3><p>{r.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="pra-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="pra-faq-title" label={t.faqLabel} heading={t.faq} />
          <Accordion label={t.faq} items={t.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="pra-cta-title" tone="dark" label={`${t.label} · ${t.code}`} statement={t.statement} support={t.support} primary={{ label: 'Demander une démonstration', href: demo }} secondary={{ label: t.guides, href: localizedHref('/guides', l) }} />
    </V2Shell>
  );
}
