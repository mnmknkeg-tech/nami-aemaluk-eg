'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Package, Store, Tag, Heart, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { isSessionActive, jsonRequest } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ListSkeleton, PageHeaderSkeleton } from '@/components/Skeleton';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const NOTIF_ICONS: Record<string, any> = {
  ORDER: Package,
  SHOP: Store,
  OFFER: Tag,
  FOLLOW: Heart,
  SYSTEM: Bell,
};

const NOTIF_COLORS: Record<string, string> = {
  ORDER: 'bg-cyan-500/10 text-cyan-500',
  SHOP: 'bg-purple-500/10 text-purple-500',
  OFFER: 'bg-amber-500/10 text-amber-500',
  FOLLOW: 'bg-red-500/10 text-red-500',
  SYSTEM: 'bg-slate-500/10 text-slate-500',
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!isSessionActive()) {
        router.push('/login?returnTo=/notifications');
        return;
      }
      try {
        const data = await jsonRequest<any>('/notifications/me');
        setNotifications(Array.isArray(data) ? data : (data?.items ?? []));
      } catch {}
      setLoading(false);
    })();
  }, [router]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await jsonRequest(`/notifications/me/${id}/read`, { method: 'PATCH' });
    } catch {}
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await jsonRequest('/notifications/me/read', { method: 'PATCH' });
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6" aria-busy>
        <span className="sr-only">جاري التحميل...</span>
        <PageHeaderSkeleton />
        <ListSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="relative max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* هيدر الصفحة بهوية الهوية البصرية — أيقونة في container + عنوان + إحصائية */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-brand-cyan/10 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6 md:w-7 md:h-7 text-brand-cyan" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الإشعارات</h1>
            <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs md:text-sm mt-0.5">
              كل ما يخص طلباتك وعروضك في مكان واحد
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="px-3 py-1 rounded-full bg-brand-cyan text-brand-black text-xs font-black">
              {unreadCount} جديد
            </span>
            <button
              onClick={markAllRead}
              className="text-xs font-bold text-brand-cyan hover:underline flex items-center gap-1"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              تعليم الكل كمقروء
            </button>
          </div>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 rounded-3xl bg-brand-cyan/10 flex items-center justify-center mx-auto mb-5">
            <Bell className="w-10 h-10 text-brand-cyan" />
          </div>
          <p className="text-slate-700 dark:text-slate-200 font-black text-lg">لا توجد إشعارات</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 font-semibold">
            ستظهر هنا إشعارات الطلبات والعروض الجديدة
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = NOTIF_ICONS[notif.type] || Bell;
            const colorCls = NOTIF_COLORS[notif.type] || NOTIF_COLORS.SYSTEM;
            const content = (
              <div
                className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                  notif.read
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    : 'bg-brand-cyan/5 border-brand-cyan/20'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorCls}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">{notif.title}</h3>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-brand-cyan flex-shrink-0" />
                    )}
                  </div>
                  {notif.body && (
                    <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">
                      {notif.body}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(notif.createdAt)}
                    </span>
                    {!notif.read && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          markAsRead(notif.id);
                        }}
                        className="text-xs font-bold text-brand-cyan hover:underline mr-auto"
                      >
                        تعليم كمقروء
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );

            return notif.link ? (
              <Link key={notif.id} href={notif.link}>
                {content}
              </Link>
            ) : (
              <div key={notif.id}>{content}</div>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-cyan"
        >
          <ArrowLeft className="w-4 h-4" />
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
