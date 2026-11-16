const backendUrl = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://nami-aemaluk-eg-production.up.railway.app'
).replace(/\/+$/, '');

const configuredSiteTemplate = process.env.NEXT_PUBLIC_MERCHANT_SITE_URL_TEMPLATE?.trim();
const allowLegacySiteUrl = process.env.NEXT_PUBLIC_MERCHANT_ALLOW_LEGACY_SITE_URL === 'true';
const defaultSiteTemplate =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5180/{slug}'
    : 'https://nami-aemaluk-eg-fib3.vercel.app/{slug}';
const merchantSiteTemplate =
  configuredSiteTemplate &&
  configuredSiteTemplate.includes('{slug}') &&
  (allowLegacySiteUrl || !/\/site\/\{slug\}(?:\/|$)/i.test(configuredSiteTemplate))
    ? configuredSiteTemplate
    : defaultSiteTemplate;

const nextConfig = {
  // This app always renders merchant websites at /:slug.
  // Keep this app-specific so Marketplace retains its own /site/:slug route.
  env: {
    NEXT_PUBLIC_MERCHANT_STOREFRONT_MODE: 'standalone',
    NEXT_PUBLIC_MERCHANT_SITE_URL_TEMPLATE: merchantSiteTemplate
  },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  transpilePackages: ['@ray-eg/shared'],
  experimental: { externalDir: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' }
    ]
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: backendUrl + '/api/:path*' }];
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' }
      ]
    }];
  }
};

export default nextConfig;
