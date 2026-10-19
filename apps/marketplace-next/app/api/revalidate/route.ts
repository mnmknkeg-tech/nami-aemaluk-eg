import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Cache invalidation webhook called by the dashboard after a website publish.
 * The public site pages (/site/[slug]) are cached with the `site:<slug>` tag —
 * publishing must invalidate them so visitors see changes immediately instead
 * of waiting for the 120s ISR window.
 *
 * POST { "slug": "my-shop", "secret": "..." }
 */
export async function POST(req: NextRequest) {
  // The secret must be configured in production; the dev fallback only exists
  // so local flows work without env setup. (The dashboard currently sends this
  // from the browser, so treat it as an anti-abuse gate, not a true secret.)
  const devFallback = 'dev-revalidate-secret';
  const secret =
    process.env.REVALIDATE_SECRET || (process.env.NODE_ENV === 'production' ? '' : devFallback);
  if (!secret) {
    console.error('[revalidate] REVALIDATE_SECRET is not configured');
    return NextResponse.json({ success: false, error: 'not_configured' }, { status: 500 });
  }
  let slug = '';
  try {
    const body = await req.json();
    slug = String((body as any)?.slug || '').trim();
    if (String((body as any)?.secret || '') !== secret) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_body' }, { status: 400 });
  }

  if (!slug) {
    return NextResponse.json({ success: false, error: 'slug_required' }, { status: 400 });
  }

  revalidateTag(`site:${slug}`, 'max');
  return NextResponse.json({ success: true, revalidated: `site:${slug}` });
}
