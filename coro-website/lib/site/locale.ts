export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';

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
