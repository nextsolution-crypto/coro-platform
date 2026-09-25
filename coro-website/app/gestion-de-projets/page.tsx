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
import { localeFromSearchParams, localizedHref, type Locale } from '@/lib/site/locale';
import { productContent } from '@/lib/site/product-content';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/**
 * /gestion-de-projets (MIG-02B) — commercial authority for CORO Projects. Family: product (operational silhouette).
 * PRODUCT TRUTH (audited in the backend): mandates, activities, tasks, assignees, timesheets, bookings with a status lifecycle,
 * planning and adviser assignment exist in code. Their production readiness is NOT independently verified, so this page adds
 * no claim beyond the already published copy in lib/site/product-content.ts. It does NOT claim Outlook synchronisation
 * (only an outlookEventId field exists), real-time availability, automatic conflict detection, capacity intelligence or notifications.
 * The proof is the real dashboard; the former generic illustration (with invented figures) is not used.
 */
const copy = {
  fr: {
    metaTitle: 'Gestion de projets et de mandats en mesures d’urgence',
    description: 'Pilotez vos mandats de mesures d’urgence : clients, bâtiments, activités, tâches, échéances, responsabilités, planning, réservations et heures avec CORO.',
    label: 'CORO · Projects',
    lines: ['Piloter les mandats,', 'les activités et les ressources.'],
    shotAlt: 'Tableau de bord CORO : projets actifs et en révision, actions requises, délais de livraison, activités des 30 prochains jours et projets récents avec leur progression.',
    shotCartouche: ['CORO Projects · Tableau de bord', 'Projets, activités et échéances', 'Capture d’écran'] as const,
    panLabel: 'Capture d’écran, défilable horizontalement', onScreen: 'Sur cet écran', legend: ['Actions requises', 'Délais de livraison', 'Activités des 30 prochains jours', 'Projets récents et progression'],
    start: 'Le point de départ', startTitle: 'Client + Bâtiment + Besoin',
    steps: ['Mandat', 'Activités', 'Équipe', 'Planning', 'Booking', 'Tâches', 'Heures', 'Livrables'],
    pair: 'Deux capacités reliées', pairTitle: 'Planning et Booking appartiennent au mandat.',
    platform: 'Cette partie de la plateforme', platformTitle: 'Un socle produit relié', explore: 'Explorer',
    faq: 'FAQ', faqTitle: 'Questions fréquentes',
    ctaStatement: 'Du besoin au travail réalisé.', ctaPrimary: 'Demander une démonstration',
  },
  en: {
    metaTitle: 'Project and mandate management for emergency preparedness',
    description: 'Manage your emergency-preparedness mandates: clients, buildings, activities, tasks, deadlines, responsibilities, planning, bookings and hours with CORO.',
    label: 'CORO · Projects',
    lines: ['Manage mandates,', 'activities and resources.'],
    shotAlt: 'CORO dashboard (French interface shown): active and in-review projects, required actions, delivery deadlines, activities for the next 30 days and recent projects with their progress.',
    shotCartouche: ['CORO Projects · Dashboard', 'Projects, activities and deadlines', 'Screenshot'] as const,
    panLabel: 'Screenshot, horizontally scrollable', onScreen: 'On this screen', legend: ['Required actions', 'Delivery deadlines', 'Activities for the next 30 days', 'Recent projects and progress'],
    start: 'The starting point', startTitle: 'Client + Building + Need',
    steps: ['Mandate', 'Activities', 'Team', 'Planning', 'Booking', 'Tasks', 'Hours', 'Deliverables'],
    pair: 'Two connected capabilities', pairTitle: 'Planning and Booking belong to the mandate.',
    platform: 'This part of the platform', platformTitle: 'A connected product foundation', explore: 'Explore',
    faq: 'FAQ', faqTitle: 'Frequently asked questions',
    ctaStatement: 'From need to completed work.', ctaPrimary: 'Request a demonstration',
  },
} as const satisfies Record<Locale, unknown>;

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/gestion-de-projets', locale: l, title: copy[l].metaTitle, description: copy[l].description });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = copy[l];
  const p = productContent.projects[l];
  const demo = localizedHref('/#demo', l);
  return (
    <V2Shell locale={l} pathname="/gestion-de-projets">
      <JsonLd value={faqJsonLd(p.faq.map((item) => ({ question: item.q, answer: item.a })))} />

      <EditorialHero id="projects-title" label={t.label} title={t.lines} lead={p.intro} photo={{ src: '/website-v2/projects/projects-team-coordination.webp', side: 'start', position: '30% 40%', mobilePosition: '32% 35%' }} actions={<Button href={demo} surface="dark">{p.cta}</Button>} />

      <PageSection tone="soft" density="compact" labelledBy="projects-proof-title">
        <div className={styles.stack}>
          <EditorialBlock id="projects-proof-title" label={p.eyebrow} heading={p.capTitle} />
          <div className={styles.pan} role="region" tabIndex={0} aria-label={t.panLabel}>
            <MediaFrame kind="technical" src="/screenshot-dashboard.jpg" alt={t.shotAlt} ratio={1776 / 886} sizes="(min-width: 68rem) 1200px, 900px" cartouche={t.shotCartouche} />
          </div>
          <div className={styles.legendBlock}><p className={styles.legendLabel}>{t.onScreen}</p><ul className={styles.legend}>{t.legend.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="projects-start-title">
        <SplitContent ratio="5-7" align="start"
          text={<EditorialBlock id="projects-start-title" label={t.start} heading={t.startTitle}><p>{p.flowTitle}</p></EditorialBlock>}
          media={<ol className={styles.sequence} aria-label={p.flowTitle}>{t.steps.map((step) => <li key={step}>{step}</li>)}</ol>} />
      </PageSection>

      <PageSection tone="soft" labelledBy="projects-capabilities-title">
        <div className={styles.stack}>
          <EditorialBlock id="projects-capabilities-title" label={t.pair} heading={t.pairTitle} />
          <ol className={styles.capCards} aria-label={p.capTitle}>{p.capabilities.map((c) => <li key={c.title}><h3>{c.title}</h3><p>{c.text}</p></li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="projects-boundary-title">
        <EditorialBlock id="projects-boundary-title" heading={p.boundaryTitle}><p>{p.boundary}</p></EditorialBlock>
      </PageSection>

      <PageSection tone="white" labelledBy="projects-platform-title">
        <div className={styles.stack}>
          <EditorialBlock id="projects-platform-title" label={t.platform} heading={t.platformTitle} />
          <ul className={styles.connect}>
            {p.connections.filter((c) => c.href !== '/gestion-de-projets').map((c) => (
              <li key={c.name}><h3>{c.name}</h3><p>{c.text}</p>{c.href && <a href={localizedHref(c.href, l)} aria-label={`${t.explore} ${c.name}`}>{t.explore}<span aria-hidden="true"> →</span></a>}</li>
            ))}
          </ul>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="projects-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="projects-faq-title" label={t.faq} heading={t.faqTitle} />
          <Accordion label={t.faqTitle} items={p.faq.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="projects-cta-title" tone="dark" label={t.label} statement={t.ctaStatement} primary={{ label: t.ctaPrimary, href: demo }} />
    </V2Shell>
  );
}
