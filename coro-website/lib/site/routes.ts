export type RouteKind = 'historical' | 'technical' | 'dynamic' | 'future';
export type RouteFamily = 'core' | 'platform' | 'resilience' | 'intelligence' | 'solutions' | 'resources' | 'pricing' | 'company' | 'legal' | 'technical';

export type PublicRoute = {
  id: string; path: string; kind: RouteKind; family: RouteFamily; source?: string;
  fr: boolean; en: boolean; indexable: boolean; sitemap: boolean;
  implemented: boolean; protected: boolean; priority?: number;
  changeFrequency?: 'weekly' | 'monthly' | 'yearly';
};

const historical = (route: Omit<PublicRoute, 'kind' | 'implemented' | 'protected'>): PublicRoute => ({
  ...route, kind: 'historical', implemented: true, protected: true,
});

export const publicRoutes = [
  historical({ id: 'home', path: '/', family: 'core', source: 'app/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 1, changeFrequency: 'weekly' }),
  historical({ id: 'about', path: '/about', family: 'company', source: 'app/about/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  historical({ id: 'security', path: '/security', family: 'platform', source: 'app/security/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.7, changeFrequency: 'monthly' }),
  historical({ id: 'privacy', path: '/privacy', family: 'legal', source: 'app/privacy/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.3, changeFrequency: 'yearly' }),
  historical({ id: 'terms', path: '/terms', family: 'legal', source: 'app/terms/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.3, changeFrequency: 'yearly' }),
  historical({ id: 'pricing', path: '/pricing', family: 'pricing', source: 'app/pricing/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'sentinelle', path: '/sentinelle', family: 'resilience', source: 'app/sentinelle/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'sentinelle-population', path: '/sentinelle-population', family: 'solutions', source: 'app/sentinelle-population/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'documents', path: '/gestion-documentaire', family: 'platform', source: 'app/gestion-documentaire/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'projects', path: '/gestion-de-projets', family: 'platform', source: 'app/gestion-de-projets/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'resilience', path: '/resilience-operationnelle', family: 'resilience', source: 'app/resilience-operationnelle/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  historical({ id: 'performance', path: '/performance-objectifs', family: 'platform', source: 'app/performance-objectifs/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  historical({ id: 'client', path: '/portail-client', family: 'platform', source: 'app/portail-client/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  historical({ id: 'referral', path: '/programme-recommandation', family: 'company', source: 'app/programme-recommandation/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.6, changeFrequency: 'monthly' }),
  historical({ id: 'contact', path: '/contact', family: 'company', source: 'app/contact/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.6, changeFrequency: 'monthly' }),
  historical({ id: 'partners', path: '/partners', family: 'company', source: 'app/partners/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.7, changeFrequency: 'monthly' }),
  historical({ id: 'blog', path: '/blog', family: 'resources', source: 'app/blog/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'weekly' }),
  historical({ id: 'guide-pmu', path: '/documents/plan-mesures-urgence-pmu', family: 'resources', source: 'app/documents/plan-mesures-urgence-pmu/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'guide-psi', path: '/documents/plan-securite-incendie-psi', family: 'resources', source: 'app/documents/plan-securite-incendie-psi/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'guide-pca', path: '/documents/plan-continuite-activites-pca', family: 'resources', source: 'app/documents/plan-continuite-activites-pca/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'guide-pgc', path: '/documents/plan-gestion-crise-pgc', family: 'resources', source: 'app/documents/plan-gestion-crise-pgc/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  historical({ id: 'guide-pra', path: '/documents/plan-reprise-activites-pra', family: 'resources', source: 'app/documents/plan-reprise-activites-pra/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  historical({ id: 'guide-pue', path: '/documents/plan-urgence-environnementale-pue', family: 'resources', source: 'app/documents/plan-urgence-environnementale-pue/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  { id: 'blog-post', path: '/blog/[slug]', kind: 'dynamic', family: 'resources', source: 'app/blog/[slug]/page.tsx', fr: true, en: true, indexable: true, sitemap: true, implemented: true, protected: true },
  { id: 'sitemap', path: '/sitemap.xml', kind: 'technical', family: 'technical', source: 'app/sitemap.ts', fr: true, en: false, indexable: false, sitemap: false, implemented: true, protected: true },
  { id: 'robots', path: '/robots.txt', kind: 'technical', family: 'technical', source: 'app/robots.ts', fr: true, en: false, indexable: false, sitemap: false, implemented: true, protected: true },
  { id: 'manifest', path: '/manifest.webmanifest', kind: 'technical', family: 'technical', source: 'app/manifest.ts', fr: true, en: false, indexable: false, sitemap: false, implemented: true, protected: true },
  ...[
    ['platform-overview', '/plateforme', 'platform'], ['coro-platform', '/coro-platform', 'platform'],
    ['resilience-operations', '/resilience-operations', 'resilience'], ['incident', '/coro-incident', 'resilience'],
    ['exercises', '/coro-exercices', 'resilience'], ['ops', '/coro-ops', 'resilience'],
    ['qr-intervention', '/qr-intervention', 'resilience'], ['knowledge', '/coro-knowledge', 'intelligence'],
    ['ai', '/coro-ai', 'intelligence'], ['network', '/coro-network', 'intelligence'],
    ['campus', '/coro-campus', 'solutions'], ['multi-site', '/solutions/multi-sites', 'solutions'],
    ['resources', '/ressources', 'resources'], ['guides', '/guides', 'resources'],
    ['compliance-resources', '/conformite-reglementation', 'resources'],
  ].map(([id, path, family]) => ({ id, path, kind: 'future' as const, family: family as RouteFamily, fr: true, en: true, indexable: true, sitemap: false, implemented: false, protected: false })),
] satisfies readonly PublicRoute[];

export const implementedRoutes = publicRoutes.filter((route) => route.implemented);
export const historicalRoutes = publicRoutes.filter((route) => route.kind === 'historical');
export const staticSitemapRoutes = publicRoutes.filter((route) => route.implemented && route.sitemap && route.kind === 'historical');
export function getRoute(id: string): PublicRoute | undefined { return publicRoutes.find((route) => route.id === id); }
