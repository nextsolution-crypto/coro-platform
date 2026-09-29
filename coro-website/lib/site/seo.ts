import type { Metadata } from 'next';
import type { Locale } from './locale.ts';
import { localizedHref, resolveAvailableLocale } from './locale.ts';

export const SITE_URL = 'https://getcoro.io';
export function absoluteUrl(path: string, locale?: Locale): string { return new URL(locale ? localizedHref(path, locale) : path, SITE_URL).toString(); }

/** Content URL of a route: pathname only. Query (?ref, ?category, utm...) and hash are never part of a canonical or an alternate. */
export function contentPath(path: string): string {
  const pathname = new URL(path, SITE_URL).pathname;
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname;
}

export function languageAlternates(path: string, includeEnglish = true) {
  const fr = absoluteUrl(path, 'fr');
  return { canonical: fr, languages: { 'fr-CA': fr, ...(includeEnglish ? { 'en-CA': absoluteUrl(path, 'en') } : {}), 'x-default': fr } };
}

/**
 * Title contract: pass the semantic page title WITHOUT the brand; the root template (`%s | CORO`) appends it.
 * A title that already contains the brand must be passed with `absoluteTitle: true`, otherwise it is double-branded.
 */
export function titleContainsBrand(title: string): boolean { return /\bCORO\b/i.test(title); }

type PageMetadataInput = {
  path: string; locale: Locale; title: string; description: string; image?: string; indexable?: boolean;
  /** True only when a genuine English version exists. False = FR-only route: always FR canonical, no EN alternate. */
  hasEnglish?: boolean;
  /** Use the title as-is (no `| CORO` template). For exceptional titles that already carry the brand. */
  absoluteTitle?: boolean;
  /** Open Graph type. Default `website`; an article page passes `article`. */
  ogType?: 'website' | 'article';
  /** Alternative text of the social image. Optional; when absent the image is emitted as a plain URL, as before. */
  imageAlt?: string;
};

export function buildPageMetadata({ path, locale, title, description, image = '/og-coro.jpg', indexable = true, hasEnglish = true, absoluteTitle = false, ogType = 'website', imageAlt }: PageMetadataInput): Metadata {
  const effective = resolveAvailableLocale(locale, hasEnglish);
  const pathname = contentPath(path);
  const canonical = absoluteUrl(pathname, effective);
  const fr = absoluteUrl(pathname, 'fr');
  const socialImage = imageAlt ? [{ url: image, alt: imageAlt }] : [image];
  return {
    metadataBase: new URL(SITE_URL), title: absoluteTitle ? { absolute: title } : title, description,
    alternates: { canonical, languages: { 'fr-CA': fr, ...(hasEnglish ? { 'en-CA': absoluteUrl(pathname, 'en') } : {}), 'x-default': fr } },
    openGraph: { type: ogType, locale: effective === 'fr' ? 'fr_CA' : 'en_CA', ...(hasEnglish ? { alternateLocale: [effective === 'fr' ? 'en_CA' : 'fr_CA'] } : {}), url: canonical, siteName: 'CORO', title, description, images: socialImage },
    twitter: { card: 'summary_large_image', title, description, images: socialImage }, robots: { index: indexable, follow: indexable },
  };
}
