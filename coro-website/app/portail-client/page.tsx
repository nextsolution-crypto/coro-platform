import { Metadata } from 'next';

const SITE_URL = 'https://getcoro.io';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang: langParam } = await searchParams;
  const isEnglish = langParam === 'en';

  const frUrl = `${SITE_URL}/portail-client`;
  const enUrl = `${SITE_URL}/portail-client?lang=en`;
  const currentUrl = isEnglish ? enUrl : frUrl;

  const title = isEnglish
    ? 'Client Portal for Compliance Management — CORO'
    : 'Portail client pour la gestion de la conformité — CORO';

  const description = isEnglish
    ? 'Give your clients a secure portal to manage buildings, compliance documents, approvals, electronic signatures, activities, document history and upcoming obligations with CORO.'
    : 'Offrez à vos clients un portail sécurisé pour suivre leurs bâtiments, documents de conformité, approbations, signatures électroniques, activités, historiques et obligations à venir avec CORO.';

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,

    alternates: {
      canonical: currentUrl,
      languages: {
        'fr-CA': frUrl,
        'en-CA': enUrl,
        'x-default': frUrl,
      },
    },

    openGraph: {
      type: 'website',
      url: currentUrl,
      siteName: 'CORO',
      locale: isEnglish ? 'en_CA' : 'fr_CA',
      alternateLocale: [isEnglish ? 'fr_CA' : 'en_CA'],
      title,
      description,
      images: [
        {
          url: '/og-coro.jpg',
          width: 1200,
          height: 630,
          alt: isEnglish
            ? 'CORO client portal for compliance management'
            : 'Portail client CORO pour la gestion de la conformité',
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-coro.jpg'],
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}

export default async function PortailClientPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const lang = params?.lang === 'en' ? 'en' : 'fr';

  const content = {
    fr: {
      tag: 'Portail client',

      heroEyebrow: 'L’expérience client CORO',
      title: 'La conformité de vos clients ne s’arrête pas à la livraison du PDF.',
      intro:
        'CORO offre à vos clients un véritable espace de gestion de leur conformité : bâtiments, documents, activités, approbations, signatures, commentaires et historique des versions sont centralisés dans un portail sécurisé.',

      heroImage:
        '/images/solutions/portail-client/coro-portail-client-tableau-de-bord.webp',

      primaryCta: 'Demander une démo',
      portalCta: 'Accéder au portail',

      proofTitle: 'Un portail conçu pour prolonger votre service auprès du client',
      proofIntro:
        'Au lieu de transmettre un document par courriel puis de perdre la continuité du dossier, CORO conserve toute l’information dans un environnement structuré et accessible au client.',

      highlights: [
        {
          number: '01',
          title: 'Suivi documentaire',
          text: 'Documents validés, en cours, en révision ou signés.',
        },
        {
          number: '02',
          title: 'Portefeuille immobilier',
          text: 'Tous les bâtiments du client regroupés au même endroit.',
        },
        {
          number: '03',
          title: 'Traçabilité',
          text: 'Versions, approbations, signatures et commentaires conservés.',
        },
        {
          number: '04',
          title: 'Activités',
          text: 'Révisions, formations, exercices et interventions planifiées.',
        },
      ],

      dashboard: {
        kicker: 'Vue d’ensemble',
        title: 'Un tableau de bord qui résume immédiatement la situation',
        text:
          'Dès sa connexion, le client visualise l’état de ses documents de conformité, ses documents récents, les activités à venir et les bâtiments associés à son organisation. Il dispose d’une vue claire sans devoir parcourir des chaînes de courriels ou différents systèmes.',
        bullets: [
          'Nombre total de documents',
          'Documents validés, en cours et en révision',
          'Documents signés',
          'Documents récents',
          'Activités à venir',
          'Accès rapide à chaque bâtiment',
        ],
        image:
          '/images/solutions/portail-client/coro-portail-client-tableau-de-bord.webp',
        alt: 'Tableau de bord du portail client CORO',
      },

      buildings: {
        kicker: 'Gestion par bâtiment',
        title: 'Toute la conformité organisée autour des bâtiments',
        text:
          'Chaque bâtiment dispose de son propre espace avec ses documents, son adresse, son responsable, l’état des dossiers et les services associés. Pour les organisations possédant plusieurs immeubles, le portail devient une véritable vue de portefeuille.',
        bullets: [
          'Documents regroupés par bâtiment',
          'Responsable identifié',
          'Nombre de documents et état d’avancement',
          'Accès direct aux documents',
          'Accès à Coro Sentinelle lorsque le service est activé',
          'Vision multisite pour les organisations',
        ],
        image:
          '/images/solutions/portail-client/coro-portail-client-batiments.webp',
        alt: 'Gestion des bâtiments dans le portail client CORO',
      },

      map: {
        kicker: 'Vue cartographique',
        title: 'Une organisation. Plusieurs bâtiments. Une seule vision.',
        text:
          'La vue cartographique permet au client de visualiser son portefeuille immobilier et l’état de conformité de ses bâtiments. Les statuts permettent d’identifier rapidement les sites à jour, en cours de traitement, à renouveler ou sans document.',
        statuses: [
          'À jour',
          'En cours',
          'À renouveler',
          'Aucun document',
        ],
        image:
          '/images/solutions/portail-client/coro-portail-client-carte.webp',
        alt: 'Vue cartographique des bâtiments dans CORO',
      },

      activities: {
        kicker: 'Planification',
        title: 'Les prochaines obligations restent visibles',
        text:
          'Le portail ne se limite pas aux documents. Le client retrouve les activités prévues pour ses bâtiments et peut anticiper les prochaines interventions liées à sa conformité et à sa préparation aux mesures d’urgence.',
        examples: [
          'Mise à jour annuelle d’un PMU ou d’un PSI',
          'Formation client',
          'Exercice d’évacuation',
          'Exercice de table',
          'Relevé technique',
          'Inspection',
          'Rencontre de suivi',
        ],
        image:
          '/images/solutions/portail-client/coro-portail-client-activites.webp',
        alt: 'Calendrier des activités du portail client CORO',
      },

      lifecycle: {
        kicker: 'Cycle de vie documentaire',
        title: 'De la livraison du document à sa traçabilité complète',
        text:
          'CORO conserve la continuité du dossier après la production du document. Le client peut consulter son document, suivre son approbation, le télécharger, le signer électroniquement et retrouver les différentes étapes de son historique.',
        steps: [
          'Document reçu',
          'Document consulté',
          'Approbation',
          'Signature',
          'Historique conservé',
        ],
        features: [
          {
            title: 'Téléchargement bilingue',
            text: 'Les versions PDF disponibles peuvent être téléchargées directement depuis le portail, notamment en français et en anglais lorsqu’elles sont produites.',
          },
          {
            title: 'Approbation documentée',
            text: 'L’identité de l’approbateur ainsi que la date d’approbation demeurent associées au document.',
          },
          {
            title: 'Signature électronique',
            text: 'Le portail conserve le signataire, son adresse courriel ainsi que la date et l’heure de la signature.',
          },
          {
            title: 'Historique des versions',
            text: 'Les différentes versions du document demeurent regroupées dans un historique chronologique.',
          },
          {
            title: 'Commentaires',
            text: 'Le client peut transmettre ses observations directement dans le dossier sans modifier le document lui-même.',
          },
        ],
        image:
          '/images/solutions/portail-client/coro-portail-client-cycle-documentaire.webp',
        alt: 'Historique, approbation et signature électronique d’un document CORO',
      },

      connection: {
        kicker: 'Continuité du service',
        title: 'Le portail client et l’espace conseiller travaillent ensemble',
        text:
          'Pendant que le client suit ses bâtiments, documents et activités dans son portail, l’équipe responsable conserve son propre environnement CORO pour produire les documents, coordonner les projets, gérer les tâches et maintenir les dossiers à jour.',
        image:
          '/images/solutions/portail-client/coro-portail-client-espace-conseiller.webp',
        alt: 'Tableau de bord conseiller de la plateforme CORO',
      },

      sentinelle: {
        kicker: 'Un écosystème qui évolue',
        title: 'Du document à l’exploitation du bâtiment',
        text:
          'Le portail peut également devenir le point d’accès aux autres services CORO associés au bâtiment. Avec Coro Sentinelle, les organisations peuvent notamment gérer leur registre d’occupation et disposer d’outils opérationnels utiles lors d’une évacuation.',
        cta: 'Découvrir Coro Sentinelle',
      },

      faqTitle: 'Questions fréquentes',

      faq: [
        {
          q: 'Le portail peut-il gérer plusieurs bâtiments ?',
          a: 'Oui. Le portail est conçu pour les clients possédant un seul bâtiment comme pour les organisations multisites. Les utilisateurs autorisés peuvent accéder aux bâtiments associés à leur organisation.',
        },
        {
          q: 'Les clients peuvent-ils modifier les documents ?',
          a: 'Non. Les documents de conformité ne sont pas modifiés directement par le client dans le portail. Le client peut toutefois les consulter, les télécharger, les approuver ou signer selon le processus applicable et transmettre des commentaires.',
        },
        {
          q: 'Les signatures sont-elles conservées ?',
          a: 'Oui. Lorsque la signature électronique est utilisée, le portail conserve les informations associées au signataire ainsi que la date et l’heure de la signature dans l’historique du document.',
        },
        {
          q: 'Peut-on conserver plusieurs versions d’un même document ?',
          a: 'Oui. CORO permet de conserver l’historique des versions afin de maintenir une trace chronologique de l’évolution du document et de ses étapes d’approbation.',
        },
        {
          q: 'Le client peut-il suivre ses prochaines activités ?',
          a: 'Oui. Les activités associées à ses bâtiments peuvent être affichées dans un calendrier : révisions documentaires, formations, exercices, relevés techniques, inspections et autres interventions planifiées.',
        },
        {
          q: 'Le portail est-il accessible sur mobile ?',
          a: 'Oui. Le portail client est conçu pour s’adapter aux ordinateurs, tablettes et appareils mobiles.',
        },
      ],

      finalTitle: 'Transformez la livraison d’un document en véritable expérience client.',
      finalText:
        'Avec CORO, vos clients ne reçoivent plus simplement un PDF. Ils disposent d’un espace structuré pour suivre leurs bâtiments, leur documentation, leurs activités et l’évolution de leur conformité.',
    },

    en: {
      tag: 'Client Portal',

      heroEyebrow: 'The CORO client experience',
      title: 'Your clients’ compliance does not stop when the PDF is delivered.',
      intro:
        'CORO gives your clients a true compliance management space where buildings, documents, activities, approvals, signatures, comments and version history are centralized in one secure portal.',

      heroImage:
        '/images/solutions/portail-client/coro-portail-client-tableau-de-bord.webp',

      primaryCta: 'Request a demo',
      portalCta: 'Access the portal',

      proofTitle: 'A portal designed to extend your service to the client',
      proofIntro:
        'Instead of sending a document by email and losing continuity afterward, CORO keeps the complete client record structured and accessible in one environment.',

      highlights: [
        {
          number: '01',
          title: 'Document tracking',
          text: 'Validated, in progress, under review and signed documents.',
        },
        {
          number: '02',
          title: 'Building portfolio',
          text: 'All client buildings centralized in one place.',
        },
        {
          number: '03',
          title: 'Traceability',
          text: 'Versions, approvals, signatures and comments retained.',
        },
        {
          number: '04',
          title: 'Activities',
          text: 'Reviews, training, drills and scheduled interventions.',
        },
      ],

      dashboard: {
        kicker: 'Overview',
        title: 'A dashboard that immediately shows the current situation',
        text:
          'As soon as they sign in, clients can see the status of their compliance documents, recent documents, upcoming activities and associated buildings. The information remains easy to understand without searching through email chains or multiple systems.',
        bullets: [
          'Total number of documents',
          'Validated, in-progress and under-review documents',
          'Signed documents',
          'Recent documents',
          'Upcoming activities',
          'Quick access to each building',
        ],
        image:
          '/images/solutions/portail-client/coro-portail-client-tableau-de-bord.webp',
        alt: 'CORO client portal dashboard',
      },

      buildings: {
        kicker: 'Building management',
        title: 'Compliance structured around each building',
        text:
          'Each building has its own space containing documents, address, responsible person, file status and associated services. For organizations managing several properties, the portal becomes a true portfolio view.',
        bullets: [
          'Documents grouped by building',
          'Responsible contact identified',
          'Document counts and progress status',
          'Direct access to documents',
          'Access to Coro Sentinel when activated',
          'Multi-site organization view',
        ],
        image:
          '/images/solutions/portail-client/coro-portail-client-batiments.webp',
        alt: 'Building management in the CORO client portal',
      },

      map: {
        kicker: 'Map view',
        title: 'One organization. Multiple buildings. One view.',
        text:
          'The map view allows clients to visualize their property portfolio and the compliance status of each building. Status indicators make it easy to identify properties that are current, in progress, due for renewal or without documents.',
        statuses: [
          'Up to date',
          'In progress',
          'Renewal required',
          'No document',
        ],
        image:
          '/images/solutions/portail-client/coro-portail-client-carte.webp',
        alt: 'CORO building portfolio map',
      },

      activities: {
        kicker: 'Planning',
        title: 'Upcoming obligations stay visible',
        text:
          'The portal goes beyond document storage. Clients can see planned activities for their buildings and anticipate upcoming compliance and emergency preparedness work.',
        examples: [
          'Annual emergency plan update',
          'Client training',
          'Evacuation drill',
          'Tabletop exercise',
          'Technical survey',
          'Inspection',
          'Follow-up meeting',
        ],
        image:
          '/images/solutions/portail-client/coro-portail-client-activites.webp',
        alt: 'CORO client portal activity calendar',
      },

      lifecycle: {
        kicker: 'Document lifecycle',
        title: 'From document delivery to complete traceability',
        text:
          'CORO maintains continuity after the document is produced. Clients can review documents, track approvals, download files, sign electronically and access the complete history of the record.',
        steps: [
          'Document received',
          'Document viewed',
          'Approval',
          'Signature',
          'History retained',
        ],
        features: [
          {
            title: 'Bilingual downloads',
            text: 'Available PDF versions can be downloaded directly from the portal, including French and English versions when produced.',
          },
          {
            title: 'Documented approval',
            text: 'The approver’s identity and approval date remain associated with the document.',
          },
          {
            title: 'Electronic signature',
            text: 'The portal retains the signer’s name, email address and signature date and time.',
          },
          {
            title: 'Version history',
            text: 'Different versions of the document remain grouped in a chronological history.',
          },
          {
            title: 'Comments',
            text: 'Clients can submit observations directly within the record without editing the document itself.',
          },
        ],
        image:
          '/images/solutions/portail-client/coro-portail-client-cycle-documentaire.webp',
        alt: 'Document history, approval and electronic signature in CORO',
      },

      connection: {
        kicker: 'Service continuity',
        title: 'The client portal and advisor workspace work together',
        text:
          'While clients monitor their buildings, documents and activities in the portal, the responsible team keeps its own CORO workspace to produce documents, coordinate projects, manage tasks and maintain records.',
        image:
          '/images/solutions/portail-client/coro-portail-client-espace-conseiller.webp',
        alt: 'CORO advisor dashboard',
      },

      sentinelle: {
        kicker: 'A growing ecosystem',
        title: 'From documentation to building operations',
        text:
          'The client portal can also become an access point to other CORO services associated with the building. With Coro Sentinel, organizations can manage occupancy records and access operational tools useful during an evacuation.',
        cta: 'Discover Coro Sentinel',
      },

      faqTitle: 'Frequently asked questions',

      faq: [
        {
          q: 'Can the portal manage multiple buildings?',
          a: 'Yes. The portal is designed for clients with a single building as well as multi-site organizations. Authorized users can access the buildings associated with their organization.',
        },
        {
          q: 'Can clients edit documents?',
          a: 'No. Compliance documents are not directly edited by clients in the portal. Clients can, however, view, download, approve or sign them depending on the applicable workflow and submit comments.',
        },
        {
          q: 'Are electronic signatures retained?',
          a: 'Yes. When electronic signature is used, the portal retains signer information along with the signature date and time in the document history.',
        },
        {
          q: 'Can multiple versions of the same document be retained?',
          a: 'Yes. CORO maintains version history to preserve a chronological record of document changes and approval stages.',
        },
        {
          q: 'Can clients track upcoming activities?',
          a: 'Yes. Activities associated with their buildings can appear in a calendar, including document reviews, training, drills, technical surveys, inspections and other scheduled work.',
        },
        {
          q: 'Is the portal mobile-friendly?',
          a: 'Yes. The client portal is designed to adapt to desktop computers, tablets and mobile devices.',
        },
      ],

      finalTitle: 'Turn document delivery into a true client experience.',
      finalText:
        'With CORO, your clients receive more than a PDF. They gain a structured environment for tracking buildings, documentation, activities and the evolution of their compliance.',
    },
  };

  const d = content[lang];

  const currentUrl =
    lang === 'en'
      ? `${SITE_URL}/portail-client?lang=en`
      : `${SITE_URL}/portail-client`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: d.title,
    description: d.intro,
    url: currentUrl,
    inLanguage: lang === 'fr' ? 'fr-CA' : 'en-CA',
    isPartOf: {
      '@type': 'WebSite',
      name: 'CORO',
      url: SITE_URL,
    },
    about: {
      '@type': 'SoftwareApplication',
      name: 'CORO',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Coro Solutions Inc.',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/coro-logo.png`,
      },
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: lang === 'fr' ? 'Accueil' : 'Home',
        item: lang === 'en' ? `${SITE_URL}/?lang=en` : SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: d.tag,
        item: currentUrl,
      },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: d.faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <div className="portal-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .portal-page {
          min-height: 100vh;
          background: #f7f9fb;
          color: #243746;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .portal-container {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
        }

        .portal-nav {
          background: #2c3e50;
          padding: 0 24px;
        }

        .portal-nav-inner {
          max-width: 1200px;
          height: 64px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .portal-logo {
          color: white;
          font-weight: 900;
          font-size: 24px;
          letter-spacing: -1px;
          text-decoration: none;
        }

        .portal-logo span {
          color: #c0392b;
        }

        .portal-nav-links {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .portal-nav-link {
          color: rgba(255,255,255,.72);
          font-size: 14px;
          text-decoration: none;
        }

        .portal-lang {
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 6px;
          padding: 5px 10px;
          font-size: 13px;
        }

        .portal-breadcrumb {
          padding: 12px 24px;
          background: white;
          border-bottom: 1px solid #e9ecef;
        }

        .portal-breadcrumb p {
          max-width: 1180px;
          margin: 0 auto;
          font-size: 13px;
          color: #adb5bd;
        }

        .portal-breadcrumb a {
          color: #adb5bd;
          text-decoration: none;
        }

        .portal-hero {
          position: relative;
          overflow: hidden;
          padding: 88px 0 92px;
          background:
            radial-gradient(circle at 85% 15%, rgba(72,180,239,.15), transparent 28%),
            linear-gradient(135deg, #0d2338 0%, #174463 100%);
        }

        .portal-hero::after {
          content: "";
          position: absolute;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          right: -140px;
          bottom: -220px;
          background: rgba(255,255,255,.035);
        }

        .portal-hero-grid {
          display: grid;
          grid-template-columns: .92fr 1.08fr;
          gap: 56px;
          align-items: center;
        }

        .portal-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          margin-bottom: 22px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 999px;
          color: #d7edf9;
          background: rgba(255,255,255,.06);
          text-transform: uppercase;
          letter-spacing: .1em;
          font-size: 11px;
          font-weight: 800;
        }

        .portal-hero h1 {
          margin: 0 0 22px;
          max-width: 680px;
          font-size: clamp(36px, 4.5vw, 58px);
          line-height: 1.04;
          letter-spacing: -.04em;
          color: white;
          font-weight: 900;
        }

        .portal-hero p {
          margin: 0 0 32px;
          max-width: 650px;
          color: #d9e7ef;
          font-size: 18px;
          line-height: 1.7;
        }

        .portal-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
        }

        .portal-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 50px;
          padding: 0 25px;
          border-radius: 9px;
          font-size: 15px;
          font-weight: 750;
          text-decoration: none;
          transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
        }

        .portal-btn:hover {
          transform: translateY(-2px);
        }

        .portal-btn-primary {
          background: #c0392b;
          color: white;
          box-shadow: 0 10px 30px rgba(192,57,43,.22);
        }

        .portal-btn-outline {
          color: white;
          border: 1px solid rgba(255,255,255,.35);
          background: rgba(255,255,255,.04);
        }

        .portal-hero-media {
          position: relative;
        }

        .portal-browser {
          overflow: hidden;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,.14);
          background: white;
          box-shadow: 0 30px 80px rgba(0,0,0,.36);
        }

        .portal-browser-bar {
          height: 32px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 12px;
          background: #eef2f5;
          border-bottom: 1px solid #e4e8eb;
        }

        .portal-browser-bar span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #bcc6cc;
        }

        .portal-browser img {
          display: block;
          width: 100%;
          height: auto;
        }

        .portal-proof {
          padding: 76px 0 68px;
          background: white;
        }

        .portal-center-header {
          max-width: 820px;
          margin: 0 auto 44px;
          text-align: center;
        }

        .portal-section-kicker {
          display: inline-block;
          margin-bottom: 10px;
          color: #c0392b;
          font-size: 12px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .11em;
        }

        .portal-center-header h2,
        .portal-copy h2 {
          margin: 0 0 16px;
          color: #22394a;
          font-weight: 900;
          letter-spacing: -.025em;
        }

        .portal-center-header h2 {
          font-size: clamp(28px, 3vw, 39px);
        }

        .portal-center-header p,
        .portal-copy > p {
          color: #667984;
          font-size: 16px;
          line-height: 1.75;
        }

        .portal-highlights {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .portal-highlight {
          padding: 26px;
          border: 1px solid #e5eaed;
          border-radius: 14px;
          background: #fbfcfd;
        }

        .portal-highlight-number {
          display: block;
          margin-bottom: 18px;
          color: #bfc9cf;
          font-size: 13px;
          font-weight: 800;
        }

        .portal-highlight h3 {
          margin: 0 0 8px;
          color: #263f50;
          font-size: 17px;
        }

        .portal-highlight p {
          margin: 0;
          color: #73838d;
          font-size: 14px;
          line-height: 1.6;
        }

        .portal-feature {
          padding: 92px 0;
        }

        .portal-feature-white {
          background: white;
        }

        .portal-feature-soft {
          background: #f7f9fb;
        }

        .portal-feature-dark {
          color: white;
          background:
            radial-gradient(circle at 10% 0%, rgba(72,180,239,.1), transparent 30%),
            linear-gradient(135deg, #0d2338, #174463);
        }

        .portal-feature-grid {
          display: grid;
          grid-template-columns: .9fr 1.1fr;
          gap: 64px;
          align-items: center;
        }

        .portal-feature-grid.reverse {
          grid-template-columns: 1.1fr .9fr;
        }

        .portal-feature-grid.reverse .portal-copy {
          order: 2;
        }

        .portal-feature-grid.reverse .portal-media {
          order: 1;
        }

        .portal-copy h2 {
          font-size: clamp(28px, 3vw, 40px);
          line-height: 1.12;
        }

        .portal-feature-dark .portal-copy h2 {
          color: white;
        }

        .portal-feature-dark .portal-copy > p {
          color: #d7e4eb;
        }

        .portal-list {
          margin: 28px 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 12px;
        }

        .portal-list li {
          position: relative;
          padding-left: 27px;
          color: #405965;
          font-size: 15px;
          line-height: 1.55;
        }

        .portal-list li::before {
          content: "✓";
          position: absolute;
          left: 0;
          top: 0;
          color: #2dad71;
          font-weight: 900;
        }

        .portal-feature-dark .portal-list li {
          color: #e4edf2;
        }

        .portal-media {
          position: relative;
        }

        .portal-shot {
          display: block;
          width: 100%;
          border-radius: 16px;
          border: 1px solid #e1e7eb;
          box-shadow: 0 24px 60px rgba(28,45,58,.12);
        }

        .portal-feature-dark .portal-shot {
          border-color: rgba(255,255,255,.12);
          box-shadow: 0 30px 70px rgba(0,0,0,.28);
        }

        .portal-map-shot {
          max-width: 1050px;
          margin: 42px auto 0;
        }

        .portal-statuses {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 28px;
        }

        .portal-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 13px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 999px;
          background: rgba(255,255,255,.06);
          color: #edf4f7;
          font-size: 13px;
        }

        .portal-status::before {
          content: "";
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #48b4ef;
        }

        .portal-activity-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 11px;
          margin-top: 28px;
        }

        .portal-activity-item {
          padding: 12px 14px;
          border-radius: 9px;
          border: 1px solid #e6ebee;
          background: white;
          color: #425966;
          font-size: 14px;
        }

        .portal-cycle {
          padding: 96px 0;
          background: white;
        }

        .portal-cycle-steps {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin: 36px 0 46px;
        }

        .portal-cycle-step {
          position: relative;
          padding: 18px 12px;
          border-radius: 10px;
          border: 1px solid #dce7e1;
          background: #f7fbf9;
          text-align: center;
          color: #335348;
          font-size: 13px;
          font-weight: 750;
        }

        .portal-cycle-step:not(:last-child)::after {
          content: "→";
          position: absolute;
          right: -10px;
          top: 50%;
          z-index: 2;
          transform: translate(50%, -50%);
          color: #a8b6ae;
          font-size: 16px;
        }

        .portal-cycle-layout {
          display: grid;
          grid-template-columns: 1.2fr .8fr;
          gap: 48px;
          align-items: start;
        }

        .portal-cycle-features {
          display: grid;
          gap: 12px;
        }

        .portal-cycle-card {
          padding: 20px 22px;
          border: 1px solid #e5eaed;
          border-radius: 12px;
          background: #fbfcfd;
        }

        .portal-cycle-card h3 {
          margin: 0 0 7px;
          color: #283f50;
          font-size: 16px;
        }

        .portal-cycle-card p {
          margin: 0;
          color: #6b7d87;
          font-size: 14px;
          line-height: 1.6;
        }

        .portal-sentinelle {
          padding: 80px 0;
          background: #fff5f4;
        }

        .portal-sentinelle-box {
          padding: 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 40px;
          border-radius: 18px;
          border: 1px solid #f1d3cf;
          background: white;
          box-shadow: 0 16px 50px rgba(97,53,46,.07);
        }

        .portal-sentinelle-copy {
          max-width: 720px;
        }

        .portal-sentinelle h2 {
          margin: 0 0 13px;
          font-size: clamp(27px, 3vw, 37px);
          color: #283e4e;
        }

        .portal-sentinelle p {
          margin: 0;
          color: #6c7d86;
          line-height: 1.7;
        }

        .portal-faq {
          padding: 90px 0;
          background: #f7f9fb;
        }

        .portal-faq-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .portal-faq-item {
          padding: 26px;
          border-radius: 13px;
          border: 1px solid #e4e9ec;
          background: white;
        }

        .portal-faq-item h3 {
          margin: 0 0 10px;
          color: #293f4f;
          font-size: 16px;
        }

        .portal-faq-item p {
          margin: 0;
          color: #6d7e88;
          font-size: 14px;
          line-height: 1.7;
        }

        .portal-final {
          padding: 88px 0;
          text-align: center;
          background: #0f283d;
        }

        .portal-final h2 {
          max-width: 780px;
          margin: 0 auto 18px;
          color: white;
          font-size: clamp(30px, 4vw, 45px);
          line-height: 1.1;
          letter-spacing: -.03em;
        }

        .portal-final p {
          max-width: 700px;
          margin: 0 auto 30px;
          color: #cbdbe4;
          font-size: 16px;
          line-height: 1.75;
        }

        .portal-footer-note {
          padding: 25px 24px;
          background: #0a1d2c;
          color: #8ea4b2;
          font-size: 12px;
          text-align: center;
        }

        @media (max-width: 980px) {
          .portal-hero-grid,
          .portal-feature-grid,
          .portal-feature-grid.reverse,
          .portal-cycle-layout {
            grid-template-columns: 1fr;
          }

          .portal-feature-grid.reverse .portal-copy,
          .portal-feature-grid.reverse .portal-media {
            order: initial;
          }

          .portal-highlights {
            grid-template-columns: repeat(2, 1fr);
          }

          .portal-cycle-steps {
            grid-template-columns: 1fr;
          }

          .portal-cycle-step:not(:last-child)::after {
            content: "↓";
            right: auto;
            top: auto;
            left: 50%;
            bottom: -17px;
            transform: translateX(-50%);
          }

          .portal-sentinelle-box {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 700px) {
          .portal-container {
            width: min(100% - 30px, 1180px);
          }

          .portal-nav {
            padding: 0 15px;
          }

          .portal-nav-link:first-child {
            display: none;
          }

          .portal-hero {
            padding: 62px 0 66px;
          }

          .portal-hero-grid {
            gap: 38px;
          }

          .portal-hero h1 {
            font-size: 38px;
          }

          .portal-hero p {
            font-size: 16px;
          }

          .portal-feature,
          .portal-cycle,
          .portal-faq {
            padding: 68px 0;
          }

          .portal-proof {
            padding: 64px 0;
          }

          .portal-highlights,
          .portal-faq-grid,
          .portal-activity-grid {
            grid-template-columns: 1fr;
          }

          .portal-sentinelle-box {
            padding: 30px 24px;
          }

          .portal-btn {
            width: 100%;
          }
        }
      `}</style>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c'),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* NAVIGATION */}
      <nav className="portal-nav">
        <div className="portal-nav-inner">
          <a
            href={lang === 'en' ? '/?lang=en' : '/'}
            className="portal-logo"
          >
            CO<span>RO</span>
          </a>

          <div className="portal-nav-links">
            <a
              href={lang === 'en' ? '/?lang=en' : '/'}
              className="portal-nav-link"
            >
              {lang === 'fr' ? '← Accueil' : '← Home'}
            </a>

            <a
              href={
                lang === 'fr'
                  ? '/portail-client?lang=en'
                  : '/portail-client'
              }
              className="portal-nav-link portal-lang"
            >
              {lang === 'fr' ? 'EN' : 'FR'}
            </a>
          </div>
        </div>
      </nav>

      {/* BREADCRUMB */}
      <div className="portal-breadcrumb">
        <p>
          <a href={lang === 'en' ? '/?lang=en' : '/'}>
            getcoro.io
          </a>
          {' / '}
          <span>{d.tag}</span>
        </p>
      </div>

      {/* HERO */}
      <section className="portal-hero">
        <div className="portal-container portal-hero-grid">
          <div>
            <span className="portal-eyebrow">
              {d.heroEyebrow}
            </span>

            <h1>{d.title}</h1>

            <p>{d.intro}</p>

            <div className="portal-actions">
              <a
                href={lang === 'fr' ? '/#demo' : '/?lang=en#demo'}
                className="portal-btn portal-btn-primary"
              >
                {d.primaryCta} →
              </a>

              <a
                href="https://client.getcoro.io/login"
                className="portal-btn portal-btn-outline"
              >
                {d.portalCta} →
              </a>
            </div>
          </div>

          <div className="portal-hero-media">
            <div className="portal-browser">
              <div className="portal-browser-bar">
                <span />
                <span />
                <span />
              </div>

              <img
                src={d.heroImage}
                alt={
                  lang === 'fr'
                    ? 'Tableau de bord du portail client CORO'
                    : 'CORO client portal dashboard'
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* INTRO / VALEUR */}
      <section className="portal-proof">
        <div className="portal-container">
          <div className="portal-center-header">
            <span className="portal-section-kicker">
              {d.tag}
            </span>

            <h2>{d.proofTitle}</h2>

            <p>{d.proofIntro}</p>
          </div>

          <div className="portal-highlights">
            {d.highlights.map((item) => (
              <div className="portal-highlight" key={item.number}>
                <span className="portal-highlight-number">
                  {item.number}
                </span>

                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD */}
      <section className="portal-feature portal-feature-soft">
        <div className="portal-container portal-feature-grid">
          <div className="portal-copy">
            <span className="portal-section-kicker">
              {d.dashboard.kicker}
            </span>

            <h2>{d.dashboard.title}</h2>

            <p>{d.dashboard.text}</p>

            <ul className="portal-list">
              {d.dashboard.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="portal-media">
            <img
              className="portal-shot"
              src={d.dashboard.image}
              alt={d.dashboard.alt}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* BUILDINGS */}
      <section className="portal-feature portal-feature-white">
        <div className="portal-container portal-feature-grid reverse">
          <div className="portal-copy">
            <span className="portal-section-kicker">
              {d.buildings.kicker}
            </span>

            <h2>{d.buildings.title}</h2>

            <p>{d.buildings.text}</p>

            <ul className="portal-list">
              {d.buildings.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="portal-media">
            <img
              className="portal-shot"
              src={d.buildings.image}
              alt={d.buildings.alt}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* MAP */}
      <section className="portal-feature portal-feature-dark">
        <div className="portal-container">
          <div className="portal-center-header">
            <span className="portal-section-kicker">
              {d.map.kicker}
            </span>

            <h2 style={{ color: '#FFFFFF' }}>
              {d.map.title}
            </h2>

            <p style={{ color: '#D7E4EB' }}>
              {d.map.text}
            </p>

            <div className="portal-statuses">
              {d.map.statuses.map((status) => (
                <span className="portal-status" key={status}>
                  {status}
                </span>
              ))}
            </div>
          </div>

          <div className="portal-map-shot">
            <img
              className="portal-shot"
              src={d.map.image}
              alt={d.map.alt}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ACTIVITIES */}
      <section className="portal-feature portal-feature-soft">
        <div className="portal-container portal-feature-grid">
          <div className="portal-copy">
            <span className="portal-section-kicker">
              {d.activities.kicker}
            </span>

            <h2>{d.activities.title}</h2>

            <p>{d.activities.text}</p>

            <div className="portal-activity-grid">
              {d.activities.examples.map((item) => (
                <div
                  className="portal-activity-item"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="portal-media">
            <img
              className="portal-shot"
              src={d.activities.image}
              alt={d.activities.alt}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* DOCUMENT LIFECYCLE */}
      <section className="portal-cycle">
        <div className="portal-container">
          <div className="portal-center-header">
            <span className="portal-section-kicker">
              {d.lifecycle.kicker}
            </span>

            <h2>{d.lifecycle.title}</h2>

            <p>{d.lifecycle.text}</p>
          </div>

          <div className="portal-cycle-steps">
            {d.lifecycle.steps.map((step) => (
              <div className="portal-cycle-step" key={step}>
                {step}
              </div>
            ))}
          </div>

          <div className="portal-cycle-layout">
            <div>
              <img
                className="portal-shot"
                src={d.lifecycle.image}
                alt={d.lifecycle.alt}
                loading="lazy"
              />
            </div>

            <div className="portal-cycle-features">
              {d.lifecycle.features.map((feature) => (
                <div
                  className="portal-cycle-card"
                  key={feature.title}
                >
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ADVISOR + CLIENT */}
      <section className="portal-feature portal-feature-soft">
        <div className="portal-container portal-feature-grid reverse">
          <div className="portal-copy">
            <span className="portal-section-kicker">
              {d.connection.kicker}
            </span>

            <h2>{d.connection.title}</h2>

            <p>{d.connection.text}</p>
          </div>

          <div className="portal-media">
            <img
              className="portal-shot"
              src={d.connection.image}
              alt={d.connection.alt}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* SENTINELLE */}
      <section className="portal-sentinelle">
        <div className="portal-container">
          <div className="portal-sentinelle-box">
            <div className="portal-sentinelle-copy">
              <span className="portal-section-kicker">
                {d.sentinelle.kicker}
              </span>

              <h2>{d.sentinelle.title}</h2>
              <p>{d.sentinelle.text}</p>
            </div>

            <a
              href={
                lang === 'fr'
                  ? '/coro-sentinelle'
                  : '/coro-sentinelle?lang=en'
              }
              className="portal-btn portal-btn-primary"
            >
              {d.sentinelle.cta} →
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="portal-faq">
        <div className="portal-container">
          <div className="portal-center-header">
            <span className="portal-section-kicker">
              FAQ
            </span>

            <h2>{d.faqTitle}</h2>
          </div>

          <div className="portal-faq-grid">
            {d.faq.map((item) => (
              <div className="portal-faq-item" key={item.q}>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="portal-final">
        <div className="portal-container">
          <h2>{d.finalTitle}</h2>

          <p>{d.finalText}</p>

          <div
            className="portal-actions"
            style={{ justifyContent: 'center' }}
          >
            <a
              href={lang === 'fr' ? '/#demo' : '/?lang=en#demo'}
              className="portal-btn portal-btn-primary"
            >
              {d.primaryCta} →
            </a>

            <a
              href="https://client.getcoro.io/login"
              className="portal-btn portal-btn-outline"
            >
              {d.portalCta} →
            </a>
          </div>
        </div>
      </section>

      <div className="portal-footer-note">
        © 2026 Coro Solutions Inc. —{' '}
        {lang === 'fr'
          ? 'Tous droits réservés.'
          : 'All rights reserved.'}
      </div>
    </div>
  );
}