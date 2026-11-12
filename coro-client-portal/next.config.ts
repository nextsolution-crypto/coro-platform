import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  async headers() {
    const sensitiveLinkHeaders = [
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Cache-Control', value: 'no-store' },
    ];
    return [
      { source: '/reset-password', headers: sensitiveLinkHeaders },
      { source: '/magic', headers: sensitiveLinkHeaders },
      {
        source: '/d/:path*',
        headers: [
          ...sensitiveLinkHeaders,
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; connect-src 'self' https://api.getcoro.io http://localhost:3002; img-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
