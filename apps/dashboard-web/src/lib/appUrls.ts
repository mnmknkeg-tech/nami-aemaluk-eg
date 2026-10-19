/**
 * Cross-app URLs for the merchant dashboard.
 *
 * The "create a merchant account" CTA lives in the business app, which is
 * deployed on its own origin — a hard-coded domain silently rots when the
 * deployment moves, so resolve it from the environment with a live default.
 */

/** Strips paste artifacts (BOM, zero-width, RTL marks), newlines and trailing slashes. */
function sanitizeUrl(raw: string | undefined, fallback: string): string {
  const cleaned = (raw || '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, '')
    .replace(/[\r\n]/g, '')
    .trim()
    .replace(/\/+$/, '');
  return cleaned || fallback;
}

const IS_DEV = process.env.NODE_ENV === 'development';

/** Business (merchant acquisition) app origin. */
export const BUSINESS_URL = sanitizeUrl(
  process.env.NEXT_PUBLIC_BUSINESS_URL,
  IS_DEV ? 'http://localhost:1000' : 'https://business-blond-psi.vercel.app'
);

/** Merchant signup page on the business app. */
export const BUSINESS_SIGNUP_URL = `${BUSINESS_URL}/signup`;
