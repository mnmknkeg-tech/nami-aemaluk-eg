import { NextRequest, NextResponse } from 'next/server';

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
  const rootDomain = [...ROOT_DOMAINS].find((domain) => host.endsWith(\`.\${domain}\`));

  // Root domains are not merchant tenants. Custom domains require an explicit
  // verified domain-to-shop resolver and are intentionally not guessed here.
  if (!rootDomain) return NextResponse.next();

  const tenantSlug = host.slice(0, -(rootDomain.length + 1)).split('.')[0];
  if (!tenantSlug || tenantSlug === 'www' || tenantSlug.includes('.')) {
    return NextResponse.next();
  }

  // Compatibility with the old /site/:slug URLs emitted by the shared
  // published-site renderer. Only rewrite when the URL slug matches the
  // tenant resolved from the platform subdomain.
  const legacySitePath = url.pathname.match(/^\\/site\\/([^/]+)(.*)$/);
  if (legacySitePath) {
    if (legacySitePath[1] !== tenantSlug) return NextResponse.next();
    url.pathname = \`/\${tenantSlug}\${legacySitePath[2] || ''}\`;
    return NextResponse.rewrite(url);
  }

  // Prevent accidental double-prefixing when a tenant slug is already present.
  if (url.pathname === \`/\${tenantSlug}\` || url.pathname.startsWith(\`/\${tenantSlug}/\`)) {
    return NextResponse.next();
  }

  url.pathname = \`/\${tenantSlug}\${url.pathname === '/' ? '' : url.pathname}\`;
  return NextResponse.rewrite(url);
}