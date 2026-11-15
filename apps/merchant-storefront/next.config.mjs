const backendUrl = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://nami-aemaluk-eg-production.up.railway.app'
).replace(/\/+$/, '');

const nextConfig = {
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