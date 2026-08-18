import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';

const SITE_URL = 'https://getcoro.io';


/* ═══════════════════════════════════════════
   SEO / METADATA
═══════════════════════════════════════════ */

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang: langParam } = await searchParams;

  const isEnglish = langParam === 'en';

  const frUrl = SITE_URL;
  const enUrl = `${SITE_URL}?lang=en`;

  const currentUrl = isEnglish
    ? enUrl
    : frUrl;


  if (isEnglish) {
    const title =
      'CORO | Emergency Management & Compliance SaaS Platform';

    const description =
      'CORO is a Canadian SaaS platform for creating, structuring and managing emergency response plans, fire safety plans, business continuity plans and operational compliance documents.';

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

        locale: 'en_CA',

        alternateLocale: [
          'fr_CA',
        ],

        url: currentUrl,

        siteName: 'CORO',

        title,

        description:
          'Create, structure and manage emergency response, fire safety, business continuity and compliance documents with a SaaS platform designed for field professionals.',

        images: [
          {
            url: '/og-coro.jpg',
            width: 1200,
            height: 630,
            alt: 'CORO — Emergency management and compliance SaaS platform',
          },
        ],
      },

      twitter: {
        card: 'summary_large_image',

        title,

        description:
          'Canadian SaaS platform for emergency management, fire safety, business continuity and operational compliance documentation.',

        images: [
          '/og-coro.jpg',
        ],
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


  const title =
    'CORO | Plateforme SaaS de conformité et mesures d’urgence';

  const description =
    'CORO est une plateforme SaaS canadienne pour créer, structurer et gérer des plans de mesures d’urgence, de sécurité incendie, de continuité des activités et de conformité documentaire.';


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

      locale: 'fr_CA',

      alternateLocale: [
        'en_CA',
      ],

      url: currentUrl,

      siteName: 'CORO',

      title,

      description:
        'Créez, structurez et gérez vos documents de conformité avec une plateforme SaaS conçue pour les professionnels des mesures d’urgence, de la sécurité incendie et de la continuité.',

      images: [
        {
          url: '/og-coro.jpg',
          width: 1200,
          height: 630,
          alt: 'CORO — Plateforme SaaS de conformité et mesures d’urgence',
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',

      title,

      description:
        'Plateforme SaaS canadienne pour la création et la gestion de documents de conformité, de mesures d’urgence et de continuité.',

      images: [
        '/og-coro.jpg',
      ],
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


/* ═══════════════════════════════════════════
   PAGE
═══════════════════════════════════════════ */

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang: langParam } = await searchParams;

  const isEnglish =
    langParam === 'en';

  const currentUrl =
    isEnglish
      ? `${SITE_URL}?lang=en`
      : SITE_URL;


  /* ═══════════════════════════════════════
     JSON-LD WEBSITE
  ═══════════════════════════════════════ */

  const websiteJsonLd = {
    '@context':
      'https://schema.org',

    '@type':
      'WebSite',

    name:
      'CORO',

    alternateName:
      'CORO — Conformité Opérationnelle et Résilience Organisationnelle',

    url:
      currentUrl,

    inLanguage:
      isEnglish
        ? 'en-CA'
        : 'fr-CA',
  };


  /* ═══════════════════════════════════════
     JSON-LD ORGANIZATION
  ═══════════════════════════════════════ */

  const organizationJsonLd = {
    '@context':
      'https://schema.org',

    '@type':
      'Organization',

    name:
      'CORO',

    alternateName:
      'CORO — Conformité Opérationnelle et Résilience Organisationnelle',

    url:
      SITE_URL,

    logo: {
      '@type':
        'ImageObject',

      url:
        `${SITE_URL}/coro-logo.png`,

      contentUrl:
        `${SITE_URL}/coro-logo.png`,
    },

    description:
      isEnglish
        ? 'Canadian SaaS platform for operational compliance, emergency management, fire safety and business continuity.'
        : 'Plateforme SaaS canadienne de conformité opérationnelle, de mesures d’urgence, de sécurité incendie et de continuité des activités.',
  };


  return (
    <>
      <script
        type="application/ld+json"

        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              websiteJsonLd
            ).replace(
              /</g,
              '\\u003c'
            ),
        }}
      />

      <script
        type="application/ld+json"

        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              organizationJsonLd
            ).replace(
              /</g,
              '\\u003c'
            ),
        }}
      />

      <HomePageClient />
    </>
  );
}