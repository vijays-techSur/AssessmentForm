import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',   // Required for Docker multi-stage build
  // SPA-first: no static exports needed; keep App Router
  reactStrictMode: true,

  // Bind to all interfaces so the container is reachable from host
  // Start command: next start -H 0.0.0.0 -p 3000 (see package.json scripts)

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // CRITICAL: Do NOT set X-Frame-Options: DENY — Pivota Preview embeds the app in an iframe
          // Set SAMEORIGIN to allow controlled embedding while blocking cross-origin framing
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
