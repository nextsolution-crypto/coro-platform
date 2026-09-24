import type { PublicRoute } from './routes.ts';
import type { Locale } from './locale.ts';
import { localizedHref } from './locale.ts';

export type RegisteredSitemapUrl = { path: string; locale: Locale; routeId: string };

export function registeredSitemapUrls(routes: readonly PublicRoute[]): RegisteredSitemapUrl[] {
  return routes
    .filter((route) => route.implemented && route.kind === 'historical' && route.sitemap)
    .flatMap((route) => [
      { path: localizedHref(route.path, 'fr'), locale: 'fr' as const, routeId: route.id },
      ...(route.en ? [{ path: localizedHref(route.path, 'en'), locale: 'en' as const, routeId: route.id }] : []),
    ]);
}
