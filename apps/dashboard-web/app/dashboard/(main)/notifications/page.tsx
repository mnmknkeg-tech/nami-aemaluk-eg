'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  BellOff,
  ShoppingBag,
  Store,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertTriangle,
  Info,
  Trash2,
  Search,
  X,
  Gift,
  CalendarDays,
} from 'lucide-react';
import { readUserJSON } from '@/lib/session-keys';
import { useOrderBell } from '@/hooks/useOrderBell';
import { apiRequest } from '@/lib/auth';

type TabKey = 'all' | 'orders' | 'unread';

type Notif = {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  read: boolean;
  created_at: string;
  shop_id: string | null;
  source: 'pos' | 'website' | null;
};

const LOCALE = 'ar-EG-u-nu-latn';

function normalizeNotif(n: any): Notif {
  const type = (n?.type || '').toUpperCase();
  let source: 'pos' | 'website' | null = null;
  if (type === 'NEW_ORDER') {
    const src = n?.metadata?.order_source || n?.meta?.order_source;
    source = src === 'pos' ? 'pos' : 'website';
  }
  return {
    id: String(n?.id ?? ''),
    title: n?.title || 'إشعار',
    content: n?.content ?? n?.body ?? (n?.message || ''),
    type,
    priority: n?.priority || 'MEDIUM',
    read: Boolean(n?.read ?? n?.is_read),
    created_at: n?.created_at ?? n?.createdAt ?? (n?.sent_at || ''),
    shop_id: n?.shop_id ?? null,
    source,
  };
}

function priorityStyle(p: string) {
  switch (p.toUpperCase()) {
    case 'URGENT':
      return { badge: 'bg-red-50 text-red-700 border-red-100', label: 'عاجل' };
    case 'HIGH':
      return { badge: 'bg-orange-50 text-orange-700 border-orange-100', label: 'مهم' };
    case 'MEDIUM':
      return { badge: 'bg-slate-50 text-slate-600 border-slate-100', label: 'عادي' };
    default:
      return { badge: 'bg-slate-50 text-slate-500 border-slate-100', label: 'منخفض' };
  }
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  if (m < 1440) return `منذ ${Math.floor(m / 60)} ساعة`;
  const d = Math.floor(m / 1440);
  const dayWord = d === 1 ? 'يوم' : d === 2 ? 'يومين' : d <= 10 ? 'أيام' : 'يومًا';
  return `منذ ${d} ${dayWord}`;
}

function iconFor(n: Notif) {
  if (n.source === 'pos')
    return { el: <Store size={15} />, cls: 'bg-amber-50 text-amber-600 border-amber-100' };
  if (n.source === 'website')
    return { el: <ShoppingBag size={15} />, cls: 'bg-cyan-50 text-cyan-700 border-cyan-100' };
  if (n.type === 'NEW_BOOKING' || n.type === 'BOOKING_STATUS') {
    return {
      el: <CalendarDays size={15} />,
      cls: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    };
  }
  if (n.type === 'PROMOTION')
    return { el: <Gift size={15} />, cls: 'bg-violet-50 text-violet-600 border-violet-100' };
  if (n.priority === 'URGENT' || n.priority === 'HIGH')
    return {
      el: <AlertTriangle size={15} />,
      cls: 'bg-orange-50 text-orange-600 border-orange-100',
    };
  return { el: <Info size={15} />, cls: 'bg-slate-50 text-slate-500 border-slate-100' };
}

const TYPE_LABELS: Record<string, string> = {
  NEW_ORDER: 'طلب جديد',
  ORDER_STATUS: 'تحديث طلب',
  NEW_BOOKING: 'حجز جديد',
  BOOKING_STATUS: 'تحديث حجز',
  PROMOTION: 'عرض',
  SYSTEM: 'نظام',
};

function currentShopId(): string {
  try {
    const u = JSON.parse(readUserJSON() || '{}');
    return u?.shopId || u?.shop_id || '';
  } catch {
    return '';
  }
}

