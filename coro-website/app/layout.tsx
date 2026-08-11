import type { Metadata } from 'next';
import './globals.css';

import ScrollToTop from './components/ScrollToTop';

export const metadata: Metadata = {
  metadataBase: new URL('https://getcoro.io'),

  title: {
    default:
      'CORO — Conformité Opérationnelle et Résilience Organisationnelle',
    template: '%s | CORO',
  },

  description:
    'Plateforme SaaS canadienne de création, gestion et structuration de documents de conformité opérationnelle pour les mesures d’urgence, la sécurité incendie et la continuité des activités.',

  keywords: [
    'CORO',
    'plateforme SaaS',
    'conformité documentaire',
    'conformité opérationnelle',
    'mesures d’urgence',
    'plan de mesures d’urgence',
    'PMU',
    'plan de sécurité incendie',
    'PSI',
    'plan de continuité des activités',
    'PCA',
    'résilience organisationnelle',
    'gestion de crise',
    'Québec',
    'Canada',
  ],

  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },

  openGraph: {
    title:
      'CORO — Conformité Opérationnelle et Résilience Organisationnelle',

    description:
      'La conformité, pensée par des experts du terrain.',

    url: 'https://getcoro.io',

    siteName: 'CORO',

    locale: 'fr_CA',

    type: 'website',
  },

  robots: {
    index: true,
    follow: true,
  },
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

        <ScrollToTop />
      </body>
    </html>
  );
}