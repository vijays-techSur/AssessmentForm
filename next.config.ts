import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // SPA-first: no static exports needed; keep App Router
  reactStrictMode: true,

  // Bind to all interfaces so the container is reachable from host
  // Start command: next start -H 0.0.0.0 -p 3000 (see package.json scripts)
  // NOTE: X-Frame-Options intentionally omitted — enterprise dashboard may be embedded in portals
  // DB contract: Do NOT emit X-Frame-Options: DENY or CSP frame-ancestors 'none'/'self'

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // X-Frame-Options intentionally omitted — enterprise embedding required
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
