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
import { localeFromSearchParams, localizedHref, type Locale } from '@/lib/site/locale';
import { productContent } from '@/lib/site/product-content';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/**
 * /performance-objectifs (MIG-02C) — CORO Performance: reading, capacity, goals and decision. Family: product (control-room silhouette).
 * PRODUCT TRUTH (audited in the backend and the advisor app): hours by mandate/member (timelog, task time entries, team view for admins),
 * budgeted vs actual mandate hours, and an admin capacity view (12-week horizon, occupancy level) exist in code. Their production
 * readiness is NOT independently verified, so this page adds no claim beyond the already published copy in lib/site/product-content.ts.
 * NOT claimed: configurable goals/KPI targets (only a period hour target derived from the weekly schedule exists), exports, alerts,
 * trends, projections, real-time data, automation, AI. No Performance screenshot exists: the page carries NO UI proof, and the
 * hero photograph (a marketing illustration containing a fictitious dashboard) is decorative and is cropped to the people.
 * The former "analytical window" illustration (invented interface) is not used.
 */
const copy = {
  fr: {
    metaTitle: 'Performance des mandats, heures et capacité d’équipe',
    description: 'Lisez l’activité de vos mandats de mesures d’urgence : heures, budgets, charge, objectifs et écarts, pour éclairer les décisions d’affectation avec CORO.',
    lines: ['Transformer l’activité', 'en capacité de pilotage.'],
    signal: 'Du signal à la décision', platform: 'Cette partie de la plateforme', platformTitle: 'Un socle produit relié', explore: 'Explorer',
    divide: 'Deux lectures distinctes', dividePerf: 'Performance', divideRes: 'Résilience',
    divideTitle: 'Performance ≠ Indice CORO', divideA: 'Activité · Charge · Budgets · Objectifs', divideB: 'Préparation · Capacité face aux événements',
    demo: 'Demander une démonstration', statement: 'Mesurer pour décider. Décider pour progresser.', faq: 'FAQ', faqTitle: 'Questions fréquentes',
  },
  en: {
    metaTitle: 'Mandate performance, hours and team capacity',
    description: 'Read the activity of your emergency-preparedness mandates: hours, budgets, workload, goals and variances, to inform assignment decisions with CORO.',
    lines: ['Turn activity', 'into management insight.'],
    signal: 'From signal to decision', platform: 'This part of the platform', platformTitle: 'A connected product foundation', explore: 'Explore',
    divide: 'Two distinct readings', dividePerf: 'Performance', divideRes: 'Resilience',
    divideTitle: 'Performance ≠ CORO Index', divideA: 'Activity · Workload · Budgets · Goals', divideB: 'Preparedness · Capacity for events',
    demo: 'Request a demonstration', statement: 'Measure to decide. Decide to progress.', faq: 'FAQ', faqTitle: 'Frequently asked questions',
  },
} as const satisfies Record<Locale, unknown>;

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/performance-objectifs', locale: l, title: copy[l].metaTitle, description: copy[l].description });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = copy[l];
  const p = productContent.performance[l];
  const demo = localizedHref('/#demo', l);
  return (
    <V2Shell locale={l} pathname="/performance-objectifs">
      <JsonLd value={faqJsonLd(p.faq.map((item) => ({ question: item.q, answer: item.a })))} />

      <EditorialHero id="performance-title" label={p.eyebrow} title={t.lines} lead={p.intro} photo={{ src: '/website-v2/performance/performance-coro-analytics.webp', side: 'start', position: '0% 40%', mobilePosition: '0% 40%', coverage: 46, mobileRatio: '1 / 1' }} actions={<Button href={demo} surface="dark">{p.cta}</Button>} />

      <PageSection tone="white" labelledBy="performance-flow-title">
        <div className={styles.stack}>
          <EditorialBlock id="performance-flow-title" label={t.signal} heading={p.flowTitle} />
          <ol className={styles.chain} aria-label={p.flowTitle}>{p.flow.map((word) => <li key={word}>{word}</li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="performance-questions-title">
        <div className={styles.stack}>
          <EditorialBlock id="performance-questions-title" heading={p.capTitle} />
          <ol className={styles.capCards} aria-label={p.capTitle}>{p.capabilities.map((c) => <li key={c.title}><h3>{c.title}</h3><p>{c.text}</p></li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="performance-divide-title">
        <SplitContent ratio="5-7" align="start"
          text={<EditorialBlock id="performance-divide-title" label={t.divide} heading={t.divideTitle}><p>{p.boundary}</p></EditorialBlock>}
          media={<dl className={styles.divide}><div><dt>{t.dividePerf}</dt><dd>{t.divideA}</dd></div><div><dt>{t.divideRes}</dt><dd>{t.divideB}</dd></div></dl>} />
      </PageSection>

      <PageSection tone="white" labelledBy="performance-platform-title">
        <div className={styles.stack}>
          <EditorialBlock id="performance-platform-title" label={t.platform} heading={t.platformTitle} />
          <ul className={styles.connect}>
            {p.connections.filter((c) => c.href !== '/performance-objectifs').map((c) => (
              <li key={c.name}><h3>{c.name}</h3><p>{c.text}</p>{c.href && <a href={localizedHref(c.href, l)} aria-label={`${t.explore} ${c.name}`}>{t.explore}<span aria-hidden="true"> →</span></a>}</li>
            ))}
          </ul>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="performance-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="performance-faq-title" label={t.faq} heading={t.faqTitle} />
          <Accordion label={t.faqTitle} items={p.faq.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="performance-cta-title" tone="dark" label={p.eyebrow} statement={t.statement} primary={{ label: t.demo, href: demo }} />
    </V2Shell>
  );
}
