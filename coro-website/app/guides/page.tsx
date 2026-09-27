import type { Metadata } from 'next';
import { CTASection } from '@/components/conversion/CTASection';
import { Accordion } from '@/components/page/Accordion';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { EditorialHero } from '@/components/page/EditorialHero';
import { MediaFrame } from '@/components/page/MediaFrame';
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
 * /guides (MIG-05A) — editorial navigation hub for the six document guides. Answers "quel document répond à quel besoin?".
 * NOT a blog archive, a pricing page or a six-card acronym catalogue. Authority: docs/website-v2/05-migration/MIG-05-GUIDES-GATE.md.
 * LANGUAGE: FR ONLY (englishAvailable={false}). No individual guide is migrated or rewritten here.
 * PRODUCT BOUNDARY (verified in CLAUDE.md and coro-backend/src/pca): PMU, PSI, PCA have a working CORO Documents configurator today.
 * PGC, PRA, PUE are valid educational guides now, with CORO production planned for Phase 2 — their guide is not "unavailable knowledge".
 * GUIDE AVAILABILITY (all six, today) is never conflated with CORO GENERATOR AVAILABILITY (PMU/PSI/PCA only).
 * The hero and the six preview images are MARKETING / EDITORIAL ILLUSTRATIONS (decorative, alt=""), never product proof: no interface,
 * map, dashboard or status shown in an image is read as a CORO screenshot or a real capability.
 */
