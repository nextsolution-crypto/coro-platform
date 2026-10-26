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
    ];
  },
};

export default nextConfig;
