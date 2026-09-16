import type { MetadataRoute } from 'next';

const SITE_URL = 'https://getcoro.io';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',

      // getcoro.io est uniquement le site vitrine : toutes ses pages
      // sont publiques. Les routes applicatives (dashboard, projets,
      // configurateur, etc.) vivent sur app.getcoro.io / client.getcoro.io,
      // pas sous ce domaine — rien à disallow ici.
      allow: '/',
    },

    sitemap: `${SITE_URL}/sitemap.xml`,

    host: SITE_URL,
  };
}