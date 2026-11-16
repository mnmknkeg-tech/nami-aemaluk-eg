import { NextRequest, NextResponse } from 'next/server';
import { resolveLegacyMerchantPath } from './lib/legacy-site-route';

export const config = {
  matcher: ['/((?!api/|_next/|.*\\.[^/]+$).*)']
};

const ROOT_DOMAINS = new Set(
  (process.env.NEXT_PUBLIC_MERCHANT_ROOT_DOMAINS || 'mnmknk.com,ray.eg')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

export default function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = (request.headers.get('host') || '').toLowerCase().replace(/:\d+$/, '');
  const rootDomain = [...ROOT_DOMAINS].find((domain) => host.endsWith('.' + domain));

  let tenantSlug: string | null = null;
  if (rootDomain) {
    const candidate = host.slice(0, -(rootDomain.length + 1)).split('.')[0];
    if (candidate && candidate !== 'www' && !candidate.includes('.')) {
      tenantSlug = candidate;
    }
  }

  // Shared renderer components still emit /site/:slug links. Redirect those
  // links to the standalone route on Vercel domains, and to the tenant root
  // path on verified platform subdomains.
  const legacyPath = resolveLegacyMerchantPath(url.pathname, tenantSlug);
  if (legacyPath === null) return new NextResponse('Not Found', { status: 404 });
  if (typeof legacyPath === 'string') {
    url.pathname = legacyPath;
    return NextResponse.redirect(url, 308);
  }

  // Root domains are not merchant tenants. Custom domains still require an
  // explicit verified domain-to-shop resolver; never guess a shop from a host.
  if (!tenantSlug) return NextResponse.next();

  // Prevent accidental double-prefixing when the tenant slug is already present.
  if (url.pathname === '/' + tenantSlug || url.pathname.startsWith('/' + tenantSlug + '/')) {
    return NextResponse.next();
  }

  url.pathname = '/' + tenantSlug + (url.pathname === '/' ? '' : url.pathname);
  return NextResponse.rewrite(url);
}
