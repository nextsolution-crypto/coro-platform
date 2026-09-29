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
 * /portail-client (MIG-02D) — CORO Client: access and visibility for the client. Family: product (client-viewpoint silhouette).
 * PRODUCT TRUTH (audited in coro-client-portal and the backend): the client signs in (password, MFA), sees a dashboard, buildings, a map,
 * visible activities, documents with versions and history, and can comment on, sign or refuse a document; it can also request and cancel
 * bookings and reach the enabled modules (incidents, Sentinelle). Booking is NOT published here (production readiness unverified), and no
 * claim goes beyond the already published Client copy in lib/site/product-content.ts, except the explicit "see / act" lists below, which only
 * name verified actions (comment, sign, refuse). PRODUCT PROOF: two V1 screenshots audited against the current portal code are kept (map; document page:
 * PUBLICATION-BLOCKER, visible names and addresses are not confirmed fictitious or authorised). The other four V1 images are not used: dashboard,
 * buildings and activities show controls or panels that the current portal no longer has (extra stats, a documents panel, add-building, add-activity),
 * and the advisor-workspace image is the advisor app, not CORO Client. RECAPTURE REQUIRED BEFORE GO-LIVE: dashboard, buildings and activities screenshots.
 * PUBLICATION-BLOCKER — CLIENT PORTAL SCREENSHOT DATA PROVENANCE applies to the two kept screenshots. The public copy makes NO Booking/reservation claim
 * (the portal does expose request, list and cancel, but nothing beyond the published copy is stated here). The hero photograph (a marketing illustration containing
 * a fictitious portal screen and baked-in text) is decorative and cropped so that its screen and text stay out of frame.
 * Network (a concept that is not part of the current product) is no longer referenced on the public page.
 */
