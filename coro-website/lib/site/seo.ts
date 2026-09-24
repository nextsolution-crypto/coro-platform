import type { Metadata } from 'next';
import type { Locale } from './locale.ts';
import { localizedHref } from './locale.ts';

export const SITE_URL = 'https://getcoro.io';
export function absoluteUrl(path: string, locale?: Locale): string { return new URL(locale ? localizedHref(path, locale) : path, SITE_URL).toString(); }

export function languageAlternates(path: string, includeEnglish = true) {
  const fr = absoluteUrl(path, 'fr');
  return { canonical: fr, languages: { 'fr-CA': fr, ...(includeEnglish ? { 'en-CA': absoluteUrl(path, 'en') } : {}), 'x-default': fr } };
}

type PageMetadataInput = { path: string; locale: Locale; title: string; description: string; image?: string; indexable?: boolean; hasEnglish?: boolean };
export function buildPageMetadata({ path, locale, title, description, image = '/og-coro.jpg', indexable = true, hasEnglish = true }: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(path, locale); const fr = absoluteUrl(path, 'fr');
  return {
    metadataBase: new URL(SITE_URL), title, description,
    alternates: { canonical, languages: { 'fr-CA': fr, ...(hasEnglish ? { 'en-CA': absoluteUrl(path, 'en') } : {}), 'x-default': fr } },
    openGraph: { type: 'website', locale: locale === 'fr' ? 'fr_CA' : 'en_CA', alternateLocale: [locale === 'fr' ? 'en_CA' : 'fr_CA'], url: canonical, siteName: 'CORO', title, description, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] }, robots: { index: indexable, follow: indexable },
  };
}
