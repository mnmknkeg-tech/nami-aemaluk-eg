import { siteConfig } from '@/lib/config';

/**
 * In-app path to a merchant's PUBLISHED site — what market navigation uses.
 *
 * Navigation policy (merchant-site/marketplace decoupling — 2026-11, rev. 2
 * after merchant feedback: «بيفتح الموقع الخارجي في تاب جديد — مش زي ما
 * شرحت»):
 *
 * Entering a merchant's store from INSIDE the marketplace app must behave
 * like normal in-app navigation — SAME tab, same window, and the browser
 * back button returns to the marketplace. Market surfaces never open
 * external subdomain URLs or new tabs for merchant sites:
 *
 *   1. Shop cards (dalil, home feed, suggestions) — published →
 *      getMerchantSitePath() (same tab); not published → /shop/[slug].
 *   2. Search results — same rule.
 *   3. The product page's shop links — same rule.
 *   4. Map markers — same rule.
 *
 * The merchant's real PUBLIC url (getMerchantExternalUrl below — the
 * page-builder link on its own subdomain/custom domain when configured) is
 * still the link the merchant markets independently. Inside the marketplace
 * app it is reachable ONLY through the explicit «الموقع الرسمي» button on
 * the unified shop page — a user-intended external action in a new tab.
 * Regular navigation never forces the customer out of the app window.
 *
 * Cart separation is untouched: the merchant site (via /site/[slug], its own
 * domain, or the embedded /shop/[slug]?view=site direct-URL fallback) runs
 * on the merchant SITE cart (merchant-site-cart:site:{slug}) with checkout
 * at /site/{slug}/checkout — never the marketplace cart. The unified theme
 * at /shop/[slug] stays on the marketplace cart (سلة الماركت لكل متجر).
 *
 * The marketplace stays at its own root domain; merchant sites live at
 * /site/[slug] and their own URLs. The two are decoupled at the navigation
 * layer even though they're served by the same Next.js app (the middleware
 * rewrites merchant subdomains/custom domains to /site/[slug] internally
 * without changing the browser URL).
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
