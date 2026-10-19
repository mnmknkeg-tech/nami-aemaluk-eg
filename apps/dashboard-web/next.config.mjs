/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  transpilePackages: ['@ray-eg/shared'],
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async rewrites() {
    const rawBackendUrl =
      process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    // Strip invisible characters (BOM, zero-width, RTL/LTR marks) that sneak in
    // when the value is copy-pasted from rich-text sources — any of them makes
    // the rewrite destination invalid.
    const backendUrl = rawBackendUrl
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, '')
      .trim()
      .replace(/\r|\n/g, '')
      .replace(/\/+$/, '');
    // Tolerate scheme-less values (e.g. "api2.mnmknk.com") so the rewrite
    // destination always satisfies Vercel's validator.
    const backendOrigin = backendUrl
      ? backendUrl.startsWith('http')
        ? backendUrl
        : `https://${backendUrl}`
      : 'http://localhost:4000';
    return [{ source: '/api/:path*', destination: `${backendOrigin}/api/:path*` }];
  },
  async headers() {
    const headers = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self), payment=()',
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          // 'unsafe-inline' is required for Next.js inline styles/scripts injected at runtime.
          // 'unsafe-eval' only in development (React Refresh); production keeps the strict policy.
          // vercel.live hosts Vercel's preview toolbar script (preview deployments only).
          `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} https://vercel.live`,
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
    ];
    return [{ source: '/(.*)', headers }];
  },
};

export default nextConfig;
