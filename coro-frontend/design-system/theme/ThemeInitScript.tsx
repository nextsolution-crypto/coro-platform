import { buildThemeInitScript } from './theme-core';

/**
 * Script anti-flash à placer dans <head> du layout racine (Server Component).
 * Le <html> doit porter suppressHydrationWarning, car le script modifie ses attributs
 * avant l'hydratation (voir docs Next.js : « preventing-flash-before-hydration »).
 */
export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: buildThemeInitScript() }} />;
}
