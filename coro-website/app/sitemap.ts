import type { MetadataRoute } from 'next';

const SITE_URL = 'https://getcoro.io';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://coro_backend:3002/api';

type BlogPost = {
  slug: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
};

async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API_URL}/blog/public`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error('Sitemap: impossible de récupérer les articles du blogue');
      return [];
    }

    return await res.json();
  } catch (error) {
    console.error('Sitemap: erreur lors de la récupération du blogue', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date('2026-08-13');

  const staticPages: MetadataRoute.Sitemap = [
    // Pages principales
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/security`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },

    // Pages solutions
    {
      url: `${SITE_URL}/gestion-documentaire`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/gestion-de-projets`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/performance-objectifs`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/portail-client`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    // Pages documents
    {
      url: `${SITE_URL}/documents/plan-mesures-urgence-pmu`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/documents/plan-securite-incendie-psi`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/documents/plan-continuite-activites-pca`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/documents/plan-gestion-crise-pgc`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/documents/plan-reprise-activites-pra`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/documents/plan-urgence-environnementale-pue`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    // Blogue
    {
      url: `${SITE_URL}/blog`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Récupération automatique des articles publiés
  const posts = await getPublishedBlogPosts();

  const blogPages: MetadataRoute.Sitemap = posts
    .filter((post) => post.slug)
    .map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt
        ? new Date(post.updatedAt)
        : post.publishedAt
          ? new Date(post.publishedAt)
          : lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

  return [...staticPages, ...blogPages];
}