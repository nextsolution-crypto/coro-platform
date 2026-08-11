import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';

const SITE_URL = 'https://getcoro.io';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'CORO | Plateforme SaaS de conformité et mesures d’urgence',
  description:
    'CORO est une plateforme SaaS canadienne pour créer, structurer et gérer des plans de mesures d’urgence, de sécurité incendie, de continuité des activités et de conformité documentaire.',
  alternates: {
    canonical: '/',
    languages: {
      'fr-CA': '/',
      'en-CA': '/?lang=en',
      'x-default': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_CA',
    alternateLocale: ['en_CA'],
    url: SITE_URL,
    siteName: 'CORO',
    title: 'CORO | Plateforme SaaS de conformité et mesures d’urgence',
    description:
      'Créez, structurez et gérez vos documents de conformité avec une plateforme SaaS conçue pour les professionnels des mesures d’urgence, de la sécurité incendie et de la continuité.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CORO | Plateforme SaaS de conformité et mesures d’urgence',
    description:
      'Plateforme SaaS canadienne pour la création et la gestion de documents de conformité, de mesures d’urgence et de continuité.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function HomePage() {
  return <HomePageClient />;
}