import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CORO Client — Portail client',
    short_name: 'CORO Client',
    description:
      'Portail client CORO pour consulter vos documents de conformité opérationnelle et suivre vos activités.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F8F9FA',
    theme_color: '#2C3E50',
    orientation: 'any',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Registre d\'accueil',
        short_name: 'Sentinelle',
        description: 'Accéder au registre d\'occupation',
        url: '/sentinelle',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}