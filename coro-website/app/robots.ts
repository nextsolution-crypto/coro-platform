import type { MetadataRoute } from 'next';

const SITE_URL = 'https://getcoro.io';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',

      allow: [
        '/',
        '/about',
        '/security',
        '/privacy',
        '/terms',
      ],

      disallow: [
        '/login',
        '/dashboard',
        '/projects',
        '/clients',
        '/buildings',
        '/activities',
        '/timelog',
        '/capacity',
        '/notifications',
        '/profile',
        '/settings',
        '/admin',
        '/editor',
        '/configurator',
        '/library',
      ],
    },

    sitemap: `${SITE_URL}/sitemap.xml`,

    host: SITE_URL,
  };
}