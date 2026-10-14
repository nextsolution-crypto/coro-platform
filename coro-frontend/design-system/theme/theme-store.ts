/**
 * Store externe du thème (client uniquement), consommé via useSyncExternalStore.
 * Source de vérité : localStorage + matchMedia + route active. Les attributs data-ui / data-theme
 * sur <html> en sont le reflet.
 *
 * Deux notions distinctes :
 *  - `ui`          : PRÉFÉRENCE de l'utilisateur ('legacy' | 'glass'), mémorisée sur l'appareil ;
 *  - `effectiveUi` : rendu RÉELLEMENT appliqué à la route active. Une préférence 'glass' ne donne du Glass
 *                    que sur les routes qui ont un shell (voir routes/route-registry) ; ailleurs le
 *                    document reste entièrement Legacy.
 * Tant qu'aucune route n'est connue (tests, hors Next.js), effectiveUi = ui : comportement historique.
 */
import {
  DARK_MEDIA_QUERY,
  DEFAULT_THEME_PREFERENCE,
  DEFAULT_UI_GENERATION,
  GLASS_BETA_STORAGE_KEY,
  THEME_STORAGE_KEY,
  UI_STORAGE_KEY,
  parseThemePreference,
  parseUiGeneration,
  resolveBetaEnabled,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
  type UiGeneration,
} from './theme-core';
import { resolveRoute } from '../routes/route-matcher';
import type { RouteMode } from '../routes/route-matcher';

export interface ThemeSnapshot {
  readonly preference: ThemePreference;
  readonly resolvedTheme: ResolvedTheme;
  /** Préférence utilisateur. */
  readonly ui: UiGeneration;
  /** Rendu effectif sur la route active. */
  readonly effectiveUi: UiGeneration;
  /** Mode de rendu de la route active (voir route-matcher). */
  readonly routeMode: RouteMode;
}

/** Valeur rendue côté serveur ET pendant l'hydratation : jamais de divergence. */
export const SERVER_THEME_SNAPSHOT: ThemeSnapshot = Object.freeze({
  preference: DEFAULT_THEME_PREFERENCE,
  resolvedTheme: 'light',
  ui: DEFAULT_UI_GENERATION,
  effectiveUi: DEFAULT_UI_GENERATION,
  routeMode: 'legacy',
});

const listeners = new Set<() => void>();
let current: ThemeSnapshot = SERVER_THEME_SNAPSHOT;
let initialized = false;
let detach: (() => void) | null = null;
/** Route active ; null tant qu'elle n'est pas connue (aucun filtrage par route). */
let activePath: string | null = null;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible (navigation privée, quota) : le changement reste actif pour la session.
  }
}

function systemPrefersDark(): boolean {
  try {
    return !!window.matchMedia?.(DARK_MEDIA_QUERY).matches;
  } catch {
    return false;
  }
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Activation explicite des routes 'beta' (règles dans theme-core.resolveBetaEnabled) : désactivée par défaut,
 * jamais pilotée par le stockage local en production. Sans activation, une route bêta reste en îlot Legacy.
 */
export function isBetaEnabled(): boolean {
  return resolveBetaEnabled({
    production: IS_PRODUCTION,
    envValue: process.env.NEXT_PUBLIC_GLASS_BETA,
    storageValue: IS_PRODUCTION ? null : readStorage(GLASS_BETA_STORAGE_KEY),
  });
}

function compute(overrides?: Partial<Pick<ThemeSnapshot, 'preference' | 'ui'>>): ThemeSnapshot {
  const preference = overrides?.preference ?? parseThemePreference(readStorage(THEME_STORAGE_KEY));
  const ui = overrides?.ui ?? parseUiGeneration(readStorage(UI_STORAGE_KEY));
  if (activePath === null && typeof window !== 'undefined' && window.location) activePath = window.location.pathname;
  const routeMode: RouteMode = activePath === null
    ? (ui === 'glass' ? 'glass' : 'legacy')
    : resolveRoute(activePath, { betaEnabled: isBetaEnabled(), production: IS_PRODUCTION }).mode;
  const effectiveUi: UiGeneration = ui === 'glass' && routeMode !== 'legacy' ? 'glass' : 'legacy';
  return { preference, ui, effectiveUi, routeMode, resolvedTheme: resolveTheme(preference, systemPrefersDark()) };
}

function same(a: ThemeSnapshot, b: ThemeSnapshot): boolean {
  return a.preference === b.preference && a.resolvedTheme === b.resolvedTheme && a.ui === b.ui
    && a.effectiveUi === b.effectiveUi && a.routeMode === b.routeMode;
}

export function applyToDocument(snapshot: ThemeSnapshot): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (root.getAttribute('data-ui') !== snapshot.effectiveUi) root.setAttribute('data-ui', snapshot.effectiveUi);
  if (root.getAttribute('data-theme') !== snapshot.resolvedTheme) root.setAttribute('data-theme', snapshot.resolvedTheme);
}

