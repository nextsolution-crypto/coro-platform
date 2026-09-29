export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';

/**
 * The locale actually served and declared to search engines. `requested` comes from ?lang; a route without a genuine
 * English version always resolves to French, so ?lang=en on a FR-only route never yields an English canonical or hreflang.
 */
export function resolveAvailableLocale(requested: Locale, hasEnglish: boolean): Locale { return requested === 'en' && hasEnglish ? 'en' : defaultLocale; }

export function normalizeLocale(value: unknown): Locale { return value === 'en' ? 'en' : defaultLocale; }

export function localeFromSearchParams(searchParams?: URLSearchParams | Record<string, string | string[] | undefined>): Locale {
  if (!searchParams) return defaultLocale;
  const value = searchParams instanceof URLSearchParams ? searchParams.get('lang') : searchParams.lang;
  return normalizeLocale(Array.isArray(value) ? value[0] : value);
}

export function localizedHref(path: string, locale: Locale): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  const url = new URL(path, 'https://getcoro.io');
  if (locale === 'en') url.searchParams.set('lang', 'en'); else url.searchParams.delete('lang');
  return `${url.pathname}${url.search}${url.hash}`;
}

export function switchLocaleHref(path: string, locale: Locale): string { return localizedHref(path, locale === 'fr' ? 'en' : 'fr'); }
