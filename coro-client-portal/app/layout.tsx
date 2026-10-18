import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../design-system/tokens.css';
import '../design-system/primitives.css';
import { ThemeProvider } from '../design-system/theme/ThemeProvider';
import { ThemeInitScript } from '../design-system/theme/ThemeInitScript';

export const metadata: Metadata = {
  title: 'CORO Client — Portail client',

  description:
    'Portail client CORO pour consulter vos documents de conformité opérationnelle et suivre vos activités.',

  manifest: '/manifest.webmanifest',

  icons: {
    icon: [
      {
        url: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],

    apple: [
      {
        url: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CORO Client',
  },

  robots: {
    index: false,
    follow: false,
    nocache: true,

    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2C3E50',
};

import ServiceWorkerRegister from './components/ServiceWorkerRegister';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // data-ui / data-theme : Classique par défaut ; le script anti-flash n'applique Glass que sur les routes re-teintées ET si la bêta
    // de préproduction est activée par le jeton de build (voir design-system/routes/route-registry.ts).
    <html lang="fr" data-ui="legacy" data-theme="light" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body>
        <ThemeProvider>
          <ServiceWorkerRegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}