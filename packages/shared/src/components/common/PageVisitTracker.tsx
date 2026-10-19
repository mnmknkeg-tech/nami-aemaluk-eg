'use client';

import { useEffect, useRef } from 'react';

/**
 * PageVisitTracker — fire-and-forget page-view beacon.
 *
 * Sends one POST to `/api/v1/analytics/visits` per page view so the admin
 * dashboard can report "how many people visited the site and which pages they
 * opened, and from which device". It is intentionally:
 *   - framework-agnostic (the current path arrives as a prop),
 *   - silent on every failure (a tracking error must never break the page),
 *   - deduplicated per path per session (re-renders do not double count).
 *
 * Device type is derived client-side from the viewport/user-agent so the number
 * stays accurate even when a proxy rewrites the User-Agent; the backend
 * re-derives it from the real User-Agent as the source of truth.
 */

export interface PageVisitTrackerProps {
  /** Current route path, e.g. "/offers". */
  path?: string;
  /** Tenant/shop id to attribute the visit to (optional). */
  shopId?: string;
  /** Skip tracking entirely (e.g. inside admin dashboards). */
  disabled?: boolean;
  /** Only track paths starting with one of these prefixes (optional). */
  includePrefixes?: string[];
  /** Never track paths starting with one of these prefixes. */
  excludePrefixes?: string[];
}

const VISITOR_KEY = 'ray_visitor_id';
const API_PATH = '/api/v1/analytics/visits';

function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = String(window.navigator?.userAgent || '').toLowerCase();
  const width = Number(window.innerWidth || 0);

  if (/ipad|tablet|kindle|silk/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua))) {
    return 'tablet';
  }
  // Touch + wide viewport is a tablet even when the UA claims to be a desktop
  // browser (common on iPadOS Safari with "Request Desktop Website").
  if (width >= 768 && width <= 1180 && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1) {
    return 'tablet';
  }
  if (/mobi|iphone|android|windows phone|blackberry|opera mini/.test(ua)) {
    return 'mobile';
  }
  if (width > 0 && width < 768) return 'mobile';
  return 'desktop';
}

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `v_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_KEY, generated);
    return generated;
  } catch {
    return '';
  }
}

function shouldTrack(path: string, includePrefixes?: string[], excludePrefixes?: string[]) {
  if (!path) return false;
  if (excludePrefixes?.some((prefix) => path.startsWith(prefix))) return false;
  if (includePrefixes?.length) return includePrefixes.some((prefix) => path.startsWith(prefix));
  return true;
}

/** Beacon helper usable outside React (e.g. in a route-change listener). */
export function recordPageVisit(pathname: string, shopId?: string) {
  if (typeof window === 'undefined' || !pathname) return;
  try {
    const payload = {
      path: pathname,
      referrer: document.referrer ? document.referrer.slice(0, 1024) : '',
      device_type: detectDeviceType(),
      visitor_id: getVisitorId(),
      ...(shopId ? { shop_id: shopId } : {}),
    };
    const body = JSON.stringify(payload);

    // sendBeacon survives page unloads; fetch(keepalive) is the fallback.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(API_PATH, blob)) return;
    }
    void fetch(API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'include',
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never surface tracking failures to the visitor.
  }
}

export default function PageVisitTracker({
  path,
  shopId,
  disabled = false,
  includePrefixes,
  excludePrefixes,
}: PageVisitTrackerProps) {
  const lastTracked = useRef<string>('');

  useEffect(() => {
    if (disabled) return;
    const current = path || (typeof window !== 'undefined' ? window.location.pathname : '');
    if (!shouldTrack(current, includePrefixes, excludePrefixes)) return;
    if (lastTracked.current === current) return;
    lastTracked.current = current;
    recordPageVisit(current, shopId);
  }, [path, shopId, disabled, includePrefixes, excludePrefixes]);

  return null;
}