/**
 * TARGET publication status (frozen MIG-00A architecture). It is NOT implementation (`implemented`) and NOT V2 migration
 * (lib/site/v2-migration.ts): a route can be PUBLISH-NOW and not exist yet, or exist and not be approved for discovery.
 * HIDDEN routes (e.g. the Design Lab) are intentionally absent from this registry.
 */
export type PublicationStatus = 'PUBLISH-NOW' | 'BUILD-NOW-HIDDEN' | 'FUTURE' | 'HIDDEN' | 'LEGACY-PRESERVE' | 'REVIEW';

/** Statuses approved for public discovery. A route is only listed once it is also implemented and sitemap-enabled. */
export const discoverablePublication: readonly PublicationStatus[] = ['PUBLISH-NOW', 'LEGACY-PRESERVE'];

export type RouteKind = 'historical' | 'technical' | 'dynamic' | 'future';
export type RouteFamily = 'core' | 'platform' | 'resilience' | 'intelligence' | 'solutions' | 'resources' | 'pricing' | 'company' | 'legal' | 'technical';

export type PublicRoute = {
  id: string; path: string; kind: RouteKind; publication: PublicationStatus; family: RouteFamily; source?: string;
  fr: boolean; en: boolean; indexable: boolean; sitemap: boolean;
  implemented: boolean; protected: boolean; priority?: number;
  changeFrequency?: 'weekly' | 'monthly' | 'yearly';
};

const historical = (route: Omit<PublicRoute, 'kind' | 'implemented' | 'protected'>): PublicRoute => ({
  ...route, kind: 'historical', implemented: true, protected: true,
});

