import type { Metadata } from 'next';
import { CTASection } from '@/components/conversion/CTASection';
import { HeroTechnical } from '@/components/hero/HeroTechnical';
import { Accordion } from '@/components/page/Accordion';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { FeatureIndex } from '@/components/page/FeatureIndex';
import { MediaFrame } from '@/components/page/MediaFrame';
import { PageSection } from '@/components/page/PageSection';
import { SplitContent } from '@/components/page/SplitContent';
import { V2Shell } from '@/components/site/V2Shell';
import { faqJsonLd } from '@/lib/site/json-ld';
import { localeFromSearchParams, localizedHref, type Locale } from '@/lib/site/locale';
import { productContent } from '@/lib/site/product-content';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/**
 * /gestion-documentaire (MIG-02A) — commercial authority of the document silo. Family: Technical.
 * PRODUCT TRUTH: PMU, PSI and PCA have export builders and are the only available documents. PGC, PRA and PUE are Phase 2
 * (no generator, no configurator) and are never presented as available. Product copy comes from lib/site/product-content.ts.
 * The title carries no brand (the root template appends " | CORO"). Search wording is REVIEW until public-search validation.
 */
const copy = {
  fr: {
    metaTitle: 'Gestion documentaire des plans d’urgence et de continuité',
    description: 'Générez, structurez, révisez et exportez vos plans de mesures d’urgence, de sécurité incendie et de continuité des activités (PMU, PSI, PCA) avec CORO. PGC, PRA et PUE en Phase 2.',
    label: 'CORO · Documents',
    lines: ['De l’information structurée', 'aux plans approuvés.'],
    secondary: 'Voir les documents',
    mediaAlt: 'Planche de dessin bleue d’un bâtiment illustré : élévation, coupe transversale, plans de rez-de-chaussée et d’étage, axonométrie.',
    referencesLabel: 'Documents disponibles. Les repères numérotés de la planche sont illustratifs et ne désignent aucun emplacement réel.',
    refs: [['PMU', 'Plan de mesures d’urgence'], ['PSI', 'Plan de sécurité incendie'], ['PCA', 'Plan de continuité des activités']],
    available: 'Disponible', phase2: 'Phase 2',
    titleBlock: ['Planche 01', 'Plans et documents', 'Illustration'] as const,
    inset: { alt: 'Coupe illustrée d’un bâtiment : étages de bureaux, stationnement et locaux techniques.', caption: 'Illustration · coupe' },
    foundation: 'La fondation', foundationTitle: 'Tout commence par la connaissance du bâtiment.',
    proof: 'Du cycle à la preuve',
    shotAlt: 'Éditeur CORO : navigation par modules, contrôle des erreurs, version française du document et accès à l’historique.',
    shotCartouche: ['CORO Documents · Éditeur', 'Module 7 · Registres et annexes', 'Capture d’écran'] as const,
    docs: 'Les documents', docsTitle: 'Une donnée saisie une fois. Plusieurs usages.', docsLabel: 'Documents pris en charge et leur disponibilité',
    docsIntro: 'Chaque type de plan a son guide : il explique le plan, tandis que cette page présente ce que CORO permet d’en faire.', guide: 'Lire le guide', guideFor: 'Guide :',
    docList: [['PMU', 'Plan de mesures d’urgence', '/documents/plan-mesures-urgence-pmu', true], ['PSI', 'Plan de sécurité incendie', '/documents/plan-securite-incendie-psi', true], ['PCA', 'Plan de continuité des activités', '/documents/plan-continuite-activites-pca', true], ['PGC', 'Plan de gestion de crise', '/documents/plan-gestion-crise-pgc', false], ['PRA', 'Plan de reprise des activités', '/documents/plan-reprise-activites-pra', false], ['PUE', 'Plan d’urgence environnementale', '/documents/plan-urgence-environnementale-pue', false]] as const,
    platform: 'Cette partie de la plateforme', platformTitle: 'Un socle produit relié', explore: 'Explorer',
    faq: 'FAQ', faqTitle: 'Questions fréquentes',
    ctaStatement: 'Structurer vos plans avec CORO Documents.', ctaPrimary: 'Demander une démonstration',
  },
  en: {
    metaTitle: 'Emergency and continuity plan document management',
    description: 'Generate, structure, review and export your emergency response, fire safety and business continuity plans (ERP, FSP, BCP) with CORO. CMP, DRP and EEP in Phase 2.',
    label: 'CORO · Documents',
    lines: ['From structured information', 'to approved plans.'],
    secondary: 'See the documents',
    mediaAlt: 'Blue drawing sheet of an illustrated building: elevation, cross-section, ground-floor and upper-floor plans, axonometric view.',
    referencesLabel: 'Available documents. The numbered markers on the drawing are illustrative and do not point to any real location.',
    refs: [['ERP', 'Emergency Response Plan'], ['FSP', 'Fire Safety Plan'], ['BCP', 'Business Continuity Plan']],
    available: 'Available', phase2: 'Phase 2',
    titleBlock: ['Sheet 01', 'Plans and documents', 'Illustration'] as const,
    inset: { alt: 'Illustrated cross-section of a building: office floors, parking and technical rooms.', caption: 'Illustration · section' },
    foundation: 'The foundation', foundationTitle: 'It starts with knowledge of the building.',
    proof: 'From lifecycle to evidence',
    shotAlt: 'CORO editor (French interface shown): module navigation, error checking, French version of the document and access to history.',
    shotCartouche: ['CORO Documents · Editor', 'Module 7 · Registers and appendices', 'Screenshot'] as const,
    docs: 'The documents', docsTitle: 'Enter data once. Use it many ways.', docsLabel: 'Supported documents and their availability',
    docsIntro: 'Each plan type has its own guide: it explains the plan, while this page shows what CORO lets you do with it.', guide: 'Read the guide (in French)', guideFor: 'Guide:',
    docList: [['ERP', 'Emergency Response Plan', '/documents/plan-mesures-urgence-pmu', true], ['FSP', 'Fire Safety Plan', '/documents/plan-securite-incendie-psi', true], ['BCP', 'Business Continuity Plan', '/documents/plan-continuite-activites-pca', true], ['CMP', 'Crisis Management Plan', '/documents/plan-gestion-crise-pgc', false], ['DRP', 'Disaster Recovery Plan', '/documents/plan-reprise-activites-pra', false], ['EEP', 'Environmental Emergency Plan', '/documents/plan-urgence-environnementale-pue', false]] as const,
    platform: 'This part of the platform', platformTitle: 'A connected product foundation', explore: 'Explore',
    faq: 'FAQ', faqTitle: 'Frequently asked questions',
    ctaStatement: 'Structure your plans with CORO Documents.', ctaPrimary: 'Request a demonstration',
  },
} as const satisfies Record<Locale, unknown>;