const copy = {
  metaTitle: 'Guides des plans de mesures d’urgence et de résilience',
  description: 'Six plans, une question chacun : préparation, sécurité incendie, continuité, gestion de crise, reprise et urgence environnementale. Trouvez celui qui répond à votre besoin.',
  label: 'Guides',
  lines: ['Le bon document,', 'pour le bon besoin.'],
  lead: 'Préparation, sécurité incendie, continuité, gestion de crise, reprise des systèmes, urgence environnementale : six plans répondent à des besoins différents. Ces guides expliquent ce que chacun couvre, pour qui, et comment il s’articule avec les autres.',
  explore: 'Explorer les guides', tileExplore: 'Lire le guide', docs: 'Découvrir CORO Documents',
  s1: { n: '01', label: 'Pourquoi ces documents diffèrent', title: 'Chaque plan répond à une question différente.',
    text: 'Un plan de mesures d’urgence, un plan de sécurité incendie et un plan de continuité des activités ne couvrent pas le même besoin, même s’ils sont souvent confondus. Certains sont des documents distincts ; d’autres s’imbriquent. Ces guides expliquent le rôle propre de chacun avant d’entrer dans le détail.' },
  s2: { n: '02', label: 'Guides disponibles aujourd’hui', title: 'Disponibles dans CORO Documents.',
    text: 'CORO permet aujourd’hui de produire ces trois documents : procédures intégrées, génération, approbation et export PDF bilingue.',
    items: [
      { code: 'PMU', name: 'Plan de mesures d’urgence', need: 'Préparer l’organisation à toute situation d’urgence.', img: 'guide-pmu-emergency-measures', href: '/documents/plan-mesures-urgence-pmu' },
      { code: 'PSI', name: 'Plan de sécurité incendie', need: 'Structurer la sécurité incendie d’un bâtiment.', img: 'guide-psi-fire-safety', href: '/documents/plan-securite-incendie-psi' },
      { code: 'PCA', name: 'Plan de continuité des activités', need: 'Maintenir les activités critiques pendant une interruption.', img: 'guide-pca-business-continuity', href: '/documents/plan-continuite-activites-pca' },
    ] as const, status: 'Disponible dans CORO' },
  s3: { n: '03', label: 'Familles complémentaires', title: 'Guides disponibles, production CORO prévue en Phase 2.',
    text: 'Ces trois plans ont un guide complet dès aujourd’hui. Leur production dans CORO Documents est prévue en phase 2 : le guide n’est pas moins complet pour autant.',
    items: [
      { code: 'PGC', name: 'Plan de gestion de crise', need: 'Organiser la gouvernance et la décision en situation de crise.', img: 'guide-pgc-crisis-management', href: '/documents/plan-gestion-crise-pgc' },
      { code: 'PRA', name: 'Plan de reprise des activités', need: 'Rétablir les systèmes technologiques et leurs dépendances.', img: 'guide-pra-disaster-recovery', href: '/documents/plan-reprise-activites-pra' },
      { code: 'PUE', name: 'Plan d’urgence environnementale', need: 'Planifier une urgence environnementale en contexte industriel.', img: 'guide-pue-environmental-emergency', href: '/documents/plan-urgence-environnementale-pue' },
    ] as const, status: 'Guide disponible · Production CORO prévue en phase 2' },
  s4: { n: '04', label: 'Comment ces documents s’articulent', title: 'Préparer, protéger, poursuivre, coordonner, rétablir, répondre.',
    text: 'Ces six plans peuvent se compléter selon la réalité de l’organisation. Aucune hiérarchie universelle ne s’applique à toutes les organisations : la première étape est toujours une analyse de la situation propre à chacune.',
    purposes: [
      ['PMU', 'Préparer', 'Le PMU couvre l’ensemble des situations d’urgence propres à l’organisation.'],
      ['PSI', 'Protéger', 'Le PSI structure la sécurité incendie du bâtiment ; il peut s’intégrer au PMU comme plan maître.'],
      ['PCA', 'Poursuivre', 'Le PCA maintient les activités critiques pendant une interruption.'],
      ['PGC', 'Coordonner', 'Le PGC gère la décision et la communication lors d’une crise à fort impact.'],
      ['PRA', 'Rétablir', 'Le PRA restaure les systèmes et les ressources après l’interruption ; il complète le PCA.'],
      ['PUE', 'Répondre à un risque environnemental', 'Le PUE prépare une réponse spécifique aux incidents environnementaux en contexte industriel.'],
    ] as const },
  s5: { n: '05', label: 'Choisir par besoin', title: 'Par où commencer.',
    rows: [
      ['Je dois préparer l’organisation aux urgences', 'PMU', '/documents/plan-mesures-urgence-pmu'],
      ['Je dois structurer la sécurité incendie d’un bâtiment', 'PSI', '/documents/plan-securite-incendie-psi'],
      ['Je dois maintenir mes activités critiques', 'PCA', '/documents/plan-continuite-activites-pca'],
      ['Je dois organiser la gouvernance en situation de crise', 'PGC', '/documents/plan-gestion-crise-pgc'],
      ['Je dois rétablir mes systèmes technologiques', 'PRA', '/documents/plan-reprise-activites-pra'],
      ['Je dois planifier une urgence environnementale', 'PUE', '/documents/plan-urgence-environnementale-pue'],
    ] as const },
  s6: { n: '06', label: 'CORO Documents', title: 'Produire PMU, PSI et PCA dans CORO.',
    text: 'CORO Documents permet aujourd’hui de produire le PMU, le PSI et le PCA : procédures intégrées, édition, approbation et export PDF bilingue. Le PGC, le PRA et le PUE restent des familles de documents éducatives ; leur production dans CORO est prévue en phase 2.',
    cta: 'Découvrir CORO Documents' },
  faq: 'Questions fréquentes', faqLabel: 'FAQ',
  faqItems: [
    { q: 'Quelle différence entre un PMU et un PSI?', a: 'Le PSI est spécifique aux situations d’incendie. Le PMU est plus large et couvre tous les types d’urgence propres à l’organisation ; lorsqu’un PMU est requis, il agit comme plan maître et peut contenir le PSI.' },
    { q: 'Quelle différence entre un PCA et un PRA?', a: 'Le PCA vise à maintenir les activités pendant une interruption. Le PRA se concentre sur le retour à la normale après l’interruption. Les deux sont complémentaires et fonctionnent généralement en séquence.' },
    { q: 'Une même organisation peut-elle avoir plusieurs de ces plans?', a: 'Oui. La plupart des organisations combinent plusieurs de ces documents selon leur réalité : bâtiment, secteur d’activité, risques et obligations applicables.' },
    { q: 'CORO permet-il de produire les six documents?', a: 'CORO Documents permet aujourd’hui de produire le PMU, le PSI et le PCA. Le PGC, le PRA et le PUE ont un guide complet, et leur production dans CORO est prévue en phase 2.' },
    { q: 'Quel guide consulter pour une urgence environnementale?', a: 'Le guide du plan d’urgence environnementale (PUE) explique le Règlement sur les urgences environnementales (2019) et l’assujettissement d’une installation.' },
  ],
  statement: 'Le bon document, pour le bon besoin.',
  support: 'Découvrez comment CORO Documents structure la production du PMU, du PSI et du PCA.',
};

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/guides', locale: l, hasEnglish: false, title: copy.metaTitle, description: copy.description });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = copy;
  const demo = localizedHref('/#demo', l);
  const allItems = [...t.s2.items, ...t.s3.items];
  const itemListLd = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: allItems.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: `https://getcoro.io${item.href}` })),
  };
  return (
    <V2Shell locale={l} pathname="/guides" englishAvailable={false}>
      <JsonLd value={faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))} />
      <JsonLd value={itemListLd} />

      <EditorialHero id="guides-title" label={t.label} title={t.lines} lead={t.lead}
        photo={{ src: '/website-v2/guides/guides-coro-documentation-resilience.webp', side: 'end', position: '50% 35%', mobilePosition: '50% 30%', coverage: 55, mobileRatio: '16 / 11' }}
        actions={<><Button href="#s2" surface="dark">{t.explore}</Button><Button href={localizedHref('/gestion-documentaire', l)} variant="ghost" surface="dark">{t.docs}</Button></>} />

      <PageSection tone="white" labelledBy="guides-s1-title">
        <EditorialBlock id="guides-s1-title" label={`${t.s1.n} — ${t.s1.label}`} heading={t.s1.title}><p>{t.s1.text}</p></EditorialBlock>
      </PageSection>

      <PageSection tone="soft" id="s2" labelledBy="guides-s2-title">
        <div className={styles.stack}>
          <EditorialBlock id="guides-s2-title" label={`${t.s2.n} — ${t.s2.label}`} heading={t.s2.title}><p>{t.s2.text}</p></EditorialBlock>
          <ul className={styles.tiles}>{t.s2.items.map((item) => (
            <li key={item.code} className={styles.tile}>
              <MediaFrame src={`/website-v2/guides/${item.img}.webp`} alt="" ratio={1672 / 941} sizes="(min-width: 60rem) 420px, 100vw" />
              <div className={styles.tileBody}>
                <p className={styles.tileCode}>{item.code}</p>
                <h3>{item.name}</h3>
                <p className={styles.tileNeed}>{item.need}</p>
                <p className={styles.tileStatus} data-status="available"><span aria-hidden="true">●</span> {t.s2.status}</p>
                <a className={styles.link} href={localizedHref(item.href, l)} aria-label={`${t.tileExplore} : ${item.name}`}>{t.tileExplore}<span aria-hidden="true"> →</span></a>
              </div>
            </li>
          ))}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="guides-s3-title">
        <div className={styles.stack}>
          <EditorialBlock id="guides-s3-title" label={`${t.s3.n} — ${t.s3.label}`} heading={t.s3.title}><p>{t.s3.text}</p></EditorialBlock>
          <ul className={styles.tiles}>{t.s3.items.map((item) => (
            <li key={item.code} className={styles.tile}>
              <MediaFrame src={`/website-v2/guides/${item.img}.webp`} alt="" ratio={1672 / 941} sizes="(min-width: 60rem) 420px, 100vw" />
              <div className={styles.tileBody}>
                <p className={styles.tileCode}>{item.code}</p>
                <h3>{item.name}</h3>
                <p className={styles.tileNeed}>{item.need}</p>
                <p className={styles.tileStatus} data-status="phase2"><span aria-hidden="true">◐</span> {t.s3.status}</p>
                <a className={styles.link} href={localizedHref(item.href, l)} aria-label={`${t.tileExplore} : ${item.name}`}>{t.tileExplore}<span aria-hidden="true"> →</span></a>
              </div>
            </li>
          ))}</ul>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="guides-s4-title">
        <div className={styles.stack}>
          <EditorialBlock id="guides-s4-title" label={`${t.s4.n} — ${t.s4.label}`} heading={t.s4.title}><p>{t.s4.text}</p></EditorialBlock>
          <ul className={styles.purposes}>{t.s4.purposes.map(([code, name, text]) => <li key={code}><p className={styles.purposeCode}>{code}</p><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="guides-s5-title">
        <div className={styles.stack}>
          <EditorialBlock id="guides-s5-title" label={`${t.s5.n} — ${t.s5.label}`} heading={t.s5.title} />
          <ul className={styles.decision}>{t.s5.rows.map(([need, code, href]) => (
            <li key={code}><p className={styles.decisionNeed}>{need}</p><a className={styles.decisionCode} href={localizedHref(href, l)}>{code}<span aria-hidden="true"> →</span></a></li>
          ))}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="guides-s6-title">
        <SplitContent ratio="7-5" align="start"
          text={<EditorialBlock id="guides-s6-title" label={`${t.s6.n} — ${t.s6.label}`} heading={t.s6.title}><p>{t.s6.text}</p></EditorialBlock>}
          media={<div className={styles.docsCard}><a className={styles.docsLink} href={localizedHref('/gestion-documentaire', l)}>{t.s6.cta}<span aria-hidden="true"> →</span></a></div>} />
      </PageSection>

      <PageSection tone="soft" labelledBy="guides-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="guides-faq-title" label={t.faqLabel} heading={t.faq} />
          <Accordion label={t.faq} items={t.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="guides-cta-title" tone="dark" label={t.label} statement={t.statement} support={t.support} primary={{ label: 'Demander une démonstration', href: demo }} secondary={{ label: t.docs, href: localizedHref('/gestion-documentaire', l) }} />
    </V2Shell>
  );
}
