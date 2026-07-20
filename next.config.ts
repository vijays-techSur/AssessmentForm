import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // SPA-first: no static exports needed; keep App Router
  reactStrictMode: true,

  // Bind to all interfaces so the container is reachable from host
  // Start command: next start -H 0.0.0.0 -p 3000 (see package.json scripts)

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Do NOT set X-Frame-Options: DENY — app must be embeddable in enterprise portals
          // Do NOT set Content-Security-Policy frame-ancestors none
          // Set a permissive X-Frame-Options to allow embedding
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
