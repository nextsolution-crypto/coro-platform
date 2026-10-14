/**
 * CORO Liquid Glass — logique de thème pure (sans React, sans DOM).
 *
 * Deux axes INDÉPENDANTS :
 *  - génération d'interface (`ui`)   : 'legacy' (défaut) | 'glass'
 *  - préférence de thème (`preference`) : 'LIGHT' | 'DARK' | 'SYSTEM'
 *
 * Aucune dépendance : ce fichier est réutilisable tel quel dans coro-client-portal.
 */

export const THEME_PREFERENCES = ['LIGHT', 'DARK', 'SYSTEM'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export type ResolvedTheme = 'light' | 'dark';
export type UiGeneration = 'legacy' | 'glass';

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'SYSTEM';
export const DEFAULT_UI_GENERATION: UiGeneration = 'legacy';

export const THEME_STORAGE_KEY = 'coro-theme-preference';
export const UI_STORAGE_KEY = 'coro-ui-generation';

export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/** Valeur inconnue, absente ou corrompue → SYSTEM. */
export function parseThemePreference(raw: unknown): ThemePreference {
  return raw === 'LIGHT' || raw === 'DARK' || raw === 'SYSTEM' ? raw : DEFAULT_THEME_PREFERENCE;
}

/** Seule la valeur exacte 'glass' active le nouveau design ; tout le reste = legacy. */
export function parseUiGeneration(raw: unknown): UiGeneration {
  return raw === 'glass' ? 'glass' : DEFAULT_UI_GENERATION;
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'DARK') return 'dark';
  if (preference === 'LIGHT') return 'light';
  return systemPrefersDark ? 'dark' : 'light';
}

/**
 * Script anti-flash (ES5, exécuté pendant le parsing HTML, avant le premier rendu).
 * Pose `data-ui` et `data-theme` sur <html>. Reproduit exactement parseThemePreference /
 * parseUiGeneration / resolveTheme — la parité est vérifiée par theme.test.cjs.
 * Tout échec (localStorage bloqué, matchMedia absent) retombe sur legacy + light.
 */
export function buildThemeInitScript(): string {
  return (
    '(function(){try{' +
    'var d=document.documentElement;' +
    'var g=function(k){try{return window.localStorage.getItem(k)}catch(e){return null}};' +
    'var p=g(' + JSON.stringify(THEME_STORAGE_KEY) + ');' +
    "var u=g(" + JSON.stringify(UI_STORAGE_KEY) + ")==='glass'?'glass':'legacy';" +
    'var s=false;' +
    'try{s=!!(window.matchMedia&&window.matchMedia(' + JSON.stringify(DARK_MEDIA_QUERY) + ').matches)}catch(e){}' +
    "var dark=p==='DARK'||(p!=='LIGHT'&&s);" +
    "d.setAttribute('data-ui',u);" +
    "d.setAttribute('data-theme',dark?'dark':'light');" +
    // Repli : si React n'a pas révélé la page au bout de 2 s (erreur JS), on l'affiche quand même.
    "if(u==='glass'){try{window.setTimeout(function(){d.setAttribute('data-ui-ready','')},2000)}catch(e){}}" +
    '}catch(e){}})()'
  );
}
