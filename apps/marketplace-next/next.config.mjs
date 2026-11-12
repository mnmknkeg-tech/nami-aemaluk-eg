function remoteImagePatterns() {
  const sources = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || 'mnmknk.com,api.mnmknk.com,localhost')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  const patterns = sources.flatMap((hostname) => {
    const protocols = hostname === 'localhost' ? ['http'] : ['https'];
    return protocols.map((protocol) => ({ protocol, hostname }));
  });
  // Merchants can embed external image URLs in their builder configs — allow
  // any https host (same posture as dashboard-web/business) so next/image
  // optimization never throws on unknown hosts.
  patterns.push({ protocol: 'https', hostname: '**' });
  return patterns;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  typescript: { ignoreBuildErrors: false },
  productionBrowserSourceMaps: false,
  images: {
    // Image optimization is enabled: AVIF/WebP conversion + responsive sizes.
    // Hosts serving remote images come from NEXT_PUBLIC_IMAGE_HOSTS.
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: remoteImagePatterns(),
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-inline' is required for Next.js inline styles/scripts injected at runtime.
              // 'unsafe-eval' is required in development — React Refresh and the Next.js dev
              // runtime rely on eval(); production keeps the strict policy without it.
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https: ws: wss:",
              "frame-src 'self' https://www.openstreetmap.org https://www.google.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https:",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  async rewrites() {
    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000')
      .trim()
      .replace(/^\uFEFF/, '');
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