export default function NotificationsPage() {
  const {
    notifications: rawList,
    unreadCount,
    soundOn,
    toggleSound,
    refresh,
    markAllRead,
    markRead,
  } = useOrderBell();

  const [tab, setTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  useMemo(() => {
    setTimeout(() => setInitialLoading(false), 1200);
  }, []);

  const notifications = useMemo(() => rawList.map(normalizeNotif), [rawList]);

  const filtered = useMemo(() => {
    let list = notifications;
    if (tab === 'orders') list = list.filter((n) => n.source !== null);
    if (tab === 'unread') list = list.filter((n) => !n.read);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
    }
    return list;
  }, [notifications, tab, searchQuery]);

  const ordersCount = useMemo(
    () => notifications.filter((n) => n.source !== null).length,
    [notifications]
  );

  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch {
      /* silent */
    }
  }, [refresh]);

  const handleMarkAll = useCallback(async () => {
    setBusyAll(true);
    try {
      await markAllRead();
    } catch {
      /* both channels failed — surfaced by counts */
    } finally {
      setBusyAll(false);
    }
  }, [markAllRead]);

  const handleDelete = useCallback(
    async (n: Notif) => {
      setDeleting(n.id);
      try {
        // delete on the channel the notification actually lives on
        const path = n.shop_id
          ? `/notifications/shop/${currentShopId()}/${n.id}`
          : `/notifications/me/${n.id}`;
        await apiRequest(path, { method: 'DELETE' });
        await refresh();
      } catch {
        /* silent */
      } finally {
        setDeleting(null);
      }
    },
    [refresh]
  );

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'الكل', count: notifications.length },
    { key: 'orders', label: 'الطلبات', count: ordersCount },
    { key: 'unread', label: 'غير مقروء', count: unreadCount },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-4xl mx-auto">
      {/* ===== Header ===== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">الإشعارات</h1>
          <p className="text-xs text-slate-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'كل الإشعارات مقروءة'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleSound}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
              soundOn
                ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
                : 'border-slate-200 bg-white text-slate-400'
            }`}
            title={soundOn ? 'إيقاف صوت الرنة' : 'تشغيل صوت الرنة'}
          >
            {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{soundOn ? 'رنة الطلبات مفعّلة' : 'رنة الطلبات مغلقة'}</span>
          </button>
          <button
            onClick={handleRefresh}
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={14} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={busyAll}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-lg font-semibold text-xs hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <CheckCheck size={14} />
              تعليم الكل كمقروء
            </button>
          )}
        </div>
      </div>

      {/* ===== Search ===== */}
      <div className="relative">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="بحث في الإشعارات…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pr-9 pl-8 text-sm font-medium outline-none focus:border-slate-400 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ===== Tabs ===== */}
      <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              tab === t.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
            <span
              className={`min-w-[18px] h-[18px] px-1 rounded text-[10px] font-bold flex items-center justify-center tabular-nums ${
                tab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ===== List ===== */}
      {initialLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-48 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-64 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
            <BellOff size={22} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-600">لا توجد إشعارات</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? 'جرّب البحث بكلمات مختلفة'
                : tab === 'orders'
                  ? 'أول طلب جديد من الموقع أو الكاشير هيظهر هنا فورًا'
                  : 'ستصلك إشعارات الطلبات والعروض هنا'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
          {filtered.map((notif) => {
            const isUnread = !notif.read;
            const prio = priorityStyle(notif.priority);
            const ic = iconFor(notif);
            const typeLabel =
              notif.source === 'pos'
                ? 'من الكاشير'
                : notif.source === 'website'
                  ? 'من الموقع'
                  : TYPE_LABELS[notif.type] || 'إشعار';
            return (
              <div
                key={notif.id}
                className={`group flex items-start gap-3 px-4 py-3.5 transition-colors ${
                  isUnread ? 'bg-cyan-50/40 hover:bg-cyan-50/70' : 'hover:bg-slate-50/70'
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${ic.cls}`}
                >
                  {ic.el}
                </span>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => isUnread && markRead(notif.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-bold ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}
                    >
                      {notif.title}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded px-1.5 py-px">
                      {typeLabel}
                    </span>
                    {(notif.priority === 'URGENT' || notif.priority === 'HIGH') && (
                      <span
                        className={`text-[10px] font-bold rounded px-1.5 py-px border ${prio.badge}`}
                      >
                        {prio.label}
                      </span>
                    )}
                    {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />}
                  </div>
                  {notif.content && (
                    <p className="text-xs text-slate-500 mt-1 leading-5 line-clamp-2">
                      {notif.content}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-slate-400">{timeAgo(notif.created_at)}</span>
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(notif.id);
                        }}
                        className="text-[10px] font-bold text-cyan-700 hover:underline"
                      >
                        تحديد كمقروء
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(notif)}
                  disabled={deleting === notif.id}
                  className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  title="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
