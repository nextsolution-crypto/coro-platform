import type { MetadataRoute } from 'next';
import { staticSitemapRoutes } from '@/lib/site/routes';
import { buildBlogSitemapEntries, buildStaticSitemapEntries, fetchPublishedBlogPosts } from '@/lib/site/sitemap';

// The route registry (lib/site/routes.ts) is the only source of static routes: nothing is listed here by hand.
// Publication status, implementation and English availability decide what is discoverable (see lib/site/sitemap.ts).
const lastModified = new Date('2026-08-18');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = buildStaticSitemapEntries(staticSitemapRoutes, lastModified);
  // Fail-soft: if the blog API is unavailable, the static routes are still returned and a warning is logged.
  const { posts } = await fetchPublishedBlogPosts();
  return [...staticPages, ...buildBlogSitemapEntries(posts, lastModified)];
}
