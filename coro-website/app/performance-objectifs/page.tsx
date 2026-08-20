import { Metadata } from 'next';

const SITE_URL = 'https://getcoro.io';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang: langParam } = await searchParams;
  const isEnglish = langParam === 'en';

  const frUrl = `${SITE_URL}/performance-objectifs`;
  const enUrl = `${SITE_URL}/performance-objectifs?lang=en`;
  const currentUrl = isEnglish ? enUrl : frUrl;

  const title = isEnglish
    ? 'Performance & Objectives — CORO'
    : 'Performance & Objectifs — CORO';

  const description = isEnglish
    ? 'Turn your operations into actionable data. Track hours, budgets, mandate performance, production capacity and objectives with CORO.'
    : 'Transformez vos opérations en données exploitables. Suivez les heures, budgets, rendement des mandats, capacité de production et objectifs avec CORO.';

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
            ? 'CORO — Performance and objectives'
            : 'CORO — Performance et objectifs',
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

export default async function PerformanceObjectifsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const lang = params?.lang === 'en' ? 'en' : 'fr';

  const content = {
    fr: {
      tag: 'Performance & Objectifs',
      title: 'Transformez vos opérations en données exploitables',
      intro: 'CORO vous donne une vision claire de la performance de votre organisation : heures, budgets, rendement des mandats, capacité de production et objectifs — pour identifier rapidement les écarts et mieux planifier vos ressources.',
      image: '/images/solutions/coro-performance-objectifs.webp',
      sections: [
        { title: 'Tableau de bord de rendement', content: 'Visualisez en temps réel les indicateurs clés de performance de votre organisation : taux d\'utilisation des conseillers, heures facturables vs non-facturables, mandats livrés dans les délais et revenus générés par type de document. Un coup d\'œil suffit pour savoir où vous en êtes.' },
        { title: 'Suivi des heures et du budget', content: 'Comparez systématiquement les heures budgétées aux heures réelles pour chaque mandat. Identifiez les mandats sous-estimés avant qu\'ils ne deviennent problématiques. Le timelog intégré permet à chaque conseiller d\'enregistrer ses heures directement dans CORO.' },
        { title: 'Capacity planning', content: 'Visualisez la charge de travail actuelle et prévisionnelle de chaque conseiller. Identifiez les périodes de surcharge ou de sous-utilisation. Planifiez l\'attribution des nouveaux mandats en fonction de la disponibilité réelle de votre équipe.' },
        { title: 'Rendement par conseiller', content: 'Suivez la performance individuelle de chaque membre de l\'équipe : mandats complétés, heures enregistrées, respect des délais et qualité documentaire. Identifiez les forces et les opportunités de développement au sein de votre équipe.' },
        { title: 'Objectifs et cibles', content: 'Définissez des objectifs mensuels ou trimestriels pour votre organisation et suivez leur progression en temps réel. Comparez vos résultats aux cibles fixées et ajustez votre planification en conséquence.' },
        { title: 'Rapports et exportations', content: 'Générez des rapports de performance pour vos réunions d\'équipe, vos revues de gestion ou vos présentations clients. Exportez les données en format tabulaire pour une analyse approfondie dans votre outil préféré.' },
      ],
      faq: [
        { q: 'Le module de performance est-il inclus dans tous les plans ?', a: 'Les fonctionnalités de base (timelog, suivi des heures par mandat) sont disponibles dans tous les plans. Le tableau de bord de rendement avancé et le capacity planning sont inclus dans les plans Standard et Entreprise.' },
        { q: 'Les données de performance sont-elles visibles par tous les utilisateurs ?', a: 'Non. Les conseillers voient uniquement leurs propres données. Les administrateurs ont accès aux données consolidées de l\'équipe. Le Super Admin voit l\'ensemble de l\'organisation.' },
        { q: 'Peut-on fixer des objectifs individuels par conseiller ?', a: 'Oui. CORO permet de définir des cibles d\'heures, de mandats complétés et de revenus par conseiller. Le suivi est automatique dès que les données de timelog sont enregistrées.' },
        { q: 'Les données sont-elles exportables pour la facturation ?', a: 'Oui. Le timelog peut être exporté par mandat, par client ou par période pour alimenter votre processus de facturation.' },
      ],
      cta: 'Demander une démo',
    },
    en: {
      tag: 'Performance & Objectives',
      title: 'Turn your operations into actionable data',
      intro: 'CORO gives you a clear view of your organization\'s performance: hours, budgets, mandate performance, production capacity and objectives — to quickly identify gaps and better plan your resources.',
      image: '/images/solutions/en/coro-performance-objectives.webp',
      sections: [
        { title: 'Performance dashboard', content: 'Visualize real-time key performance indicators for your organization: advisor utilization rate, billable vs non-billable hours, mandates delivered on time and revenue generated by document type. One glance tells you where you stand.' },
        { title: 'Hour and budget tracking', content: 'Systematically compare budgeted to actual hours for each mandate. Identify underestimated mandates before they become problematic. The integrated timelog allows each advisor to log hours directly in CORO.' },
        { title: 'Capacity planning', content: 'Visualize the current and projected workload of each advisor. Identify periods of overload or underutilization. Plan new mandate assignments based on your team\'s actual availability.' },
        { title: 'Advisor performance', content: 'Track individual performance of each team member: completed mandates, logged hours, deadline compliance and document quality. Identify strengths and development opportunities within your team.' },
        { title: 'Goals and targets', content: 'Set monthly or quarterly goals for your organization and track their progress in real time. Compare results to set targets and adjust your planning accordingly.' },
        { title: 'Reports and exports', content: 'Generate performance reports for team meetings, management reviews or client presentations. Export data in tabular format for in-depth analysis in your preferred tool.' },
      ],
      faq: [
        { q: 'Is the performance module included in all plans?', a: 'Basic features (timelog, hour tracking by mandate) are available in all plans. The advanced performance dashboard and capacity planning are included in Standard and Enterprise plans.' },
        { q: 'Is performance data visible to all users?', a: 'No. Advisors only see their own data. Administrators have access to consolidated team data. The Super Admin sees the entire organization.' },
        { q: 'Can individual goals be set per advisor?', a: 'Yes. CORO allows setting hour, completed mandate and revenue targets per advisor. Tracking is automatic once timelog data is recorded.' },
        { q: 'Is data exportable for billing?', a: 'Yes. The timelog can be exported by mandate, client or period to feed your billing process.' },
      ],
      cta: 'Request a demo',
    },
  };

  const d = content[lang];

  const currentUrl =
    lang === 'en'
      ? `${SITE_URL}/performance-objectifs?lang=en`
      : `${SITE_URL}/performance-objectifs`;

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
            <a href={lang === 'fr' ? '/performance-objectifs?lang=en' : '/performance-objectifs'}
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
      <div style={{ background: 'linear-gradient(135deg, #2C3E50 0%, #6C3483CC 100%)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(480px, 100%), 1fr))', gap: 48, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 800, color: '#FFFFFF', backgroundColor: '#8E44AD', padding: '4px 14px', borderRadius: 4, letterSpacing: '0.1em', marginBottom: 20 }}>
              {d.tag}
            </span>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, marginBottom: 20 }}>{d.title}</h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: 32 }}>{d.intro}</p>
            <a href={lang === 'fr' ? '/#demo' : '/?lang=en#demo'}
              style={{ display: 'inline-block', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>
              {d.cta} →
            </a>
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
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2C3E50', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #8E44AD' }}>{s.title}</h2>
              <p style={{ fontSize: 15, color: '#495057', lineHeight: 1.8 }}>{s.content}</p>
            </div>
          ))}
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

        {/* CTA */}
        <div style={{ marginTop: 64, backgroundColor: '#2C3E50', borderRadius: 16, padding: '48px 40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', marginBottom: 16 }}>
            {lang === 'fr' ? 'Prêt à piloter votre performance ?' : 'Ready to drive your performance?'}
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
    </div>
  );
}