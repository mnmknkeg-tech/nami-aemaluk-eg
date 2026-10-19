'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/auth';
import { readUserJSON } from '@/lib/session-keys';

export type BellNotification = {
  id: string;
  title?: string;
  content?: string;
  body?: string;
  message?: string;
  type?: string;
  priority?: string;
  read?: boolean;
  is_read?: boolean;
  created_at?: string;
  createdAt?: string;
  shop_id?: string | null;
  user_id?: string | null;
  metadata?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

export type OrderBellEvent = {
  id: string;
  source: 'pos' | 'website';
  title: string;
  body: string;
};

const POLL_MS = 30_000;
const SOUND_ENABLED_KEY = 'ray_sound_enabled';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(SOUND_ENABLED_KEY) !== 'off';
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'on' : 'off');
}

function normalize(n: any): BellNotification {
  return {
    id: String(n?.id ?? ''),
    title: n?.title,
    content: n?.content ?? n?.body ?? n?.message,
    type: n?.type,
    priority: n?.priority,
    read: n?.read ?? n?.is_read ?? false,
    created_at: n?.created_at ?? n?.createdAt ?? n?.sent_at,
    shop_id: n?.shop_id ?? null,
    user_id: n?.user_id ?? null,
    metadata: n?.metadata ?? n?.meta ?? {},
  };
}

function orderSourceOf(n: BellNotification): 'pos' | 'website' {
  const src = String(n.metadata?.order_source ?? n.metadata?.source ?? '').toLowerCase();
  if (src === 'pos') return 'pos';
  return 'website';
}

function currentShopId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const u = JSON.parse(readUserJSON() || '{}');
    return u?.shopId || u?.shop_id || '';
  } catch {
    return '';
  }
}

/**
 * Polls both /notifications/me and /notifications/shop/:shopId (merchants
 * receive order notifications on the shop channel, personal ones on the user
 * channel), dedupes them, and fires the right bell when a NEW_ORDER arrives.
 * - website order  → رنة الموقع
 * - pos order      → رنة نقطة البيع
 */
export function useOrderBell(onOrder?: (evt: OrderBellEvent) => void) {
  const [notifications, setNotifications] = useState<BellNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const lastSeenTs = useRef<number>(Date.now());
  const firstLoad = useRef(true);
  const onOrderRef = useRef(onOrder);
  onOrderRef.current = onOrder;

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const shopId = currentShopId();

      const [userRes, shopRes] = await Promise.allSettled([
        apiRequest('/notifications/me?limit=30'),
        shopId ? apiRequest(`/notifications/shop/${shopId}?limit=30`) : Promise.resolve(null),
      ]);

      const pick = (v: any) =>
        Array.isArray(v) ? v : v?.data || v?.notifications || v?.items || [];

      const merged: BellNotification[] = [];
      const seen = new Set<string>();
      for (const res of [userRes, shopRes]) {
        if (res.status !== 'fulfilled') continue;
        for (const raw of pick(res.value)) {
          const n = normalize(raw);
          if (!n.id || seen.has(n.id)) continue;
          seen.add(n.id);
          merged.push(n);
        }
      }
      // newest first
      merged.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setNotifications(merged);

      // unread from the authoritative counter endpoint, fallback to list
      let count = merged.filter((n) => !n.read).length;
      try {
        let cntVal: any = null;
        if (shopId) {
          const s = await apiRequest(`/notifications/shop/${shopId}/unread-count`);
          cntVal = s;
        }
        if (cntVal == null) {
          cntVal = await apiRequest('/notifications/me/unread-count');
        }
        const c = Number(cntVal?.unread_count ?? cntVal?.UnreadCount ?? cntVal ?? 0);
        if (!Number.isNaN(c) && c > 0) count = c;
      } catch {}
      setUnreadCount(count);

      // detect new order notifications created after our last checkpoint
      if (!firstLoad.current) {
        for (const n of merged) {
          const ts = n.created_at ? new Date(n.created_at).getTime() : 0;
          if (!ts || ts <= lastSeenTs.current) continue;
          if ((n.type || '').toUpperCase() !== 'NEW_ORDER') continue;
          onOrderRef.current?.({
            id: n.id,
            source: orderSourceOf(n),
            title: n.title || 'طلب جديد',
            body: n.content || '',
          });
        }
      }
      firstLoad.current = false;
      lastSeenTs.current = Date.now();
    } catch {
      // silent — polling shouldn't spam errors
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Self-rescheduling timer instead of a blind setInterval: hidden tabs
    // skip the tick entirely (and don't drift), while returning to the
    // foreground triggers an immediate fetch on a fresh schedule.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(async () => {
        timer = null;
        if (typeof document === 'undefined' || !document.hidden) {
          await fetchNotifications();
        }
        schedule();
      }, POLL_MS);
    };
    schedule();

    const onVisible = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      schedule(); // reset the cadence for the new foreground period
      fetchNotifications();
    };
    document.addEventListener('visibilitychange', onVisible);

    // Listen to real-time website orders placed locally or via broadcast
    const onWebsiteOrder = (e: Event) => {
      const order = (e as CustomEvent).detail;
      if (!order) return;
      const orderId = order.id || `ORD-${Date.now()}`;
      const customerName = order.customer?.name || 'عميل المتجر';
      const totalAmount = order.total || 0;
      const title = `طلب موقع جديد ${order.orderNumber || ''}`;
      const body = `طلب بقيمة ${totalAmount} ج.م من ${customerName}`;

      onOrderRef.current?.({
        id: orderId,
        source: 'website',
        title,
        body,
      });

      // Also prepend to live notifications list
      setNotifications((prev) => [
        {
          id: orderId,
          title,
          content: body,
          type: 'NEW_ORDER',
          read: false,
          created_at: new Date().toISOString(),
          metadata: { order_source: 'website', order_id: orderId, total: totalAmount },
        },
        ...prev,
      ]);
      setUnreadCount((c) => c + 1);
    };
    window.addEventListener('ray_new_website_order', onWebsiteOrder);

    return () => {
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('ray_new_website_order', onWebsiteOrder);
    };
  }, [fetchNotifications]);

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      setSoundEnabled(!prev);
      return !prev;
    });
  }, []);

  const markAllRead = useCallback(async () => {
    const shopId = currentShopId();
    // notifications live on both channels — clear the shop one first (orders
    // arrive there), then the user one. One of them may 404; that's fine.
    const results = await Promise.allSettled([
      shopId
        ? apiRequest(`/notifications/shop/${shopId}/read`, { method: 'PATCH' })
        : Promise.resolve(null),
      apiRequest('/notifications/me/read', { method: 'PATCH' }),
    ]);
    if (results.every((r) => r.status === 'rejected')) {
      throw new Error('فشل تعليم الإشعارات كمقروءة');
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      const n = notifications.find((x) => x.id === id);
      const path =
        n?.shop_id && currentShopId()
          ? `/notifications/shop/${currentShopId()}/${id}/read`
          : `/notifications/me/${id}/read`;
      await apiRequest(path, { method: 'PATCH' });
      setNotifications((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    },
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    soundOn,
    toggleSound,
    refresh: fetchNotifications,
    markAllRead,
    markRead,
  };
}
