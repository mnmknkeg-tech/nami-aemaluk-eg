/** Offline helpers: cache-first hydration + pending orders queue + idempotency keys. */
import type { PendingOrder } from './types';

/** Read a JSON array from localStorage (never throws). */
export function readCachedList(key: string): any[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readPendingOrders(shopId: string): PendingOrder[] {
  if (!shopId || typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`pos_pending_orders_${shopId}`) || '[]');
    return Array.isArray(parsed)
      ? parsed
          .filter((entry) => entry && typeof entry.id === 'string' && entry.payload)
          .map((entry) => ({ ...entry, requestKey: entry.requestKey || entry.id }))
      : [];
  } catch {
    return [];
  }
}

export function writePendingOrders(shopId: string, list: PendingOrder[]) {
  if (!shopId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`pos_pending_orders_${shopId}`, JSON.stringify(list));
  } catch {}
}

export function enqueuePendingOrder(
  shopId: string,
  payload: any,
  requestKey: string,
  requestStorageKey?: string
): PendingOrder {
  const entry: PendingOrder = {
    id: `pend_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    createdAt: Date.now(),
    payload,
    requestKey,
    requestStorageKey,
  };
  writePendingOrders(shopId, [...readPendingOrders(shopId), entry]);
  return entry;
}

export async function getPosOrderRequestKey(
  shopId: string,
  payload: Record<string, unknown>
): Promise<{ key: string; storageKey: string }> {
  if (!crypto.subtle || !crypto.randomUUID) {
    throw new Error('المتصفح لا يدعم حماية إعادة إرسال الطلب. حدّث المتصفح ثم حاول مرة أخرى.');
  }
  const serialized = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest('SHA-256', serialized);
  const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  const storageKey = `pos-order-request:${shopId}:${fingerprint}`;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) return { key: saved, storageKey };
    const key = crypto.randomUUID();
    window.localStorage.setItem(storageKey, key);
    return { key, storageKey };
  } catch {
    throw new Error('تعذر حفظ معرّف الطلب بأمان. تحقق من مساحة التخزين ثم حاول مرة أخرى.');
  }
}

export function clearPosOrderRequestKey(storageKey?: string) {
  if (!storageKey) return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Could not clear the completed POS idempotency key', error);
  }
}

/**
 * Network-type failure only (fetch TypeError / no response at all) — NOT a
 * 4xx business error (those arrive as { status, message }).
 */
export function isNetworkError(err: any): boolean {
  if (!err) return false;
  if (typeof err.status === 'number') return false;
  if (err instanceof TypeError) return true;
  const name = String(err?.name || '');
  if (name === 'TypeError' || name === 'AbortError') return true;
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('fetch failed') ||
    msg.includes('internet connection')
  );
}
