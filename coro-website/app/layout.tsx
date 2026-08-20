import type { Metadata, Viewport } from 'next';
import './globals.css';

import ScrollToTop from './components/ScrollToTop';
import ChatWidget from './components/ChatWidget';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';

export const metadata: Metadata = {
  metadataBase: new URL('https://getcoro.io'),

  title: {
    default:
      'CORO — Plateforme SaaS de conformité opérationnelle et mesures d’urgence',
    template: '%s | CORO',
  },

  description:
    'CORO est une plateforme SaaS canadienne pour créer, structurer et gérer les plans de mesures d’urgence, plans de sécurité incendie, plans de continuité et documents de conformité opérationnelle.',

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
    title:
      'CORO — Plateforme SaaS de conformité opérationnelle et mesures d’urgence',

    description:
      'Créez et gérez vos PMU, PSI, PCA et autres documents de conformité avec une plateforme conçue pour les professionnels du terrain.',

    siteName: 'CORO',

    locale: 'fr_CA',

    type: 'website',

    images: [
      {
        url: '/og-coro.jpg',
        width: 1200,
        height: 630,
        alt: 'CORO — Plateforme SaaS de conformité opérationnelle',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',

    title:
      'CORO — Plateforme SaaS de conformité opérationnelle et mesures d’urgence',

    description:
      'Plateforme SaaS canadienne pour la création et la gestion des PMU, PSI, PCA et documents de conformité opérationnelle.',

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
    <html lang="fr">
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