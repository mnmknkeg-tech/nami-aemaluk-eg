import {
  getBookingTrackPath,
  getMerchantOrderTrackPath,
  getMerchantStorefrontUrl,
  getPublishedSitePath,
} from '../packages/shared/src/merchant/siteUrls';
import { resolveLegacyMerchantPath } from '../apps/merchant-storefront/lib/legacy-site-route';

const ENV_KEYS = [
  'NEXT_PUBLIC_MERCHANT_SITE_URL_TEMPLATE',
  'NEXT_PUBLIC_MERCHANT_STOREFRONT_URL',
  'NEXT_PUBLIC_MERCHANT_BASE_URL',
  'NEXT_PUBLIC_MERCHANT_ALLOW_LEGACY_SITE_URL',
  'NEXT_PUBLIC_MERCHANT_STOREFRONT_MODE',
] as const;

describe('merchant storefront URL contract', () => {
  const originalEnv: Record<string, string | undefined> = {};
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key]!;
    }
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('defaults to the independent Vercel storefront, never the Marketplace /site route', () => {
    expect(getMerchantStorefrontUrl('al-islam')).toBe(
      'https://nami-aemaluk-eg-fib3.vercel.app/al-islam'
    );
  });

  it('uses a configured verified tenant template', () => {
    process.env.NEXT_PUBLIC_MERCHANT_SITE_URL_TEMPLATE = 'https://{slug}.mnmknk.com';
    expect(getMerchantStorefrontUrl('al-islam')).toBe('https://al-islam.mnmknk.com');
  });

  it('ignores stale legacy /site templates unless rollback is explicitly enabled', () => {
    process.env.NEXT_PUBLIC_MERCHANT_SITE_URL_TEMPLATE =
      'https://nami-aemaluk-marketplace-eg.vercel.app/site/{slug}';
    process.env.NEXT_PUBLIC_MERCHANT_BASE_URL =
      'https://nami-aemaluk-marketplace-eg.vercel.app/site/{slug}';
    expect(getMerchantStorefrontUrl('al-islam')).toBe(
      'https://nami-aemaluk-eg-fib3.vercel.app/al-islam'
    );

    process.env.NEXT_PUBLIC_MERCHANT_ALLOW_LEGACY_SITE_URL = 'true';
    expect(getMerchantStorefrontUrl('al-islam')).toBe(
      'https://nami-aemaluk-marketplace-eg.vercel.app/site/al-islam'
    );
  });

  it('uses the local standalone app port during development', () => {
    process.env.NODE_ENV = 'development';
    expect(getMerchantStorefrontUrl('al-islam')).toBe('http://localhost:5180/al-islam');
  });

  it('generates deployment-specific home, booking and order tracking paths', () => {
    expect(getPublishedSitePath('al-islam', '/checkout')).toBe('/site/al-islam/checkout');
    expect(getBookingTrackPath('al-islam')).toBe('/bookings/track');
    expect(getMerchantOrderTrackPath('al-islam', 'order-123', '/site/al-islam')).toBe(
      '/track/order-123?from=%2Fsite%2Fal-islam'
    );

    process.env.NEXT_PUBLIC_MERCHANT_STOREFRONT_MODE = 'standalone';
    expect(getPublishedSitePath('al-islam', '/checkout')).toBe('/al-islam/checkout');
    expect(getBookingTrackPath('al-islam')).toBe('/al-islam/bookings/track');
    expect(getMerchantOrderTrackPath('al-islam', 'order-123', '/al-islam')).toBe(
      '/al-islam/track/order-123?from=%2Fal-islam'
    );
  });
});

describe('standalone legacy path compatibility', () => {
  it('redirects old /site URLs to the standalone slug path', () => {
    expect(resolveLegacyMerchantPath('/site/al-islam', null)).toBe('/al-islam');
    expect(resolveLegacyMerchantPath('/site/al-islam/product/42', null)).toBe(
      '/al-islam/product/42'
    );
  });

  it('removes the slug prefix on a matching verified tenant subdomain', () => {
    expect(resolveLegacyMerchantPath('/site/al-islam/checkout', 'al-islam')).toBe('/checkout');
  });

  it('rejects a legacy URL whose slug does not match the tenant subdomain', () => {
    expect(resolveLegacyMerchantPath('/site/other-shop', 'al-islam')).toBeNull();
  });

  it('does not alter unrelated paths', () => {
    expect(resolveLegacyMerchantPath('/al-islam/product/42', null)).toBeUndefined();
  });
});
