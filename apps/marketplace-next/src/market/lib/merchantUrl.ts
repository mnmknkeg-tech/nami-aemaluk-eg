import { siteConfig } from '@/lib/config';

/**
 * The external URL where a merchant's PUBLISHED storefront lives — separate
 * from the marketplace app's chrome.
 *
 * Navigation policy (corrected after the merchant feedback «كلو بيوديني للينك
 * بتاع الموقع المنفصل»): inside the marketplace app the customer ALWAYS
 * navigates in-app to the unified shop view (/shop/[slug], ثيم موحد). The
 * standalone site link is used only by the two deliberate entry points:
 *
 *   1. The merchant's own URL (they market it independently — away from us)
 *   2. Map markers — and ONLY for shops that actually published a website
 *      (websitePublished flag from /map/pins). Shops without a site stay
 *      in-app; opening /site/{slug} for them was a 404 in a new tab.
 *   3. The unified shop page's «الموقع الرسمي» button (hasOfficialSite).
 *
 * The marketplace stays at its own root domain; merchant sites live at
 * their own URLs. The two are decoupled at the navigation layer even
 * though they're served by the same Next.js app (the middleware rewrites
 * merchant subdomains/custom domains to /site/[slug] internally without
 * changing the browser URL).
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
 *    Still opened in a new tab so the merchant navigation is decoupled
 *    from the marketplace's SPA history (back button doesn't tangle), and
 *    AppChrome strips the marketplace header/footer for `/site/*` paths so
 *    the merchant site renders standalone.
 */
const ROOT_DOMAINS_WITH_WILDCARD_DNS = new Set(['mnmknk.com', 'ray.eg']);

export function getMerchantExternalUrl(slug: string): string {
  const safeSlug = encodeURIComponent(slug);

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

  // Fallback: path on the marketplace domain. Still in a new tab.
  return `${marketplaceUrl.replace(/\/$/, '')}/site/${safeSlug}`;
}

/**
 * Whether merchant links from the marketplace open in a new tab. Always
 * true — the whole point of getMerchantExternalUrl is to decouple merchant
 * navigation from the marketplace SPA. Exposed so calling sites can pass
 * the right `<a>` attributes without re-deriving the policy.
 */
export const MERCHANT_LINK_TARGET = '_blank' as const;
export const MERCHANT_LINK_REL = 'noopener noreferrer';