const pins = [{ x: 74, y: 30 }, { x: 52, y: 68 }, { x: 77, y: 49 }] as const;

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/gestion-documentaire', locale: l, title: copy[l].metaTitle, description: copy[l].description });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = copy[l];
  const p = productContent.documents[l];
  const demo = localizedHref('/#demo', l);
  return (
    <V2Shell locale={l} pathname="/gestion-documentaire">
      <JsonLd value={faqJsonLd(p.faq.map((item) => ({ question: item.q, answer: item.a })))} />

      <HeroTechnical
        heading="h1"
        priority
        copy={{ label: t.label, title: t.lines, body: p.intro, primary: { label: p.cta, href: demo }, secondary: { label: t.secondary, href: '#documents' } }}
        mediaAlt={t.mediaAlt}
        referencesLabel={t.referencesLabel}
        references={t.refs.map(([code, label], i) => ({ id: code.toLowerCase(), n: i + 1, code, label, text: t.available, x: pins[i].x, y: pins[i].y, side: 'left' as const }))}
        titleBlock={t.titleBlock}
        inset={t.inset}
      />

      <PageSection tone="soft" labelledBy="docs-foundation-title">
        <SplitContent ratio="7-5" align="start"
          text={<EditorialBlock id="docs-foundation-title" label={t.foundation} heading={t.foundationTitle}><p>{p.flowTitle}</p></EditorialBlock>}
          media={<ol className={styles.sequence} aria-label={p.flowTitle}>{p.flow.map((step) => <li key={step}>{step}</li>)}</ol>} />
      </PageSection>

      <PageSection tone="white" labelledBy="docs-cycle-title">
        <SplitContent ratio="4-8" order="media-text" align="start" bleed="left"
          text={<div className={styles.stack}><EditorialBlock id="docs-cycle-title" label={t.proof} heading={p.capTitle} /><FeatureIndex layout="steps" label={p.capTitle} items={p.capabilities} /></div>}
          media={<MediaFrame kind="technical" src="/screenshot-editor.jpg" alt={t.shotAlt} ratio={1776 / 886} sizes="(min-width: 68rem) 66vw, 100vw" cartouche={t.shotCartouche} />} />
      </PageSection>

      <PageSection id="documents" tone="soft" labelledBy="docs-list-title">
        <div className={styles.stack}>
          <EditorialBlock id="docs-list-title" label={t.docs} heading={t.docsTitle}><p>{t.docsIntro}</p></EditorialBlock>
          <ul className={styles.docs} aria-label={t.docsLabel}>
            {t.docList.map(([code, name, href, available]) => (
              <li key={code} data-available={available ? 'true' : 'false'}>
                <b className={styles.code}>{code}</b>
                <span className={styles.name}>{name}</span>
                <span className={styles.status}>{available ? t.available : t.phase2}</span>
                <a className={styles.guide} href={href} aria-label={`${t.guideFor} ${name}`}>{t.guide}<span aria-hidden="true"> →</span></a>
              </li>
            ))}
          </ul>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="docs-boundary-title">
        <EditorialBlock id="docs-boundary-title" heading={p.boundaryTitle}><p>{p.boundary}</p></EditorialBlock>
      </PageSection>

      <PageSection tone="white" labelledBy="docs-platform-title">
        <div className={styles.stack}>
          <EditorialBlock id="docs-platform-title" label={t.platform} heading={t.platformTitle} />
          <ul className={styles.connect}>
            {p.connections.filter((c) => c.href !== '/gestion-documentaire').map((c) => (
              <li key={c.name}><h3>{c.name}</h3><p>{c.text}</p>{c.href && <a href={localizedHref(c.href, l)} aria-label={`${t.explore} ${c.name}`}>{t.explore}<span aria-hidden="true"> →</span></a>}</li>
            ))}
          </ul>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="docs-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="docs-faq-title" label={t.faq} heading={t.faqTitle} />
          <Accordion label={t.faqTitle} items={p.faq.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="docs-cta-title" tone="dark" label={t.label} statement={t.ctaStatement} primary={{ label: t.ctaPrimary, href: demo }} />
    </V2Shell>
  );
}
