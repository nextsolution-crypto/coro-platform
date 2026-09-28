/**
 * V2 migration registry.
 *
 * A route belongs here ONLY when its migration is COMPLETE AND APPROVED: migrated against the frozen Design System V1.0,
 * page blueprint applied, content and contracts preserved, QA passed, human approval given.
 * It does NOT mean "already uses some V2 components". Target publication status (PUBLISH-NOW, ...) is a separate concept
 * and lives in the route registry, not here.
 *
 * Exact paths only (no prefix matching). Dynamic routes such as /blog/[slug] are out of scope until they are migrated on purpose.
 * Migrated so far: /about (MIG-01A pilot) /contact (MIG-01B), /partners (MIG-01C) /programme-recommandation (MIG-01D) /gestion-documentaire (MIG-02A) and /gestion-de-projets (MIG-02B), each added only after QA passed. Every other current route is legacy.
 * /blog (MIG-07A) is the index only; /blog/[slug] (dynamic article route) is NOT registered here — exact-string matching
 * cannot match a resolved dynamic pathname, so the article route stays legacy until MIG-07B implements the matching fix.
 */
export const migratedV2Routes: readonly string[] = ['/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client', '/resilience-operationnelle', '/sentinelle', '/sentinelle-population', '/coro-incident', '/security', '/pricing', '/guides', '/documents/plan-mesures-urgence-pmu', '/documents/plan-securite-incendie-psi', '/documents/plan-continuite-activites-pca', '/documents/plan-gestion-crise-pgc', '/documents/plan-reprise-activites-pra', '/documents/plan-urgence-environnementale-pue', '/privacy', '/terms', '/blog'];

function normalizePath(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] || '/';
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;
}

export function isV2MigratedRoute(pathname: string | null | undefined, routes: readonly string[] = migratedV2Routes): boolean {
  if (!pathname) return false;
  return routes.includes(normalizePath(pathname));
}

/** The legacy root footer renders on every route that is not migrated. */
export function isLegacyFooterVisible(pathname: string | null | undefined, routes: readonly string[] = migratedV2Routes): boolean {
  return !isV2MigratedRoute(pathname, routes);
}
