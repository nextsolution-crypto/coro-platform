import { Metadata } from 'next';
import DemoForm from '../DemoForm';

const SITE_URL = 'https://getcoro.io';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang: langParam } = await searchParams;
  const isEnglish = langParam === 'en';

  const frUrl = `${SITE_URL}/contact`;
  const enUrl = `${SITE_URL}/contact?lang=en`;
  const currentUrl = isEnglish ? enUrl : frUrl;

  const title = isEnglish ? 'Contact us — CORO' : 'Nous contacter — CORO';

  const description = isEnglish
    ? 'Questions about CORO? Reach our team by email, phone, or by requesting a demo — we typically respond within 24 hours.'
    : 'Une question sur CORO ? Contactez notre équipe par courriel, téléphone, ou demandez une démo — nous répondons généralement en 24 heures.';

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
          alt: isEnglish ? 'CORO — Contact us' : 'CORO — Nous contacter',
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

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const lang = params?.lang === 'en' ? 'en' : 'fr';

  const t = {
    fr: {
      tag: 'Contact',
      title: 'Parlons de vos besoins en conformité',
      intro: 'Une question sur CORO, un projet précis à discuter ou envie d’une démonstration ? Notre équipe vous répond généralement en 24 heures.',
      emailLabel: 'Courriel',
      phoneLabel: 'Téléphone',
      addressLabel: 'Adresse',
      address: '2879 Boul. Pierre-Bernard, Montréal (QC), H1L 4R2, Canada',
      hoursLabel: 'Disponibilité',
      hours: 'Lundi au vendredi, 8h à 17h (HE)',
      formTitle: 'Envoyer un message',
      formIntro: 'Remplissez le formulaire ci-dessous — nous revenons vers vous rapidement.',
    },
    en: {
      tag: 'Contact',
      title: 'Let’s talk about your compliance needs',
      intro: 'A question about CORO, a specific project to discuss, or want a demo? Our team typically responds within 24 hours.',
      emailLabel: 'Email',
      phoneLabel: 'Phone',
      addressLabel: 'Address',
      address: '2879 Boul. Pierre-Bernard, Montreal (QC), H1L 4R2, Canada',
      hoursLabel: 'Availability',
      hours: 'Monday to Friday, 8am to 5pm (ET)',
      formTitle: 'Send us a message',
      formIntro: 'Fill out the form below — we’ll get back to you quickly.',
    },
  }[lang];

  const currentUrl = lang === 'en' ? `${SITE_URL}/contact?lang=en` : `${SITE_URL}/contact`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: t.title,
    description: t.intro,
    url: currentUrl,
    inLanguage: lang === 'fr' ? 'fr-CA' : 'en-CA',
    isPartOf: {
      '@type': 'WebSite',
      name: 'CORO',
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
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'sales',
          email: 'info@getcoro.io',
          telephone: '+1-514-791-7871',
          areaServed: 'CA',
          availableLanguage: ['fr', 'en'],
        },
      ],
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
        name: t.tag,
        item: currentUrl,
      },
    ],
  };

  return (
    <div style={{ fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c') }}
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
            <a href={lang === 'fr' ? '/contact?lang=en' : '/contact'}
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
            {' '}/ <span style={{ color: '#6C757D' }}>{t.tag}</span>
          </p>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #2C3E50 0%, #C0392BCC 100%)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 800, color: '#FFFFFF', backgroundColor: '#C0392B', padding: '4px 14px', borderRadius: 4, letterSpacing: '0.1em', marginBottom: 20 }}>
            {t.tag}
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.15, marginBottom: 16 }}>{t.title}</h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>{t.intro}</p>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 48 }}>

          {/* Coordonnées */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 28, border: '1px solid #E9ECEF' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t.emailLabel}</h3>
                <a href="mailto:info@getcoro.io" style={{ fontSize: 18, fontWeight: 700, color: '#2C3E50', textDecoration: 'none' }}>info@getcoro.io</a>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 28, border: '1px solid #E9ECEF' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t.phoneLabel}</h3>
                <a href="tel:+15147917871" style={{ fontSize: 18, fontWeight: 700, color: '#2C3E50', textDecoration: 'none' }}>+1 (514) 791-7871</a>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 28, border: '1px solid #E9ECEF' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t.addressLabel}</h3>
                <p style={{ fontSize: 15, color: '#2C3E50', lineHeight: 1.6, margin: 0 }}>{t.address}</p>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 28, border: '1px solid #E9ECEF' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t.hoursLabel}</h3>
                <p style={{ fontSize: 15, color: '#2C3E50', lineHeight: 1.6, margin: 0 }}>{t.hours}</p>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#2C3E50', marginBottom: 8 }}>{t.formTitle}</h2>
            <p style={{ fontSize: 15, color: '#6C757D', marginBottom: 24 }}>{t.formIntro}</p>
            <DemoForm lang={lang} />
          </div>

        </div>
      </div>
    </div>
  );
}
