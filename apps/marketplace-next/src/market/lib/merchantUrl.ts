import { siteConfig } from '@/lib/config';

/**
 * Merchant URL helpers.
 *
 * Marketplace navigation is always internal and always opens the unified
 * `/shop/:slug` page, regardless of whether the merchant published a site.
 * The published website is opened only by the explicit «الموقع الرسمي» link.
 *
 * The independent Merchant Storefront deployment is selected by
 * NEXT_PUBLIC_MERCHANT_SITE_URL_TEMPLATE. The older URL settings remain as
 * temporary fallbacks while DNS and deployments are migrated.
 */
export function getMerchantSitePath(slug: string): string {
  return `/site/${encodeURIComponent(slug)}`;
}

/**
 * The merchant's PUBLIC site URL — the page-builder link on its own
 * subdomain/custom domain when configured. Used ONLY by the explicit
 * «الموقع الرسمي» button on the unified shop page; regular market
 * navigation uses getMerchantSitePath instead.
 *
 * Resolution priority:
 *
 * 1. `NEXT_PUBLIC_MERCHANT_BASE_URL` env var — a full URL template where
 *    `{slug}` is replaced, e.g. `https://{slug}.mnmknk.com` or
 *    `https://mnmknk.com/site/{slug}`. Use this when wildcard DNS is set
 *    up for true subdomain separation.
 *
 * 2. Auto-detected platform subdomain — if the marketplace runs on a root
 *    domain we know supports wildcard DNS (`mnmknk.com`, `ray.eg`), build
 *    `https://{slug}.{root}` automatically. Lets dev/prod work without env
 *    config when DNS is already wildcarded.
 *
 * 3. Path on the marketplace domain — `{marketplaceUrl}/site/{slug}`.
 */
const ROOT_DOMAINS_WITH_WILDCARD_DNS = new Set(['mnmknk.com', 'ray.eg']);

export function getMerchantExternalUrl(slug: string): string {
  const safeSlug = encodeURIComponent(slug);

  // Preferred independent storefront deployment URL. Keep the older env
  // template as a compatibility fallback during the DNS/deployment cutover.
  const standaloneTemplate = process.env.NEXT_PUBLIC_MERCHANT_SITE_URL_TEMPLATE;
  if (standaloneTemplate && standaloneTemplate.trim()) {
    return standaloneTemplate.replace('{slug}', safeSlug);
  }

  const envTemplate = process.env.NEXT_PUBLIC_MERCHANT_BASE_URL;
  if (envTemplate && envTemplate.trim()) {
    return envTemplate.replace('{slug}', safeSlug);
  }

  // Local dev: localhost doesn't support subdomains well — use the path
  // fallback so merchants open in a new tab on the same origin.
  const marketplaceUrl = siteConfig.url;
  try {
    const u = new URL(marketplaceUrl);
    const host = u.hostname;
    if (ROOT_DOMAINS_WITH_WILDCARD_DNS.has(host) && process.env.NODE_ENV === 'production') {
      // Wildcard subdomain: https://said-pharmacy.mnmknk.com
      return `${u.protocol}//${safeSlug}.${host}`;
    }
  } catch {
    // ignore — fall through
  }

  // Fallback: path on the marketplace domain.
  return `${marketplaceUrl.replace(/\/$/, '')}/site/${safeSlug}`;
}

/**
 * Attributes for the explicit external official-site link («الموقع الرسمي»)
 * — the only merchant link allowed to open a new tab, because it is a
 * deliberate "open their real website" action. Regular market navigation
 * never uses these (see getMerchantSitePath).
 */
export const MERCHANT_LINK_TARGET = '_blank' as const;
export const MERCHANT_LINK_REL = 'noopener noreferrer';
