import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
];

// Les routes d'outillage de développement (fichiers `page.dev.tsx`, p. ex. /glass-kit) n'existent QUE hors production :
// dans un build de production, l'extension `dev.tsx` n'est pas reconnue, donc la page n'est ni routée, ni compilée,
// ni présente dans le manifeste des routes (voir design-system/tools/production-check.cjs).
const pageExtensions = process.env.NODE_ENV === 'production'
  ? ['tsx', 'ts', 'jsx', 'js']
  : ['tsx', 'ts', 'jsx', 'js', 'dev.tsx'];

const nextConfig: NextConfig = {
  output: 'standalone',
  pageExtensions,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;