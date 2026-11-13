'use client';

import { isSessionActive, jsonRequest } from './api';

/**
 * Abandoned-cart funnel tracking → backend `cart_events`.
 *
 * The merchant dashboard's "السلة المتروكة" page reads these events, so every
 * add-to-cart / checkout start / completed payment from the marketplace (and
 * builder sites) must land there. All calls are fire-and-forget: tracking
 * must never break or delay the shopping flow itself.
 */

export type CartEventName = 'add_to_cart' | 'checkout_started' | 'payment_completed';

export interface TrackableCartItem {
  shopId?: string | null;
  productId?: string | null;
  quantity?: number | null;
  price?: number | null;
  name?: string | null;
}

const SESSION_KEY = 'mnmknk_cart_session';

/** Stable per-browser session id that ties guest cart events together. */
export function cartSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = window.localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return '';
  }
}

/**
 * Track one funnel event for a batch of cart items (one backend event per
 * item — the dashboard aggregates by shop + session anyway).
 * - add_to_cart / checkout_started: public endpoint works for guests, the
 *   authenticated one additionally attaches the customer's userId.
 * - payment_completed: authenticated endpoint only (checkout is login-gated)
 *   and auto-recovers this session's earlier events server-side.
 */
export function trackCartEvent(event: CartEventName, items: TrackableCartItem[]): void {
  if (typeof window === 'undefined') return;

  const list = (items || [])
    .filter(
      (i) =>
        i &&
        typeof i.shopId === 'string' &&
        i.shopId.trim() !== '' &&
        typeof i.productId === 'string' &&
        i.productId.trim() !== ''
    )
    .slice(0, 12);
  if (list.length === 0) return;

  const authed = isSessionActive();
  // payment_completed must go through the authed endpoint (it carries the
  // userId used for auto-recovery); guests cannot reach checkout anymore.
  const path = authed || event === 'payment_completed' ? '/cart-events/' : '/cart-events/public/track';
  const sessionId = cartSessionId();

  for (const item of list) {
    const body = JSON.stringify({
      shopId: item.shopId,
      productId: item.productId,
      event,
      quantity: Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? item.quantity : 1,
      unitPrice: Number.isFinite(Number(item.price)) ? Number(item.price) : 0,
      currency: 'EGP',
      sessionId,
    });
    void jsonRequest(path, { method: 'POST', body }).catch(() => {});
  }
}

/** Convert marketplace cart items into the trackable shape. */
export function trackableFromCart(
  items: { shopId: string; productId: string; quantity: number; price: number; name?: string }[]
): TrackableCartItem[] {
  return items || [];
}