const LOGIN = 'https://client.getcoro.io/login';
const copy = {
  fr: {
    metaTitle: 'Portail client : bâtiments, documents et activités',
    description: 'Donnez à vos clients autorisés une vision claire de leurs bâtiments, documents et activités dans un espace sécurisé avec CORO Client.',
    lines: ['Une vision claire de vos bâtiments,', 'documents et activités.'],
    demo: 'Demander une démonstration', access: 'Accéder à CORO Client',
    viewpoint: 'Le point de vue du client',
    see: 'Ce que le client peut voir', seeItems: ['Ses bâtiments, sur un tableau de bord et une carte', 'Ses documents, leurs versions et leur historique', 'Les activités visibles et les échanges associés'],
    act: 'Ce qu’il peut faire', actItems: ['Commenter un document', 'Signer ou refuser un document'],
    seeAct: 'Voir et agir, sans confusion',
    mapLabel: 'Portefeuille', mapTitle: 'Situer le portefeuille', panLabel: 'Capture d’écran, défilable horizontalement', onScreen: 'Sur cet écran',
    mapAlt: 'Carte CORO Client (interface en français) : bâtiments d’un portefeuille sur une carte, légende des états (à jour, en cours, à renouveler, aucun document) et fiche du bâtiment sélectionné.',
    mapCartouche: ['CORO Client · Portefeuille', 'Carte des bâtiments', 'Capture d’écran'] as const,
    mapLegend: ['Vue cartographique', 'Légende : à jour, en cours, à renouveler, aucun document', 'Bâtiment sélectionné et son document'],
    docAlt: 'Page d’un document dans CORO Client (interface en français) : progression, signatures, historique du document, commentaires et téléchargement des PDF en français et en anglais.',
    docCartouche: ['CORO Client · Documents', 'Document, signatures et historique', 'Capture d’écran'] as const,
    docLegend: ['Progression', 'Signatures', 'Historique du document', 'Commentaires', 'Télécharger le PDF (FR) et le PDF (EN)'],
    platform: 'Cette partie de la plateforme', platformTitle: 'Un socle produit relié', platformLead: 'Les équipes travaillent dans CORO; le client voit ce qui lui est destiné dans CORO Client.', explore: 'Explorer',
    faq: 'FAQ', faqTitle: 'Questions fréquentes', statement: 'Votre organisation. Vos bâtiments. Votre information.',
  },
  en: {
    metaTitle: 'Client portal: buildings, documents and activities',
    description: 'Give authorized clients a clear view of their buildings, documents and activities in a secure space with CORO Client.',
    lines: ['A clear view of your buildings,', 'documents and activities.'],
    demo: 'Request a demonstration', access: 'Access CORO Client',
    viewpoint: 'The client’s point of view',
    see: 'What the client can see', seeItems: ['Their buildings, on a dashboard and a map', 'Their documents, versions and history', 'Visible activities and related exchanges'],
    act: 'What they can do', actItems: ['Comment on a document', 'Sign or refuse a document'],
    seeAct: 'See and act, without confusion',
    mapLabel: 'Portfolio', mapTitle: 'Locate the portfolio', panLabel: 'Screenshot, horizontally scrollable', onScreen: 'On this screen',
    mapAlt: 'CORO Client map (French interface shown): the buildings of a portfolio on a map, a legend of statuses (up to date, in progress, to renew, no document) and the selected building panel.',
    mapCartouche: ['CORO Client · Portfolio', 'Building map', 'Screenshot'] as const,
    mapLegend: ['Map view', 'Legend: up to date, in progress, to renew, no document', 'Selected building and its document'],
    docAlt: 'A document page in CORO Client (French interface shown): progress, signatures, document history, comments and download of the French and English PDFs.',
    docCartouche: ['CORO Client · Documents', 'Document, signatures and history', 'Screenshot'] as const,
    docLegend: ['Progress', 'Signatures', 'Document history', 'Comments', 'Download the PDF (FR) and the PDF (EN)'],
    platform: 'This part of the platform', platformTitle: 'A connected product foundation', platformLead: 'Teams work in CORO; the client sees what is intended for them in CORO Client.', explore: 'Explore',
    faq: 'FAQ', faqTitle: 'Frequently asked questions', statement: 'Your organization. Your buildings. Your information.',
  },
} as const satisfies Record<Locale, unknown>;

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/portail-client', locale: l, title: copy[l].metaTitle, description: copy[l].description });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = copy[l];
  const p = productContent.client[l];
  const demo = localizedHref('/#demo', l);
  return (
    <V2Shell locale={l} pathname="/portail-client">
      <JsonLd value={faqJsonLd(p.faq.map((item) => ({ question: item.q, answer: item.a })))} />

      <EditorialHero id="client-title" label={p.eyebrow} title={t.lines} lead={p.intro} photo={{ src: '/website-v2/client/client-portal-building-portfolio.webp', side: 'end', position: '100% 40%', mobilePosition: '100% 40%', coverage: 42, mobileRatio: '4 / 5' }}
        actions={<><Button href={demo} surface="dark">{t.demo}</Button><Button href={LOGIN} variant="ghost" surface="dark" external>{t.access}</Button></>} />

      <PageSection tone="white" labelledBy="client-flow-title">
        <SplitContent ratio="5-7" align="start"
          text={<EditorialBlock id="client-flow-title" label={t.viewpoint} heading={p.flowTitle} />}
          media={<ol className={styles.descent} aria-label={p.flowTitle}>{p.flow.map((word) => <li key={word}>{word}</li>)}</ol>} />
      </PageSection>

      <PageSection tone="soft" labelledBy="client-map-title">
        <SplitContent ratio="5-7" align="center"
          text={<div className={styles.stack}><EditorialBlock id="client-map-title" label={t.mapLabel} heading={t.mapTitle} /><div className={styles.legendBlock}><p className={styles.legendLabel}>{t.onScreen}</p><ul className={styles.legend}>{t.mapLegend.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}
          media={<div className={styles.pan} role="region" tabIndex={0} aria-label={t.panLabel}><MediaFrame kind="technical" src="/images/solutions/portail-client/coro-portail-client-carte.webp" alt={t.mapAlt} ratio={1292 / 1217} sizes="(min-width: 68rem) 640px, 560px" cartouche={t.mapCartouche} /></div>} />
      </PageSection>

      <PageSection tone="white" labelledBy="client-objects-title">
        <div className={styles.stack}>
          <EditorialBlock id="client-objects-title" heading={p.capTitle} />
          <ol className={styles.objects} aria-label={p.capTitle}>{p.capabilities.map((c) => <li key={c.title}><h3>{c.title}</h3><p>{c.text}</p></li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="client-seeact-title">
        <SplitContent order="media-text" ratio="4-8" align="start"
          media={<div className={styles.stack}><div className={styles.pan} role="region" tabIndex={0} aria-label={t.panLabel}><MediaFrame kind="technical" src="/images/solutions/portail-client/coro-portail-client-cycle-documentaire.webp" alt={t.docAlt} ratio={1311 / 1005} sizes="(min-width: 68rem) 880px, 560px" cartouche={t.docCartouche} /></div><div className={styles.legendBlock}><p className={styles.legendLabel}>{t.onScreen}</p><ul className={styles.legend}>{t.docLegend.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}
          text={<div className={styles.stack}>
          <EditorialBlock id="client-seeact-title" heading={t.seeAct} />
          <div className={styles.seeAct}>
            <section aria-labelledby="client-see-label"><h3 id="client-see-label">{t.see}</h3><ul>{t.seeItems.map((item) => <li key={item}>{item}</li>)}</ul></section>
            <section aria-labelledby="client-act-label"><h3 id="client-act-label">{t.act}</h3><ul>{t.actItems.map((item) => <li key={item}>{item}</li>)}</ul></section>
          </div>
          </div>} />
      </PageSection>

      <PageSection tone="navy" labelledBy="client-rights-title">
        <SplitContent ratio="5-7" align="center" text={<EditorialBlock id="client-rights-title" heading={p.boundaryTitle} />} media={<p className={styles.rights}>{p.boundary}</p>} />
      </PageSection>

      <PageSection tone="white" labelledBy="client-platform-title">
        <div className={styles.stack}>
          <EditorialBlock id="client-platform-title" label={t.platform} heading={t.platformTitle}><p>{t.platformLead}</p></EditorialBlock>
          <ul className={styles.connect}>
            {p.connections.filter((c) => c.href !== '/portail-client').map((c) => (
              <li key={c.name}><h3>{c.name}</h3><p>{c.text}</p>{c.href && <a href={localizedHref(c.href, l)} aria-label={`${t.explore} ${c.name}`}>{t.explore}<span aria-hidden="true"> →</span></a>}</li>
            ))}
          </ul>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="client-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="client-faq-title" label={t.faq} heading={t.faqTitle} />
          <Accordion label={t.faqTitle} items={p.faq.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="client-cta-title" tone="dark" label={p.eyebrow} statement={t.statement} primary={{ label: t.demo, href: demo }} secondary={{ label: t.access, href: LOGIN }} />
    </V2Shell>
  );
}
