import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CORO — Portail Client',
  description: 'Consultez vos documents de conformité opérationnelle.',

  icons: {
    icon: '/favicon.svg',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}