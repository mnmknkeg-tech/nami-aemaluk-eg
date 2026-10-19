'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Check, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useToast } from '@/components/settings/ToastProvider';
import { PageHeader, Panel, LoadingBlock, EmptyState, BTN_GHOST, fmtDate } from '@/components/admin/ui';

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [list, unread] = await Promise.all([
        apiRequest('/notifications/me?take=50'),
        apiRequest('/notifications/me/unread-count'),
      ]);
      setItems(Array.isArray(list) ? list : []);
      setUnreadCount(Math.max(0, Number(unread?.count || 0)));
    } catch (e: any) {
      toast({ title: e?.message || 'فشل تحميل الإشعارات', variant: 'destructive' });
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const markAllRead = async () => {
    try {
      await apiRequest('/notifications/me/read', { method: 'PATCH' });
      await loadData(true);
      toast({ title: 'تم تحديد الكل كمقروء', variant: 'success' });
    } catch (e: any) {
      toast({ title: e?.message || 'فشل التحديث', variant: 'destructive' });
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/me/${id}/read`, { method: 'PATCH' });
      setItems((prev) => prev.map((n) => (String(n?.id) === String(id) ? { ...n, isRead: true, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e: any) {
      toast({ title: e?.message || 'فشل التحديث', variant: 'destructive' });
    }
  };

  const normalized = useMemo(() => {
    return (Array.isArray(items) ? items : []).map((n) => {
      const isRead = Boolean(n?.isRead ?? n?.is_read);
      const message = String(n?.content || n?.message || '').trim();
      const createdAtText = fmtDate(n?.createdAt || n?.created_at);
      const title = String(n?.title || '').trim();
      const type = String(n?.type || '').trim();
      return { ...n, isRead, message, createdAtText, title, type };
    });
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        title="الإشعارات"
        subtitle="إدارة إشعارات النظام"
        tone="amber"
        stats={
          <span className="text-xs font-black px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm">
            غير مقروء: {unreadCount.toLocaleString('ar-EG')}
          </span>
        }
        actions={
          <>
            <button onClick={() => loadData(true)} disabled={loading || refreshing} className={BTN_GHOST}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              تحديث
            </button>
            <button
              onClick={markAllRead}
              disabled={loading || refreshing || unreadCount === 0}
              className="px-4 py-2 rounded-xl text-xs font-black bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 disabled:opacity-60 inline-flex items-center gap-2"
            >
              <Check size={14} />
              تحديد الكل كمقروء
            </button>
          </>
        }
      />

      <Panel>
        {loading ? (
          <LoadingBlock />
        ) : normalized.length === 0 ? (
          <EmptyState icon={Bell} title="لا توجد إشعارات" />
        ) : (
          <div className="divide-y divide-slate-100">
            {normalized.map((n) => (
              <div key={String(n?.id)} className="p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${n.isRead ? 'bg-slate-200' : 'bg-amber-400'}`} />
                    <div className="text-slate-800 font-black text-sm">
                      {n.title || n.type || 'إشعار'}
                    </div>
                    <div className="text-slate-400 font-bold text-xs">{n.createdAtText}</div>
                  </div>
                  <div className={`mt-2 text-sm font-bold leading-7 ${n.isRead ? 'text-slate-400' : 'text-slate-700'}`}>
                    {n.message || '—'}
                  </div>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markOneRead(String(n?.id))}
                    className="px-4 py-2 rounded-2xl text-xs font-black bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 shrink-0"
                  >
                    تحديد كمقروء
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
