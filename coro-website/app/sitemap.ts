import type { MetadataRoute } from 'next';

const SITE_URL = 'https://getcoro.io';

const API_URL = 'http://coro_backend:3002/api';


type BlogPost = {
  slug: string;

  publishedAt?: string | null;
  updatedAt?: string | null;

  titleEn?: string | null;
  contentEn?: string | null;
};


/* ═══════════════════════════════════════════
   RÉCUPÉRATION ARTICLES PUBLIÉS
═══════════════════════════════════════════ */

async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(
      `${API_URL}/blog/public`,
      {
        next: {
          revalidate: 300,
        },
      }
    );

    if (!res.ok) {
      console.error(
        'Sitemap: impossible de récupérer les articles du blogue'
      );

      return [];
    }

    return await res.json();

  } catch (error) {
    console.error(
      'Sitemap: erreur lors de la récupération du blogue',
      error
    );

    return [];
  }
}


/* ═══════════════════════════════════════════
   HELPERS URL
═══════════════════════════════════════════ */

const frUrl = (path: string) =>
  `${SITE_URL}${path}`;

const enUrl = (path: string) =>
  `${SITE_URL}${path}?lang=en`;


/* ═══════════════════════════════════════════
   SITEMAP
═══════════════════════════════════════════ */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {

  const lastModified =
    new Date('2026-08-18');


  /* ═══════════════════════════════════════
     PAGES STATIQUES
  ═══════════════════════════════════════ */

  const staticPages: MetadataRoute.Sitemap = [

    /* ─────────────────────────────────────
       ACCUEIL
    ───────────────────────────────────── */

    {
      url:
        SITE_URL,

      lastModified,

      changeFrequency:
        'weekly',

      priority:
        1,

      alternates: {
        languages: {
          'fr-CA':
            SITE_URL,

          'en-CA':
            `${SITE_URL}?lang=en`,
        },
      },
    },


    {
      url:
        `${SITE_URL}?lang=en`,

      lastModified,

      changeFrequency:
        'weekly',

      priority:
        1,

      alternates: {
        languages: {
          'fr-CA':
            SITE_URL,

          'en-CA':
            `${SITE_URL}?lang=en`,
        },
      },
    },


    /* ─────────────────────────────────────
       PAGES PRINCIPALES
    ───────────────────────────────────── */

    {
      url:
        frUrl('/about'),

      lastModified,

      changeFrequency:
        'monthly',

      priority:
        0.8,

      alternates: {
        languages: {
          'fr-CA':
            frUrl('/about'),

          'en-CA':
            enUrl('/about'),
        },
      },
    },


    {
      url:
        enUrl('/about'),

      lastModified,

      changeFrequency:
        'monthly',

      priority:
        0.8,

      alternates: {
        languages: {
          'fr-CA':
            frUrl('/about'),

          'en-CA':
            enUrl('/about'),
        },
      },
    },


    {
      url:
        frUrl('/security'),

      lastModified,

      changeFrequency:
        'monthly',

      priority:
        0.7,

      alternates: {
        languages: {
          'fr-CA':
            frUrl('/security'),

          'en-CA':
            enUrl('/security'),
        },
      },
    },


    {
      url:
        enUrl('/security'),

      lastModified,

      changeFrequency:
        'monthly',

      priority:
        0.7,

      alternates: {
        languages: {
          'fr-CA':
            frUrl('/security'),

          'en-CA':
            enUrl('/security'),
        },
      },
    },


    /*
     * Privacy et Terms sont laissées en FR uniquement
     * tant qu'on n'a pas vérifié qu'elles disposent
     * d'une vraie version anglaise.
     */

    {
      url:
        frUrl('/privacy'),

      lastModified,

      changeFrequency:
        'yearly',

      priority:
        0.3,
    },


    {
      url:
        frUrl('/terms'),

      lastModified,

      changeFrequency:
        'yearly',

      priority:
        0.3,
    },


    /* ═══════════════════════════════════════
       PAGES SOLUTIONS — FR + EN
    ═══════════════════════════════════════ */

    ...[
      {
        path:
          '/gestion-documentaire',

        priority:
          0.9,
      },

      {
        path:
          '/gestion-de-projets',

        priority:
          0.9,
      },

      {
        path:
          '/performance-objectifs',

        priority:
          0.8,
      },

      {
        path:
          '/portail-client',

        priority:
          0.8,
      },
    ].flatMap((page) => {

      const fr =
        frUrl(page.path);

      const en =
        enUrl(page.path);

      return [
        {
          url:
            fr,

          lastModified,

          changeFrequency:
            'monthly' as const,

          priority:
            page.priority,

          alternates: {
            languages: {
              'fr-CA':
                fr,

              'en-CA':
                en,
            },
          },
        },

        {
          url:
            en,

          lastModified,

          changeFrequency:
            'monthly' as const,

          priority:
            page.priority,

          alternates: {
            languages: {
              'fr-CA':
                fr,

              'en-CA':
                en,
            },
          },
        },
      ];
    }),


    /* ═══════════════════════════════════════
       PAGES DOCUMENTS
       FR SEULEMENT POUR LE MOMENT
    ═══════════════════════════════════════ */

    {
      url:
        frUrl(
          '/documents/plan-mesures-urgence-pmu'
        ),

      lastModified,

      changeFrequency:
        'monthly',

      priority:
        0.9,
    },


    {
      url:
        frUrl(
          '/documents/plan-securite-incendie-psi'
        ),

      lastModified,

      changeFrequency:
        'monthly',

      priority:
        0.9,
    },


    {
      url:
        frUrl(
          '/documents/plan-continuite-activites-pca'
        ),

      lastModified,

      changeFrequency:
        'monthly',

      priority:
        0.9,
    },


    {
      url:
        frUrl(
          '/documents/plan-gestion-crise-pgc'
        ),

      lastModified,

      changeFrequency:
        'monthly',

      priority:
        0.8,
    },


    {
      url:
        frUrl(
          '/documents/plan-reprise-activites-pra'
        ),

      lastModified,

      changeFrequency:
        'monthly',

      priority:
        0.8,
    },


    {
      url:
        frUrl(
          '/documents/plan-urgence-environnementale-pue'
        ),

      lastModified,

      changeFrequency:
        'monthly',

      priority:
        0.8,
    },


    /* ═══════════════════════════════════════
       BLOGUE — FR + EN
    ═══════════════════════════════════════ */

    {
      url:
        frUrl('/blog'),

      lastModified,

      changeFrequency:
        'weekly',

      priority:
        0.8,

      alternates: {
        languages: {
          'fr-CA':
            frUrl('/blog'),

          'en-CA':
            enUrl('/blog'),
        },
      },
    },


    {
      url:
        enUrl('/blog'),

      lastModified,

      changeFrequency:
        'weekly',

      priority:
        0.8,

      alternates: {
        languages: {
          'fr-CA':
            frUrl('/blog'),

          'en-CA':
            enUrl('/blog'),
        },
      },
    },
  ];


  /* ═══════════════════════════════════════
     ARTICLES PUBLIÉS
  ═══════════════════════════════════════ */

  const posts =
    await getPublishedBlogPosts();


  const blogPages: MetadataRoute.Sitemap =
    posts
      .filter(
        (post) =>
          Boolean(post.slug)
      )
      .flatMap(
        (post) => {

          const fr =
            `${SITE_URL}/blog/${post.slug}`;

          const en =
            `${SITE_URL}/blog/${post.slug}?lang=en`;


          const postLastModified =
            post.updatedAt
              ? new Date(
                  post.updatedAt
                )

              : post.publishedAt
                ? new Date(
                    post.publishedAt
                  )

                : lastModified;


          /*
           * On déclare une version EN uniquement
           * si une vraie traduction existe.
           */

          const hasEnglish =
            Boolean(
              post.titleEn?.trim()
            ) &&
            Boolean(
              post.contentEn?.trim()
            );


          /* ───────────────────────────────
             ARTICLE FR
          ─────────────────────────────── */

          const frenchEntry:
            MetadataRoute.Sitemap[number] =
          {
            url:
              fr,

            lastModified:
              postLastModified,

            changeFrequency:
              'monthly',

            priority:
              0.7,

            ...(hasEnglish && {
              alternates: {
                languages: {
                  'fr-CA':
                    fr,

                  'en-CA':
                    en,
                },
              },
            }),
          };


          /*
           * Aucun contenu anglais :
           * on garde uniquement l'entrée FR.
           */

          if (!hasEnglish) {
            return [
              frenchEntry,
            ];
          }


          /* ───────────────────────────────
             ARTICLE EN
          ─────────────────────────────── */

          const englishEntry:
            MetadataRoute.Sitemap[number] =
          {
            url:
              en,

            lastModified:
              postLastModified,

            changeFrequency:
              'monthly',

            priority:
              0.7,

            alternates: {
              languages: {
                'fr-CA':
                  fr,

                'en-CA':
                  en,
              },
            },
          };


          return [
            frenchEntry,
            englishEntry,
          ];
        }
      );


  /* ═══════════════════════════════════════
     RÉSULTAT FINAL
  ═══════════════════════════════════════ */

  return [
    ...staticPages,
    ...blogPages,
  ];
}