import { buildThemeInitScript, resolveBetaEnabled } from './theme-core';
import { shellTable } from '../routes/route-matcher';

/**
 * Script anti-flash à placer dans <head> du layout racine (Server Component).
 * Le <html> doit porter suppressHydrationWarning, car le script modifie ses attributs
 * avant l'hydratation (voir docs Next.js : « preventing-flash-before-hydration »).
 * La table des routes avec shell (registre) est sérialisée dans le script : une route inconnue ou sans shell
 * reste entièrement Legacy dès le premier octet, sans flash. Les écrans plein écran re-teintés (drapeau 2) ne passent
 * en Glass que si la bêta est activée (jeton de build en production ; clé locale en développement seulement).
 */
const PRODUCTION = process.env.NODE_ENV === 'production';
const SCRIPT = buildThemeInitScript(shellTable({ production: PRODUCTION }), {
  betaBuild: resolveBetaEnabled({ production: PRODUCTION, envValue: process.env.NEXT_PUBLIC_GLASS_BETA, storageValue: null }),
  storageBeta: !PRODUCTION,
});

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
