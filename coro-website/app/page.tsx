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
      'CORO | Operational Resilience & Emergency Management Platform';

    const description =
      'CORO connects planning, facilities, incidents, response and public communications in a Canadian operational resilience platform.';

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
          'CORO connects planning, facilities, incidents, response and public communications in a Canadian operational resilience platform.',

        images: [
          {
            url: '/og-coro.jpg',
            width: 1728,
            height: 910,
            alt: 'CORO — Operational resilience platform connecting planning, response and public communication',
          },
        ],
      },

      twitter: {
        card: 'summary_large_image',

        title,

        description:
          'Canadian platform connecting emergency planning, facilities, incidents, response and public communications.',

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
    'CORO | Plateforme de résilience opérationnelle et mesures d’urgence';

  const description =
    'CORO relie la planification, les bâtiments, les incidents, l’intervention et les communications à la population dans une plateforme canadienne de résilience opérationnelle.';


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
        'CORO relie la planification, les bâtiments, les incidents, l’intervention et les communications à la population dans une plateforme canadienne de résilience opérationnelle.',

      images: [
        {
          url: '/og-coro.jpg',
          width: 1728,
          height: 910,
          alt: 'CORO — Plateforme de résilience opérationnelle reliant planification, intervention et communication à la population',
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',

      title,

      description:
        'Plateforme canadienne reliant planification d’urgence, bâtiments, incidents, intervention et communication à la population.',

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
