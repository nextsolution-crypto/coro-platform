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
/** Activation de développement des routes 'beta' du registre : clé locale, sans aucun effet en production. */
export const GLASS_BETA_STORAGE_KEY = 'coro-glass-beta';
/**
 * Valeur EXACTE de NEXT_PUBLIC_GLASS_BETA exigée pour activer les routes bêta dans un build de production.
 * Volontairement verbeuse : « 1 », « true » ou une variable héritée d'un autre environnement ne suffisent jamais.
 */
export const GLASS_BETA_PRODUCTION_TOKEN = 'production-preview';

export interface BetaActivationInputs {
  production: boolean;
  /** Valeur de NEXT_PUBLIC_GLASS_BETA au moment du build. */
  envValue?: string | undefined;
  /** Valeur de la clé locale coro-glass-beta. */
  storageValue?: string | null;
}

/**
 * Les routes 'beta' ne rendent du Glass que si cette fonction répond vrai.
 *  - Production : désactivé par défaut ; seul le jeton exact GLASS_BETA_PRODUCTION_TOKEN dans l'environnement de build l'active.
 *    Le stockage local d'un utilisateur ne peut JAMAIS l'activer.
 *  - Développement : clé locale 'on' ou NEXT_PUBLIC_GLASS_BETA='1'.
 */
export function resolveBetaEnabled({ production, envValue, storageValue }: BetaActivationInputs): boolean {
  if (production) return envValue === GLASS_BETA_PRODUCTION_TOKEN;
  return envValue === '1' || storageValue === 'on';
}

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
 * Table [source RegExp, drapeau], de la route la plus spécifique à la moins spécifique (voir route-matcher.shellTable).
 * 1 : shell Glass ; 2 : écran plein écran re-teinté, Glass seulement si la bêta est activée ; 0 : entièrement Legacy.
 */
export type ShellTable = ReadonlyArray<readonly [string, 0 | 1 | 2]>;

export interface ThemeInitOptions {
  /** NEXT_PUBLIC_GLASS_BETA a la valeur exacte du jeton de préproduction dans ce build. */
  betaBuild?: boolean;
  /** Développement uniquement : la clé locale coro-glass-beta = 'on' active aussi la bêta. Jamais en production. */
  storageBeta?: boolean;
}

/**
 * Script anti-flash (ES5, exécuté pendant le parsing HTML, avant le premier rendu).
 * Pose `data-ui` et `data-theme` sur <html>. Reproduit exactement parseThemePreference /
 * parseUiGeneration / resolveTheme — la parité est vérifiée par theme.test.cjs.
 * Tout échec (localStorage bloqué, matchMedia absent) retombe sur legacy + light.
 */
export function buildThemeInitScript(shellTable?: ShellTable, options: ThemeInitOptions = {}): string {
  const betaExpr = (options.betaBuild ? 'true' : 'false') + (options.storageBeta ? '||g(' + JSON.stringify(GLASS_BETA_STORAGE_KEY) + ")==='on'" : '');
  // Sans table (tests, autres applications) : la préférence est appliquée telle quelle.
  // Avec table : une route sans shell Glass (inconnue, plein écran, authentification) reste entièrement Legacy.
  const routeGate = shellTable
    ? 'var t=' + JSON.stringify(shellTable) + ";var q=((window.location&&window.location.pathname)||'/').replace(/\\/+$/,'')||'/';var sh=false;" +
      'var bo=' + betaExpr + ';' +
      'for(var i=0;i<t.length;i++){if(new RegExp(t[i][0]).test(q)){sh=t[i][1]===1||(t[i][1]===2&&bo);break}}' +
      "if(!sh)u='legacy';"
    : '';
  return (
    '(function(){try{' +
    'var d=document.documentElement;' +
    'var g=function(k){try{return window.localStorage.getItem(k)}catch(e){return null}};' +
    'var p=g(' + JSON.stringify(THEME_STORAGE_KEY) + ');' +
    "var u=g(" + JSON.stringify(UI_STORAGE_KEY) + ")==='glass'?'glass':'legacy';" +
    routeGate +
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