export const publicRoutes = [
  historical({ id: 'home', publication: 'PUBLISH-NOW', path: '/', family: 'core', source: 'app/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 1, changeFrequency: 'weekly' }),
  historical({ id: 'about', publication: 'PUBLISH-NOW', path: '/about', family: 'company', source: 'app/about/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  historical({ id: 'security', publication: 'PUBLISH-NOW', path: '/security', family: 'platform', source: 'app/security/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.7, changeFrequency: 'monthly' }),
  historical({ id: 'privacy', publication: 'LEGACY-PRESERVE', path: '/privacy', family: 'legal', source: 'app/privacy/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.3, changeFrequency: 'yearly' }),
  historical({ id: 'terms', publication: 'LEGACY-PRESERVE', path: '/terms', family: 'legal', source: 'app/terms/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.3, changeFrequency: 'yearly' }),
  historical({ id: 'pricing', publication: 'PUBLISH-NOW', path: '/pricing', family: 'pricing', source: 'app/pricing/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'sentinelle', publication: 'PUBLISH-NOW', path: '/sentinelle', family: 'resilience', source: 'app/sentinelle/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'sentinelle-population', publication: 'PUBLISH-NOW', path: '/sentinelle-population', family: 'solutions', source: 'app/sentinelle-population/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'incident', publication: 'PUBLISH-NOW', path: '/coro-incident', family: 'resilience', source: 'app/coro-incident/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  historical({ id: 'documents', publication: 'PUBLISH-NOW', path: '/gestion-documentaire', family: 'platform', source: 'app/gestion-documentaire/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'projects', publication: 'PUBLISH-NOW', path: '/gestion-de-projets', family: 'platform', source: 'app/gestion-de-projets/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'resilience', publication: 'PUBLISH-NOW', path: '/resilience-operationnelle', family: 'resilience', source: 'app/resilience-operationnelle/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  historical({ id: 'performance', publication: 'PUBLISH-NOW', path: '/performance-objectifs', family: 'platform', source: 'app/performance-objectifs/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  historical({ id: 'client', publication: 'PUBLISH-NOW', path: '/portail-client', family: 'platform', source: 'app/portail-client/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  historical({ id: 'referral', publication: 'PUBLISH-NOW', path: '/programme-recommandation', family: 'company', source: 'app/programme-recommandation/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.6, changeFrequency: 'monthly' }),
  historical({ id: 'contact', publication: 'PUBLISH-NOW', path: '/contact', family: 'company', source: 'app/contact/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.6, changeFrequency: 'monthly' }),
  historical({ id: 'partners', publication: 'PUBLISH-NOW', path: '/partners', family: 'company', source: 'app/partners/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.7, changeFrequency: 'monthly' }),
  historical({ id: 'blog', publication: 'LEGACY-PRESERVE', path: '/blog', family: 'resources', source: 'app/blog/page.tsx', fr: true, en: true, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'weekly' }),
  historical({ id: 'guide-pmu', publication: 'PUBLISH-NOW', path: '/documents/plan-mesures-urgence-pmu', family: 'resources', source: 'app/documents/plan-mesures-urgence-pmu/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'guide-psi', publication: 'PUBLISH-NOW', path: '/documents/plan-securite-incendie-psi', family: 'resources', source: 'app/documents/plan-securite-incendie-psi/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'guide-pca', publication: 'PUBLISH-NOW', path: '/documents/plan-continuite-activites-pca', family: 'resources', source: 'app/documents/plan-continuite-activites-pca/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.9, changeFrequency: 'monthly' }),
  historical({ id: 'guide-pgc', publication: 'PUBLISH-NOW', path: '/documents/plan-gestion-crise-pgc', family: 'resources', source: 'app/documents/plan-gestion-crise-pgc/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  historical({ id: 'guide-pra', publication: 'PUBLISH-NOW', path: '/documents/plan-reprise-activites-pra', family: 'resources', source: 'app/documents/plan-reprise-activites-pra/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  historical({ id: 'guide-pue', publication: 'PUBLISH-NOW', path: '/documents/plan-urgence-environnementale-pue', family: 'resources', source: 'app/documents/plan-urgence-environnementale-pue/page.tsx', fr: true, en: false, indexable: true, sitemap: true, priority: 0.8, changeFrequency: 'monthly' }),
  { id: 'blog-post', publication: 'LEGACY-PRESERVE', path: '/blog/[slug]', kind: 'dynamic', family: 'resources', source: 'app/blog/[slug]/page.tsx', fr: true, en: true, indexable: true, sitemap: true, implemented: true, protected: true },
  { id: 'sitemap', publication: 'LEGACY-PRESERVE', path: '/sitemap.xml', kind: 'technical', family: 'technical', source: 'app/sitemap.ts', fr: true, en: false, indexable: false, sitemap: false, implemented: true, protected: true },
  { id: 'robots', publication: 'LEGACY-PRESERVE', path: '/robots.txt', kind: 'technical', family: 'technical', source: 'app/robots.ts', fr: true, en: false, indexable: false, sitemap: false, implemented: true, protected: true },
  { id: 'manifest', publication: 'LEGACY-PRESERVE', path: '/manifest.webmanifest', kind: 'technical', family: 'technical', source: 'app/manifest.ts', fr: true, en: false, indexable: false, sitemap: false, implemented: true, protected: true },
  // Registered but not implemented. Target publication status only; none is discoverable until it exists AND is sitemap-enabled.
  // English availability is false: no English content exists for an unbuilt route.
  ...([
    ['platform-overview', '/plateforme', 'platform', 'BUILD-NOW-HIDDEN'], ['coro-platform', '/coro-platform', 'platform', 'FUTURE'],
    ['resilience-operations', '/resilience-operations', 'resilience', 'FUTURE'],
    ['exercises', '/coro-exercices', 'resilience', 'REVIEW'], ['ops', '/coro-ops', 'resilience', 'FUTURE'],
    ['qr-intervention', '/qr-intervention', 'resilience', 'FUTURE'], ['knowledge', '/coro-knowledge', 'intelligence', 'FUTURE'],
    ['ai', '/coro-ai', 'intelligence', 'FUTURE'], ['network', '/coro-network', 'intelligence', 'FUTURE'],
    ['campus', '/coro-campus', 'solutions', 'FUTURE'], ['multi-site', '/solutions/multi-sites', 'solutions', 'FUTURE'],
    ['resources', '/ressources', 'resources', 'FUTURE'], ['guides', '/guides', 'resources', 'PUBLISH-NOW'],
    ['compliance-resources', '/conformite-reglementation', 'resources', 'REVIEW'],
  ] as const).map(([id, path, family, publication]) => ({ id, path, kind: 'future' as const, family: family as RouteFamily, publication: publication as PublicationStatus, fr: true, en: false, indexable: true, sitemap: false, implemented: false, protected: false })),
] satisfies readonly PublicRoute[];

export const implementedRoutes = publicRoutes.filter((route) => route.implemented);
export const historicalRoutes = publicRoutes.filter((route) => route.kind === 'historical');
/** Static discovery: implemented AND sitemap-enabled AND approved for discovery. Target status alone never adds a route. */
export const staticSitemapRoutes = publicRoutes.filter((route) => route.implemented && route.sitemap && route.kind === 'historical' && discoverablePublication.includes(route.publication));
export function getRoute(id: string): PublicRoute | undefined { return publicRoutes.find((route) => route.id === id); }
