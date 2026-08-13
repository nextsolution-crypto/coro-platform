import type { MetadataRoute } from 'next';

const SITE_URL = 'https://getcoro.io';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-08-13');

  return [
    // Pages principales
    { url: SITE_URL, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/security`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },

    // Pages solutions
    { url: `${SITE_URL}/gestion-documentaire`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/gestion-de-projets`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/performance-objectifs`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/portail-client`, lastModified, changeFrequency: 'monthly', priority: 0.8 },

    // Pages documents
    { url: `${SITE_URL}/documents/plan-mesures-urgence-pmu`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/documents/plan-securite-incendie-psi`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/documents/plan-continuite-activites-pca`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/documents/plan-gestion-crise-pgc`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/documents/plan-reprise-activites-pra`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/documents/plan-urgence-environnementale-pue`, lastModified, changeFrequency: 'monthly', priority: 0.8 },

    // Blogue
    { url: `${SITE_URL}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
  ];
}