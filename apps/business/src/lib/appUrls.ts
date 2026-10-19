/**
 * Cross-app URLs for the merchant acquisition app (business).
 *
 * This app hands a brand-new merchant over to the dashboard after signup or
 * login, so a wrong value here drops them on a dead origin — the old
 * `|| 'http://localhost:3000'` fallback did exactly that in production.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_DASHBOARD_URL when the deployment defines it;
 *   2. localhost while running `next dev`, so local work still targets the
 *      locally running dashboard;
 *   3. the live production dashboard deployment.
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

/** Live dashboard-web deployment reachable from the browser. */
export const DASHBOARD_URL = sanitizeUrl(
  process.env.NEXT_PUBLIC_DASHBOARD_URL,
  IS_DEV ? 'http://localhost:3000' : 'https://dashboard-web-three-kappa.vercel.app'
);

/** Dashboard route that owns the merchant workspace. */
export const DASHBOARD_APP_PATH = '/dashboard';

/**
 * Builds the dashboard login URL. The merchant now signs in ON the
 * dashboard's own origin so both auth cookies (ray_access + ray_session)
 * are stamped on the correct domain from the first moment — no token ever
 * travels through a query string.
 */
export function dashboardLoginUrl(params: {
  returnTo?: string | null;
  followShopId?: string | null;
}): string {
  const q = new URLSearchParams();
  const returnTo = (params.returnTo || '').trim();
  const followShopId = (params.followShopId || '').trim();
  if (returnTo) q.set('returnTo', returnTo);
  if (followShopId) q.set('followShopId', followShopId);
  const qs = q.toString();
  return `${DASHBOARD_URL}/login${qs ? `?${qs}` : ''}`;
}
