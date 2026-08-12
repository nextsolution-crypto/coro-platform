import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CORO — Portail Client',
    short_name: 'CORO Client',

    description:
      'Portail client CORO pour consulter vos documents de conformité opérationnelle et suivre vos activités.',

    start_url: '/dashboard',

    display: 'standalone',

    background_color: '#F8F9FA',
    theme_color: '#2C3E50',

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
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}