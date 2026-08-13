import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CORO Pro — Espace professionnel',

    short_name: 'CORO Pro',

    description:
      'Espace professionnel CORO pour la gestion de la conformité opérationnelle, des projets, des documents et de la performance.',

    start_url: '/dashboard',

    display: 'standalone',

    background_color: '#F8F9FA',

    theme_color: '#C0392B',

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