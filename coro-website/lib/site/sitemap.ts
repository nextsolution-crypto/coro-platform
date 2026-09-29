import type { PublicRoute } from './routes.ts';
import { discoverablePublication } from './routes.ts';
import type { Locale } from './locale.ts';
import { localizedHref } from './locale.ts';
import { serverApiUrl } from './api.ts';

export type RegisteredSitemapUrl = { path: string; locale: Locale; routeId: string };

export function registeredSitemapUrls(routes: readonly PublicRoute[]): RegisteredSitemapUrl[] {
  return routes
    .filter((route) => route.implemented && route.kind === 'historical' && route.sitemap && discoverablePublication.includes(route.publication))
    .flatMap((route) => [
      { path: localizedHref(route.path, 'fr'), locale: 'fr' as const, routeId: route.id },
      ...(route.en ? [{ path: localizedHref(route.path, 'en'), locale: 'en' as const, routeId: route.id }] : []),
    ]);
}

export const SITEMAP_SITE_URL = 'https://getcoro.io';

export type SitemapEntry = {
  url: string; lastModified: Date; changeFrequency: 'weekly' | 'monthly' | 'yearly'; priority: number;
  alternates?: { languages: Record<string, string> };
};

/** Public URL of a route. The homepage keeps its historical form (no trailing slash); English is the ?lang=en query. No tracking parameter is ever added. */
export function sitemapUrl(path: string, locale: Locale = 'fr'): string {
  const fr = path === '/' ? SITEMAP_SITE_URL : `${SITEMAP_SITE_URL}${path}`;
  return locale === 'en' ? `${fr}?lang=en` : fr;
}

/**
 * Static sitemap entries from the route registry. A route is listed only when it is implemented, sitemap-enabled and approved
 * for discovery (PUBLISH-NOW or LEGACY-PRESERVE). An English entry and the FR/EN alternates exist only when English is genuinely available.
 */
export function buildStaticSitemapEntries(routes: readonly PublicRoute[], lastModified: Date): SitemapEntry[] {
  return routes
    .filter((route) => route.implemented && route.sitemap && route.kind === 'historical' && discoverablePublication.includes(route.publication))
    .flatMap((route) => {
      const fr = sitemapUrl(route.path, 'fr');
      const en = sitemapUrl(route.path, 'en');
      const base = { lastModified, changeFrequency: route.changeFrequency ?? 'monthly', priority: route.priority ?? 0.5 };
      const alternates = { languages: { 'fr-CA': fr, 'en-CA': en } };
      if (!route.en) return [{ url: fr, ...base }];
      return [{ url: fr, ...base, alternates }, { url: en, ...base, alternates }];
    });
}

export type BlogPostSummary = { slug?: string | null; publishedAt?: string | null; updatedAt?: string | null; titleEn?: string | null; contentEn?: string | null };

/** Blog entries from real API data only. English is declared only when a genuine translation (title and content) exists. */
export function buildBlogSitemapEntries(posts: readonly BlogPostSummary[], fallbackLastModified: Date): SitemapEntry[] {
  return posts.filter((post) => Boolean(post.slug)).flatMap((post) => {
    const fr = `${SITEMAP_SITE_URL}/blog/${post.slug}`;
    const en = `${fr}?lang=en`;
    const lastModified = post.updatedAt ? new Date(post.updatedAt) : post.publishedAt ? new Date(post.publishedAt) : fallbackLastModified;
    const hasEnglish = Boolean(post.titleEn?.trim()) && Boolean(post.contentEn?.trim());
    const base = { lastModified, changeFrequency: 'monthly' as const, priority: 0.7 };
    if (!hasEnglish) return [{ url: fr, ...base }];
    const alternates = { languages: { 'fr-CA': fr, 'en-CA': en } };
    return [{ url: fr, ...base, alternates }, { url: en, ...base, alternates }];
  });
}

export type BlogPostsResult = { posts: BlogPostSummary[]; ok: boolean };

/**
 * Fail-soft and observable: any retrieval problem yields no articles (never invented ones), one clear warning with a safe reason
 * (never the internal URL or the raw error), and never throws, so the static sitemap is always returned.
 */
export async function fetchPublishedBlogPosts(fetchImpl: typeof fetch = fetch, warn: (message: string) => void = console.warn): Promise<BlogPostsResult> {
  const fail = (reason: string): BlogPostsResult => {
    warn(`[sitemap] Blog articles could not be retrieved (${reason}). Serving static routes only; article URLs are omitted until the API responds.`);
    return { posts: [], ok: false };
  };
  try {
    const response = await fetchImpl(serverApiUrl('blog/public'), { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) } as RequestInit);
    if (!response.ok) return fail(`HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return fail('unexpected response shape');
    return { posts: data as BlogPostSummary[], ok: true };
  } catch (error) {
    return fail(error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network or parsing error');
  }
}
