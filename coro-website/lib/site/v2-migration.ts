/**
 * V2 migration registry.
 *
 * A route belongs here ONLY when its migration is COMPLETE AND APPROVED: migrated against the frozen Design System V1.0,
 * page blueprint applied, content and contracts preserved, QA passed, human approval given.
 * It does NOT mean "already uses some V2 components". Target publication status (PUBLISH-NOW, ...) is a separate concept
 * and lives in the route registry, not here.
 *
 * Exact paths only (no prefix matching). Dynamic routes such as /blog/[slug] cannot be represented here — see
 * `migratedV2DynamicRoutes` below for the explicit, opt-in mechanism that covers them.
 * Migrated so far: /about (MIG-01A pilot) /contact (MIG-01B), /partners (MIG-01C) /programme-recommandation (MIG-01D) /gestion-documentaire (MIG-02A) and /gestion-de-projets (MIG-02B), each added only after QA passed. Every other current route is legacy.
 * /blog (MIG-07A) is the index. /blog/[slug] (dynamic article route, MIG-07B) is registered via `migratedV2DynamicRoutes`,
 * not here, because this array only ever does exact-string matching.
 * / (MIG-08A, Homepage) was the final remaining legacy surface — registered last, after the pre-registry QA gate passed.
 * `normalizePath('/')` returns `'/'` and `Array.includes` is exact-match only, so this cannot over-match any other route.
 */
export const migratedV2Routes: readonly string[] = ['/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client', '/resilience-operationnelle', '/sentinelle', '/sentinelle-population', '/coro-incident', '/security', '/pricing', '/guides', '/documents/plan-mesures-urgence-pmu', '/documents/plan-securite-incendie-psi', '/documents/plan-continuite-activites-pca', '/documents/plan-gestion-crise-pgc', '/documents/plan-reprise-activites-pra', '/documents/plan-urgence-environnementale-pue', '/privacy', '/terms', '/blog', '/'];

/**
 * Explicit, opt-in registry for MIGRATED dynamic routes. `migratedV2Routes` is exact-match only and can never
 * represent a resolved dynamic pathname (e.g. `/blog/my-article`), so a dynamic route is approved here instead,
 * one explicit pattern per migrated dynamic route — never a generic "authorize everything under this prefix" rule.
 * Registering a static parent path in `migratedV2Routes` (e.g. `/blog`) does NOT automatically authorize its
 * children; each dynamic route family must be added here on purpose, after its own migration is approved.
 *
 * `pattern` matches exactly one non-empty path segment after `base + '/'` — no nested segments, no trailing
 * slash, so `/blog/[slug]` (MIG-07B) matches `/blog/my-article` but not `/blog`, `/blog/`, `/blog/a/b`,
 * `/blogfoo` or `/blogger/a`.
 */
export const migratedV2DynamicRoutes: readonly { base: string; pattern: RegExp }[] = [
  { base: '/blog', pattern: /^\/blog\/[^/]+$/ }, // MIG-07B: article reshell approved, pre-registry gate passed.
];

function normalizePath(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] || '/';
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;
}

export function isV2MigratedRoute(pathname: string | null | undefined, routes: readonly string[] = migratedV2Routes, dynamicRoutes: readonly { base: string; pattern: RegExp }[] = migratedV2DynamicRoutes): boolean {
  if (!pathname) return false;
  const path = normalizePath(pathname);
  if (routes.includes(path)) return true;
  return dynamicRoutes.some(({ pattern }) => pattern.test(path));
}

/** The legacy root footer renders on every route that is not migrated (static or dynamic). */
export function isLegacyFooterVisible(pathname: string | null | undefined, routes: readonly string[] = migratedV2Routes, dynamicRoutes: readonly { base: string; pattern: RegExp }[] = migratedV2DynamicRoutes): boolean {
  return !isV2MigratedRoute(pathname, routes, dynamicRoutes);
}
