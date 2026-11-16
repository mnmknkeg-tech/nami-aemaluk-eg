/**
 * Canonical URL and route contract shared by Dashboard, Marketplace and the
 * independent Merchant Storefront app.
 */
const DEFAULT_STOREFRONT_ORIGIN = 'https://nami-aemaluk-eg-fib3.vercel.app';
const DEFAULT_LOCAL_STOREFRONT_ORIGIN = 'http://localhost:5180';

function legacyUrlAllowed(): boolean {
  return process.env.NEXT_PUBLIC_MERCHANT_ALLOW_LEGACY_SITE_URL === 'true';
}

function isLegacySiteTemplate(template: string): boolean {
  return /\/site\/\{slug\}(?:\/|$)/i.test(template);
}

export function getMerchantStorefrontUrl(slug: string): string {
  const safeSlug = encodeURIComponent(slug);
  const configuredTemplate = process.env.NEXT_PUBLIC_MERCHANT_SITE_URL_TEMPLATE?.trim();

  if (
    configuredTemplate &&
    configuredTemplate.includes('{slug}') &&
    (legacyUrlAllowed() || !isLegacySiteTemplate(configuredTemplate))
  ) {
    return configuredTemplate.replace(/\{slug\}/g, safeSlug).replace(/\/$/, '');
  }

  const legacyTemplate = process.env.NEXT_PUBLIC_MERCHANT_BASE_URL?.trim();
  if (legacyUrlAllowed() && legacyTemplate?.includes('{slug}')) {
    return legacyTemplate.replace(/\{slug\}/g, safeSlug).replace(/\/$/, '');
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_MERCHANT_STOREFRONT_URL?.trim();
  const fallbackOrigin =
    process.env.NODE_ENV === 'development'
      ? DEFAULT_LOCAL_STOREFRONT_ORIGIN
      : DEFAULT_STOREFRONT_ORIGIN;
  const origin = (configuredOrigin || fallbackOrigin).replace(/\/+$/, '');
  return `${origin}/${safeSlug}`;
}

export function getPublishedSitePath(slug: string, suffix = ''): string {
  const safeSlug = encodeURIComponent(slug);
  const prefix =
    process.env.NEXT_PUBLIC_MERCHANT_STOREFRONT_MODE === 'standalone'
      ? `/${safeSlug}`
      : `/site/${safeSlug}`;
  const normalizedSuffix = suffix
    ? suffix.startsWith('/')
      ? suffix
      : `/${suffix}`
    : '';
  return `${prefix}${normalizedSuffix}`;
}

export function getBookingTrackPath(slug: string): string {
  return process.env.NEXT_PUBLIC_MERCHANT_STOREFRONT_MODE === 'standalone'
    ? `/${encodeURIComponent(slug)}/bookings/track`
    : '/bookings/track';
}

export function getMerchantOrderTrackPath(
  slug: string,
  orderId: string | number,
  fromPath: string
): string {
  const safeOrderId = encodeURIComponent(String(orderId));
  const path =
    process.env.NEXT_PUBLIC_MERCHANT_STOREFRONT_MODE === 'standalone'
      ? `/${encodeURIComponent(slug)}/track/${safeOrderId}`
      : `/track/${safeOrderId}`;
  return `${path}?from=${encodeURIComponent(fromPath)}`;
}
