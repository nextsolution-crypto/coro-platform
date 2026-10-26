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

/** Client V1: building sources complement project deliverables. Screenshots show the French interface, not a promise of every enabled capability. */
const LOGIN = 'https://client.getcoro.io/login';
const copy = {
  fr: {
    metaTitle: 'Portail client : bâtiments, documents et activités',
    description: 'Donnez à vos clients autorisés une vision claire de leurs bâtiments, documents et activités dans un espace sécurisé avec CORO Client.',
    lines: ['Une vision claire de vos bâtiments,', 'documents et activités.'],
    demo: 'Demander une démonstration', access: 'Accéder à CORO Client',
    viewpoint: 'Le point de vue du client',
    see: 'Ce que le client peut voir', seeItems: ['Ses bâtiments, sur un tableau de bord et une carte', 'Ses documents, leurs versions et leur historique', 'Les activités visibles et les échanges associés'],
    act: 'Ce qu’il peut faire', actItems: ['Commenter ou refuser un document selon ses droits', 'Ajouter des documents techniques avec une autorisation', 'Interroger les sources admissibles avec CORO AI'],
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
    act: 'What they can do', actItems: ['Comment on or refuse a document according to permissions', 'Upload technical documents when authorized', 'Ask about eligible sources with CORO AI'],
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

const buildingLibrary = {
 fr: { label: 'La documentation du bâtiment', title: 'Conformité et documentation technique : deux espaces clairs.', complianceTitle: 'Documents de conformité', compliance: 'Retrouvez les livrables préparés par votre prestataire, leurs versions et les échanges du dossier.', technicalTitle: 'Documentation technique', technical: 'Conservez plans, notices, tableaux et fichiers utiles directement dans la fiche bâtiment. Les responsables et utilisateurs autorisés peuvent alimenter cette base.', knowledgeTitle: 'Une base qui reste avec le bâtiment', knowledge: 'Les sources approuvées des projets enrichissent Knowledge. L’archivage d’un projet ne retire pas à lui seul cette base ; les droits et les statuts des documents continuent de s’appliquer.', ai: 'CORO AI aide à interroger les sources admissibles indexées, avec des citations à vérifier. Un fichier conservé n’est pas nécessairement analysable.', knowledgeLink: 'Découvrir Knowledge', aiLink: 'Découvrir CORO AI', limits: 'La signature fournisseur et le PDF officiel associé ne sont pas inclus dans le périmètre commercial Client V1 validé. Une capture montrant des signatures n’en constitue pas une promesse de disponibilité.' },
 en: { label: 'Building documentation', title: 'Compliance and technical documentation: two clear spaces.', complianceTitle: 'Compliance documents', compliance: 'Find deliverables prepared by your provider, their versions and related project discussions.', technicalTitle: 'Technical documentation', technical: 'Keep plans, manuals, spreadsheets and useful files directly in the building record. Managers and authorized users can contribute to this library.', knowledgeTitle: 'A library that stays with the building', knowledge: 'Approved project sources enrich Knowledge. Archiving a project alone does not remove the building library; document permissions and statuses still apply.', ai: 'CORO AI helps query eligible indexed sources, with citations to check. A stored file is not necessarily analysable.', knowledgeLink: 'Explore Knowledge', aiLink: 'Explore CORO AI', limits: 'Provider-based signing and the associated official PDF are not included in the validated Client V1 commercial scope. A screenshot showing signatures is not a promise of availability.' },
} as const;

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
  const library = buildingLibrary[l];
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

      <PageSection tone="white" labelledBy="client-library-title">
        <div className={styles.stack}>
          <EditorialBlock id="client-library-title" label={library.label} heading={library.title} />
          <SplitContent ratio="5-7" align="start"
            text={<EditorialBlock heading={library.complianceTitle}><p>{library.compliance}</p></EditorialBlock>}
            media={<EditorialBlock heading={library.technicalTitle}><p>{library.technical}</p></EditorialBlock>} />
          <EditorialBlock heading={library.knowledgeTitle}><p>{library.knowledge}</p><p>{library.ai}</p></EditorialBlock>
          <p><a href={localizedHref('/coro-knowledge', l)}>{library.knowledgeLink} →</a></p>
          <p><a href={localizedHref('/coro-ai', l)}>{library.aiLink} →</a></p>
          <p>{library.limits}</p>
        </div>
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