function refresh(): void {
  const next = compute();
  const changed = !same(current, next);
  if (changed) current = next;
  applyToDocument(current);
  if (changed) listeners.forEach((listener) => listener());
}

/** Réapplique l'état réel (storage + système + route) au DOM — utilisé après un remontage Strict Mode. */
export function reapplyCurrentTheme(): void {
  if (typeof window === 'undefined') return;
  refresh();
}

/** Informe le store de la route active (appelé par ThemeProvider à chaque navigation). */
export function setActivePathname(pathname: string): void {
  if (typeof window === 'undefined') return;
  if (activePath === pathname) return;
  activePath = pathname;
  refresh();
}

export function getServerSnapshot(): ThemeSnapshot {
  return SERVER_THEME_SNAPSHOT;
}

export function getSnapshot(): ThemeSnapshot {
  if (typeof window === 'undefined') return SERVER_THEME_SNAPSHOT;
  if (!initialized) {
    current = compute();
    initialized = true;
  }
  return current;
}

function attach(): () => void {
  const media = (() => {
    try {
      return window.matchMedia?.(DARK_MEDIA_QUERY) ?? null;
    } catch {
      return null;
    }
  })();
  const onStorage = (event: StorageEvent) => {
    // key === null : localStorage.clear() dans un autre onglet.
    if (event.key === null || event.key === THEME_STORAGE_KEY || event.key === UI_STORAGE_KEY || event.key === GLASS_BETA_STORAGE_KEY) refresh();
  };
  const onMedia = () => refresh();
  window.addEventListener('storage', onStorage);
  media?.addEventListener?.('change', onMedia);
  return () => {
    window.removeEventListener('storage', onStorage);
    media?.removeEventListener?.('change', onMedia);
  };
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) detach = attach();
  // Rattrape tout changement survenu entre le rendu et l'abonnement.
  refresh();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && detach) {
      detach();
      detach = null;
    }
  };
}

export function setThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return;
  const safe = parseThemePreference(preference);
  writeStorage(THEME_STORAGE_KEY, safe);
  const next = compute({ preference: safe });
  if (!same(current, next)) {
    current = next;
    initialized = true;
    listeners.forEach((listener) => listener());
  }
  applyToDocument(current);
}

export function setUiGeneration(ui: UiGeneration): void {
  if (typeof window === 'undefined') return;
  const safe = parseUiGeneration(ui);
  writeStorage(UI_STORAGE_KEY, safe);
  const next = compute({ ui: safe });
  if (!same(current, next)) {
    current = next;
    initialized = true;
    listeners.forEach((listener) => listener());
  }
  applyToDocument(current);
}

/** Réservé aux tests : remet le module dans son état initial. */
export function __resetThemeStoreForTests(): void {
  listeners.clear();
  detach?.();
  detach = null;
  current = SERVER_THEME_SNAPSHOT;
  initialized = false;
  activePath = null;
}
