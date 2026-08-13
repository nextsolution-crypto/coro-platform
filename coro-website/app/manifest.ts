import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CORO — Plateforme de conformité opérationnelle',

    short_name: 'CORO',

    description:
      'Plateforme SaaS canadienne de conformité opérationnelle, de mesures d’urgence, de sécurité incendie et de continuité des activités.',

    start_url: '/',

    display: 'standalone',

    background_color: '#FFFFFF',

    theme_color: '#FFFFFF',

    orientation: 'portrait-primary',

    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}