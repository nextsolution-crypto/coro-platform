import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
});

import ScrollToTop from './components/ScrollToTop';
import ChatWidget from './components/ChatWidget';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';

export const metadata: Metadata = {
  metadataBase: new URL('https://getcoro.io'),

  title: {
    default:
      'CORO — Plateforme de résilience opérationnelle et mesures d’urgence',
    template: '%s | CORO',
  },

  description:
    'CORO relie la planification, les bâtiments, les incidents, l’intervention et les communications à la population dans une plateforme canadienne de résilience opérationnelle.',

  keywords: [
    'CORO',
    'plateforme SaaS',
    'plateforme SaaS conformité',
    'plateforme mesures urgence',
    'plan de mesures urgence',
    'PMU',
    'sécurité incendie',
    'plan de sécurité incendie',
    'PSI',
    'conformité opérationnelle',
    'conformité documentaire',
    'plan continuité activités',
    'PCA',
    'gestion de crise',
    'résilience organisationnelle',
    'Québec',
    'Canada',
  ],

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

    shortcut: '/favicon.svg',

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
    title: 'CORO',
  },

  openGraph: {
  url: 'https://getcoro.io/',

  title:
    'CORO — Plateforme de résilience opérationnelle et mesures d’urgence',

  description:
    'Reliez la planification, les bâtiments, les incidents, l’intervention et les communications à la population dans une même plateforme.',

  siteName: 'CORO',

  locale: 'fr_CA',

  type: 'website',

  images: [
    {
      url: '/og-coro.jpg',
      width: 1728,
      height: 910,
      alt: 'CORO — Plateforme de résilience opérationnelle reliant planification, intervention et communication à la population',
    },
  ],
},

  twitter: {
    card: 'summary_large_image',

    title:
      'CORO — Plateforme de résilience opérationnelle et mesures d’urgence',

    description:
      'Plateforme canadienne reliant planification d’urgence, bâtiments, incidents, intervention et communication à la population.',

    images: ['/og-coro.jpg'],
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body>
        {children}
        <Footer />
        <CookieBanner />
        <ScrollToTop />
        <ChatWidget />
      </body>
    </html>
  );
}
