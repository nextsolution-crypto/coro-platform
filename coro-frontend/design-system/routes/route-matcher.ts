import { ROUTE_REGISTRY } from './route-registry';
import type { RouteEntry } from './route-registry';

/**
 * Résolution d'une URL vers le mode de rendu Glass. Fonctions pures (sans React, sans DOM) :
 * réutilisables dans le script anti-flash, les tests et le portail client.
 *
 * Modes :
 *  - 'glass'  : contenu Glass (route 'ga', ou 'beta' avec activation de développement)
 *  - 'island' : shell Glass + contenu Legacy enveloppé dans un îlot clair
 *  - 'bare'   : shell Glass + contenu Legacy NON enveloppé (island: false)
 *  - 'legacy' : document entièrement Legacy (route inconnue ou sans shell)
 */
export type RouteMode = 'glass' | 'island' | 'bare' | 'legacy';

export interface RouteResolution {
  entry: RouteEntry | null;
  mode: RouteMode;
}

/** Retire requête, ancre et barre finale ('/projects/?a=1' → '/projects'). */
export function normalizePathname(input: string): string {
  const base = (input || '/').split('#')[0].split('?')[0];
  if (base.length > 1 && base.endsWith('/')) return base.replace(/\/+$/, '') || '/';
  return base || '/';
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|\\]/g, '\\$&');

/** Source de RegExp ancrée pour un motif Next ('[id]' → un segment, '[...slug]' → le reste). */
export function patternToSource(pattern: string): string {
  if (pattern === '/') return '^/$';
  const parts = pattern.split('/').slice(1).map((segment) => {
    if (/^\[\.\.\..+\]$/.test(segment)) return '.+';
    if (/^\[.+\]$/.test(segment)) return '[^/]+';
    return escapeRegExp(segment);
  });
  return '^/' + parts.join('/') + '$';
}

const dynamicCount = (pattern: string) => pattern.split('/').filter((s) => /^\[.+\]$/.test(s)).length;

interface Compiled { entry: RouteEntry; re: RegExp; dynamic: number; depth: number }

function compile(entries: readonly RouteEntry[]): Compiled[] {
  return entries.map((entry) => ({
    entry,
    re: new RegExp(patternToSource(entry.pattern)),
    dynamic: dynamicCount(entry.pattern),
    depth: entry.pattern.split('/').length,
  }));
}

const COMPILED = compile(ROUTE_REGISTRY);

/** Entrée la plus spécifique (statique avant dynamique, comme Next.js) ; null si inconnue. */
export function findRouteEntry(pathname: string, entries?: readonly RouteEntry[]): RouteEntry | null {
  const path = normalizePathname(pathname);
  const list = entries ? compile(entries) : COMPILED;
  const hits = list.filter((c) => c.re.test(path));
  if (hits.length === 0) return null;
  hits.sort((a, b) => a.dynamic - b.dynamic || b.depth - a.depth);
  return hits[0].entry;
}

export interface ResolveOptions {
  /** Activation explicite de développement des routes 'beta'. */
  betaEnabled?: boolean;
  /** Environnement de production : les routes devOnly n'existent pas. */
  production?: boolean;
  entries?: readonly RouteEntry[];
}

export function resolveRoute(pathname: string, options: ResolveOptions = {}): RouteResolution {
  const entry = findRouteEntry(pathname, options.entries);
  if (!entry) return { entry: null, mode: 'legacy' };
  if (entry.devOnly && options.production) return { entry: null, mode: 'legacy' };
  if (entry.shell !== 'app') return { entry, mode: 'legacy' };
  if (entry.status === 'ga') return { entry, mode: 'glass' };
  if (entry.status === 'beta' && options.betaEnabled) return { entry, mode: 'glass' };
  return { entry, mode: entry.island === false ? 'bare' : 'island' };
}

/** Le shell Glass est-il actif sur cette route ? (tout mode sauf 'legacy') */
export function isShellRoute(pathname: string, options: ResolveOptions = {}): boolean {
  return resolveRoute(pathname, options).mode !== 'legacy';
}

/**
 * Table [source RegExp, shell 1|0] ordonnée de la plus spécifique à la moins spécifique : le premier motif
 * qui correspond décide. Consommée par le script anti-flash (ES5, sans import) ; reproduit findRouteEntry.
 */
export function shellTable(options: { production?: boolean; entries?: readonly RouteEntry[] } = {}): Array<[string, 0 | 1]> {
  return compile((options.entries ?? ROUTE_REGISTRY).filter((e) => !(e.devOnly && options.production)))
    .sort((a, b) => a.dynamic - b.dynamic || b.depth - a.depth)
    .map((c): [string, 0 | 1] => [patternToSource(c.entry.pattern), c.entry.shell === 'app' ? 1 : 0]);
}
