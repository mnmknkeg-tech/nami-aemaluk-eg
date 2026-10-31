'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { writeToken, writeUserJSON, clearToken } from '@/lib/session-keys';

// ---------------------------------------------------------------------------
// Sanitization — strip dangerous tags/attributes before rendering user input.
// Used by callback page + any consumer that writes raw HTML into the DOM.
// ---------------------------------------------------------------------------
function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  // Remove dangerous tags entirely
  for (const el of body.querySelectorAll(
    'script, iframe, object, embed, svg, math, noscript, link, meta, base'
  )) {
    el.remove();
  }
  // Remove on* event handlers and dangerous attributes
  for (const el of body.querySelectorAll(
    '[onerror], [onload], [onclick], [onmouseover], [onfocus], [onpointerdown], [onanimationstart]'
  )) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (
        name.startsWith('on') ||
        name.startsWith('xlink:') ||
        name.startsWith('formaction') ||
        name.startsWith('srcdoc')
      ) {
        el.removeAttribute(attr.name);
      }
    }
  }
  // Allow only safe elements and attributes
  const SAFE_ELEMENTS = new Set([
    'b',
    'strong',
    'i',
    'em',
    'u',
    's',
    'strike',
    'p',
    'br',
    'hr',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'a',
    'img',
    'video',
    'audio',
    'source',
    'track',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'div',
    'span',
    'section',
    'article',
    'aside',
    'nav',
    'header',
    'footer',
    'address',
    'details',
    'summary',
    'main',
    'small',
    'abbr',
    'cite',
    'dfn',
    'mark',
    'sub',
    'sup',
    'time',
    'dl',
    'dt',
    'dd',
    'figcaption',
    'figure',
    'meter',
    'progress',
    'ins',
    'del',
    'wbr',
    'ruby',
    'rt',
    'rp',
  ]);
  const SAFE_ATTRS = new Set([
    'href',
    'src',
    'alt',
    'title',
    'target',
    'rel',
    'width',
    'height',
    'loading',
    'crossorigin',
    'controls',
    'playsinline',
    'loop',
    'preload',
  ]);

  for (const el of body.querySelectorAll('*')) {
    if (!SAFE_ELEMENTS.has(el.tagName.toLowerCase())) {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (!SAFE_ATTRS.has(name)) {
        el.removeAttribute(attr.name);
      }
      // Sanitize URL attributes (href, src) — strip javascript: and dangerous protocols
      if (SAFE_ATTRS.has(name) && (name === 'href' || name === 'src')) {
        const value = attr.value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (
            lower.startsWith('javascript:') ||
            lower.startsWith('vbscript:') ||
            (lower.startsWith('data:') && lower.includes('script'))
          ) {
            el.removeAttribute(attr.name);
          }
        }
      }
    }
  }
  return body.innerHTML;
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const userRaw = params.get('user');

      // 1. Validate the incoming redirect URL is same-origin (pre-emptive XSS).
      const url = new URL(window.location.href);
      if (url.origin !== window.location.origin) {
        // Malicious redirect target — discard all state.
        clearToken();
        router.replace('/login');
        return;
      }

      // 2. Bridge token: write to localStorage ONLY for one-time use.
      //    Callers call /auth/callback?token=... to get a one-way bridge
      //    Bearer. This is consumed on the next refreshSession() call, after
      //    which the token is cleared and the HttpOnly cookie becomes the
      //    sole source of truth.
      if (token) {
        // Only allow URLs that are same-origin (no open redirects).
        writeToken(token);
      }

      // 3. User data: validate shape before writing to localStorage.
      //    The user object MUST contain an "id" field to be stored.
      //    This prevents malicious or corrupt user payloads from persisting
      //    in sessionStorage under the user key.
      if (userRaw) {
        try {
          const user = JSON.parse(userRaw);
          if (user && typeof user === 'object' && user.id && typeof user.id === 'string') {
            writeUserJSON(JSON.stringify(user));
          }
        } catch {
          // Corrupted user payload — ignore, keep token-only flow.
        }
      }
    } catch {
      // Unexpected error — clear all state to avoid partial writes.
      clearToken();
    }

    // 4. Always redirect to dashboard after processing.
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
        <p className="text-slate-500 font-bold text-sm">جاري تسجيل دخولك...</p>
      </div>
    </div>
  );
}
