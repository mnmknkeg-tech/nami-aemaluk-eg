/**
 * Maps old shared-renderer /site/:slug links to the standalone /:slug route.
 * undefined = not a legacy URL; null = slug does not match tenant subdomain.
 */
export function resolveLegacyMerchantPath(
  pathname: string,
  tenantSlug: string | null
): string | null | undefined {
  const match = pathname.match(/^\/site\/([^/]+)(\/.*)?$/);
  if (!match) return undefined;

  let requestedSlug = match[1];
  try {
    requestedSlug = decodeURIComponent(requestedSlug);
  } catch {
    return null;
  }

  if (tenantSlug && requestedSlug !== tenantSlug) return null;

  const suffix = match[2] || '';
  return tenantSlug ? suffix || '/' : `/${match[1]}${suffix}`;
}
