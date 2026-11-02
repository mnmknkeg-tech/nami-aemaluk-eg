import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// The backend scopes the session cookie per app via the X-App-Scope header
// (ray_session-DASHBOARD, ray_session-MARKETPLACE, ...), so this guard matches
// the cookie by prefix. Matching the exact name 'ray_session' never matched in
// production and bounced every authenticated /admin/* visit back to the gate.
const SESSION_COOKIE_PREFIX = 'ray_session';
const KYC_STATUS_COOKIE = 'ray_kyc_status';

function hasSessionCookie(req: NextRequest): boolean {
  return req.cookies
    .getAll()
    .some((cookie) => cookie.name.toLowerCase().startsWith(SESSION_COOKIE_PREFIX));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // KYC guard: redirect non-verified merchants to onboarding
  if (
    !pathname.startsWith('/onboarding') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/admin')
  ) {
    const kycStatus = req.cookies.get(KYC_STATUS_COOKIE)?.value || '';
    if (hasSessionCookie(req) && kycStatus && kycStatus !== 'verified') {
      const url = req.nextUrl.clone();
      url.pathname = '/onboarding/kyc';
      return NextResponse.redirect(url);
    }
  }

  // Only guard admin area (excluding the gate page itself and static/next internals)
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }
  if (pathname === '/admin/gate' || pathname.startsWith('/admin/gate/')) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/gate';
    url.search = `?returnTo=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/onboarding/:path*'],
};
