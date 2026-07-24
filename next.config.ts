import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // SPA-first: no static exports needed; keep App Router
  reactStrictMode: true,

  // Bind to all interfaces so the container is reachable from host
  // Start command: next dev/start -H 0.0.0.0 -p 3000 (see package.json scripts)

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Do NOT set X-Frame-Options — Pivota Preview embeds this app in an iframe
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
