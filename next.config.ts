import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pivota Preview: do NOT set X-Frame-Options: DENY
  // Allow embedding in iframe for Pivota Preview
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Explicitly allow framing (Pivota Preview uses iframe)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
