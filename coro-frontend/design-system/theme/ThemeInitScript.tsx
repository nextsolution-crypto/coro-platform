import { buildThemeInitScript } from './theme-core';
import { shellTable } from '../routes/route-matcher';

/**
 * Script anti-flash à placer dans <head> du layout racine (Server Component).
 * Le <html> doit porter suppressHydrationWarning, car le script modifie ses attributs
 * avant l'hydratation (voir docs Next.js : « preventing-flash-before-hydration »).
 * La table des routes avec shell (registre) est sérialisée dans le script : une route inconnue ou sans shell
 * reste entièrement Legacy dès le premier octet, sans flash.
 */
const SCRIPT = buildThemeInitScript(shellTable({ production: process.env.NODE_ENV === 'production' }));

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
