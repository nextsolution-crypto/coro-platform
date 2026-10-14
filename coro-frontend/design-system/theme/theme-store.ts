/**
 * Store externe du thème (client uniquement), consommé via useSyncExternalStore.
 * Source de vérité : localStorage + matchMedia. Les attributs data-ui / data-theme
 * sur <html> en sont le reflet.
 */
import {
  DARK_MEDIA_QUERY,
  DEFAULT_THEME_PREFERENCE,
  DEFAULT_UI_GENERATION,
  THEME_STORAGE_KEY,
  UI_STORAGE_KEY,
  parseThemePreference,
  parseUiGeneration,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
  type UiGeneration,
} from './theme-core';

export interface ThemeSnapshot {
  readonly preference: ThemePreference;
  readonly resolvedTheme: ResolvedTheme;
  readonly ui: UiGeneration;
}

/** Valeur rendue côté serveur ET pendant l'hydratation : jamais de divergence. */
export const SERVER_THEME_SNAPSHOT: ThemeSnapshot = Object.freeze({
  preference: DEFAULT_THEME_PREFERENCE,
  resolvedTheme: 'light',
  ui: DEFAULT_UI_GENERATION,
});

const listeners = new Set<() => void>();
let current: ThemeSnapshot = SERVER_THEME_SNAPSHOT;
let initialized = false;
let detach: (() => void) | null = null;

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

function compute(overrides?: Partial<Pick<ThemeSnapshot, 'preference' | 'ui'>>): ThemeSnapshot {
  const preference = overrides?.preference ?? parseThemePreference(readStorage(THEME_STORAGE_KEY));
  const ui = overrides?.ui ?? parseUiGeneration(readStorage(UI_STORAGE_KEY));
  return { preference, ui, resolvedTheme: resolveTheme(preference, systemPrefersDark()) };
}

function same(a: ThemeSnapshot, b: ThemeSnapshot): boolean {
  return a.preference === b.preference && a.resolvedTheme === b.resolvedTheme && a.ui === b.ui;
}

export function applyToDocument(snapshot: ThemeSnapshot): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (root.getAttribute('data-ui') !== snapshot.ui) root.setAttribute('data-ui', snapshot.ui);
  if (root.getAttribute('data-theme') !== snapshot.resolvedTheme) root.setAttribute('data-theme', snapshot.resolvedTheme);
}

function refresh(): void {
  const next = compute();
  const changed = !same(current, next);
  if (changed) current = next;
  applyToDocument(current);
  if (changed) listeners.forEach((listener) => listener());
}

/** Réapplique l'état réel (storage + système) au DOM — utilisé après un remontage Strict Mode. */
export function reapplyCurrentTheme(): void {
  if (typeof window === 'undefined') return;
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
    if (event.key === null || event.key === THEME_STORAGE_KEY || event.key === UI_STORAGE_KEY) refresh();
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
}
