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
    ? 'Client Portal — CORO'
    : 'Portail Client — CORO';

  const description = isEnglish
    ? 'Give your clients secure access to compliance documents, status tracking, upcoming activities and electronic signatures with the CORO client portal.'
    : 'Offrez à vos clients un espace sécurisé pour consulter leurs documents de conformité, suivre leur statut, visualiser leurs activités et signer électroniquement avec CORO.';

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
            ? 'CORO — Secure client portal'
            : 'CORO — Portail client sécurisé',
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
      title: 'Prolongez l\'expérience CORO jusqu\'à vos clients',
      intro: 'CORO offre à vos clients un espace sécurisé leur permettant de consulter leurs documents de conformité, suivre leur statut, visualiser leurs activités à venir et signer électroniquement leurs documents approuvés.',
      image: '/images/solutions/coro-portail-client.webp',
      sections: [
        { title: 'Accès sécurisé par client et bâtiment', content: 'Chaque client reçoit un accès personnalisé au portail dès la création de son dossier dans CORO. Les gestionnaires d\'immeuble accèdent uniquement aux documents de leurs bâtiments. Les clients corporatifs voient l\'ensemble du portefeuille de leur organisation. L\'accès est protégé par JWT et authentification sécurisée.' },
        { title: 'Consultation des documents validés', content: 'Vos clients peuvent consulter en ligne tous leurs documents au statut VALIDÉ. Le portail affiche le type de document, le bâtiment concerné, la date de dernière mise à jour et le statut de signature. Seuls les documents approuvés par votre équipe sont accessibles — un contrôle qualité non négociable.' },
        { title: 'Téléchargement PDF sécurisé', content: 'Les clients peuvent télécharger leurs documents en PDF directement depuis le portail. Le téléchargement est disponible uniquement pour les documents au statut VALIDÉ, garantissant que vos clients n\'accèdent jamais à un document incomplet ou non approuvé.' },
        { title: 'Signature électronique', content: 'Les clients peuvent signer électroniquement leurs documents directement dans le portail. La signature est horodatée et enregistrée dans l\'historique du document. Le conseiller est notifié dès qu\'un document est signé par le client.' },
        { title: 'Suivi des activités et échéances', content: 'Le portail affiche un calendrier des activités à venir pour chaque bâtiment : prochaines révisions documentaires, exercices d\'évacuation planifiés, formations requises. Vos clients anticipent mieux leurs obligations réglementaires.' },
        { title: 'Invitation automatique par courriel', content: 'Dès la création d\'un client ou d\'un bâtiment dans CORO, une invitation par courriel est automatiquement envoyée au responsable avec ses identifiants d\'accès au portail. Aucune démarche manuelle requise de votre part.' },
      ],
      faq: [
        { q: 'Le portail client est-il inclus dans tous les plans ?', a: 'Le portail client de base est inclus dans tous les plans CORO. Les fonctionnalités avancées (signature électronique, notifications personnalisées) sont disponibles dans les plans Standard et Entreprise.' },
        { q: 'Mes clients peuvent-ils modifier les documents dans le portail ?', a: 'Non. Le portail client est en lecture seule — vos clients consultent et signent les documents, mais ne peuvent pas les modifier. Toute modification passe par votre équipe dans la plateforme principale.' },
        { q: 'Comment mes clients reçoivent-ils leur accès ?', a: 'Dès la création d\'un client ou d\'un bâtiment dans CORO, une invitation automatique est envoyée par courriel avec les identifiants d\'accès. Si un client perd ses identifiants, il peut réinitialiser son mot de passe depuis le portail.' },
        { q: 'Le portail est-il accessible sur mobile ?', a: 'Oui. Le portail client est entièrement responsive et optimisé pour les appareils mobiles. Vos clients peuvent consulter leurs documents depuis n\'importe quel appareil.' },
      ],
      cta: 'Demander une démo',
    },
    en: {
      tag: 'Client Portal',
      title: 'Extend the CORO experience to your clients',
      intro: 'CORO provides your clients with a secure space to view their compliance documents, track their status, visualize upcoming activities and electronically sign their approved documents.',
      image: '/images/solutions/en/coro-client-portal.webp',
      sections: [
        { title: 'Secure access by client and building', content: 'Each client receives personalized portal access upon creation of their file in CORO. Building managers access only their buildings\' documents. Corporate clients see their entire organization\'s portfolio. Access is protected by JWT and secure authentication.' },
        { title: 'Viewing validated documents', content: 'Your clients can view all their VALIDATED documents online. The portal displays document type, building, last update date and signature status. Only documents approved by your team are accessible — a non-negotiable quality control.' },
        { title: 'Secure PDF download', content: 'Clients can download their documents as PDF directly from the portal. Download is only available for VALIDATED documents, ensuring your clients never access an incomplete or unapproved document.' },
        { title: 'Electronic signature', content: 'Clients can electronically sign their documents directly in the portal. The signature is timestamped and recorded in the document history. The advisor is notified as soon as a document is signed by the client.' },
        { title: 'Activity and deadline tracking', content: 'The portal displays an upcoming activity calendar for each building: next document revisions, planned evacuation drills, required training. Your clients better anticipate their regulatory obligations.' },
        { title: 'Automatic email invitation', content: 'Upon creation of a client or building in CORO, an email invitation is automatically sent to the responsible person with their portal access credentials. No manual steps required on your part.' },
      ],
      faq: [
        { q: 'Is the client portal included in all plans?', a: 'The basic client portal is included in all CORO plans. Advanced features (electronic signature, custom notifications) are available in Standard and Enterprise plans.' },
        { q: 'Can my clients modify documents in the portal?', a: 'No. The client portal is read-only — your clients view and sign documents but cannot modify them. Any modification goes through your team in the main platform.' },
        { q: 'How do my clients receive their access?', a: 'Upon creation of a client or building in CORO, an automatic invitation is sent by email with access credentials. If a client loses their credentials, they can reset their password from the portal.' },
        { q: 'Is the portal accessible on mobile?', a: 'Yes. The client portal is fully responsive and optimized for mobile devices. Your clients can view their documents from any device.' },
      ],
      cta: 'Request a demo',
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
      name: 'CORO',
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
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
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

      {/* Nav */}
      <nav style={{ backgroundColor: '#2C3E50', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href={lang === 'en' ? '/?lang=en' : '/'} style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-1px' }}>CO<span style={{ color: '#C0392B' }}>RO</span></span>
          </a>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href={lang === 'en' ? '/?lang=en' : '/'} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textDecoration: 'none' }}>
              {lang === 'fr' ? '← Accueil' : '← Home'}
            </a>
            <a href={lang === 'fr' ? '/portail-client?lang=en' : '/portail-client'}
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 4 }}>
              {lang === 'fr' ? 'EN' : 'FR'}
            </a>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E9ECEF', padding: '12px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#ADB5BD' }}>
            <a href={lang === 'en' ? '/?lang=en' : '/'} style={{ color: '#ADB5BD', textDecoration: 'none' }}>getcoro.io</a>
            {' '}/ <span style={{ color: '#6C757D' }}>{d.tag}</span>
          </p>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #2C3E50 0%, #1A4A6BCC 100%)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(480px, 100%), 1fr))', gap: 48, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 800, color: '#FFFFFF', backgroundColor: '#2980B9', padding: '4px 14px', borderRadius: 4, letterSpacing: '0.1em', marginBottom: 20 }}>
              {d.tag}
            </span>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, marginBottom: 20 }}>{d.title}</h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: 32 }}>{d.intro}</p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <a href={lang === 'fr' ? '/#demo' : '/?lang=en#demo'}
                style={{ display: 'inline-block', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>
                {d.cta} →
              </a>
              <a href="https://client.getcoro.io/login"
                style={{ display: 'inline-block', backgroundColor: 'transparent', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 16, border: '2px solid rgba(255,255,255,0.4)' }}>
                {lang === 'fr' ? 'Accéder au portail →' : 'Access the portal →'}
              </a>
            </div>
          </div>
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
            <img src={d.image} alt={d.title} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
          </div>
        </div>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(480px, 100%), 1fr))', gap: 32 }}>
          {d.sections.map((s, i) => (
            <div key={i} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 32, border: '1px solid #E9ECEF' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2C3E50', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #2980B9' }}>{s.title}</h2>
              <p style={{ fontSize: 15, color: '#495057', lineHeight: 1.8 }}>{s.content}</p>
            </div>
          ))}
        </div>

        {/* CTA portail */}
        <div style={{ marginTop: 48, backgroundColor: '#EBF5FB', borderRadius: 12, padding: 32, border: '1px solid #AED6F1', textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#1A5276', marginBottom: 8 }}>
            {lang === 'fr' ? 'Vous êtes un client CORO ?' : 'Are you a CORO client?'}
          </p>
          <p style={{ fontSize: 15, color: '#2E86C1', marginBottom: 20 }}>
            {lang === 'fr' ? 'Accédez directement à votre espace sécurisé.' : 'Access your secure space directly.'}
          </p>
          <a href="https://client.getcoro.io/login"
            style={{ display: 'inline-block', backgroundColor: '#2980B9', color: '#FFFFFF', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
            {lang === 'fr' ? 'Accéder au portail client →' : 'Access the client portal →'}
          </a>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#2C3E50', marginBottom: 32, textAlign: 'center' }}>
            {lang === 'fr' ? 'Questions fréquentes' : 'Frequently asked questions'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
            {d.faq.map((f, i) => (
              <div key={i} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 28, border: '1px solid #E9ECEF' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50', marginBottom: 10 }}>{f.q}</h3>
                <p style={{ fontSize: 15, color: '#6C757D', lineHeight: 1.7 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div style={{ marginTop: 64, backgroundColor: '#2C3E50', borderRadius: 16, padding: '48px 40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', marginBottom: 16 }}>
            {lang === 'fr' ? 'Prêt à offrir un portail client professionnel ?' : 'Ready to offer a professional client portal?'}
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>
            {lang === 'fr' ? 'CORO génère, structure et gère vos documents de conformité depuis une seule plateforme.' : 'CORO generates, structures and manages your compliance documents from a single platform.'}
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={lang === 'fr' ? '/#demo' : '/?lang=en#demo'} style={{ display: 'inline-block', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
              {d.cta} →
            </a>
            <a href={lang === 'fr' ? '/blog' : '/blog?lang=en'} style={{ display: 'inline-block', backgroundColor: 'transparent', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15, border: '2px solid rgba(255,255,255,0.3)' }}>
              {lang === 'fr' ? 'Lire nos guides →' : 'Read our guides →'}
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: '#2C3E50', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          © 2026 CORO — <a href="https://getcoro.io" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>getcoro.io</a>
        </p>
      </div>
    </div>
  );
}