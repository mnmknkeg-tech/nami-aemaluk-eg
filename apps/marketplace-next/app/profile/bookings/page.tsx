'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock, MapPin, ArrowRight } from 'lucide-react';
import { api, extractList } from '@/lib/api';

/**
 * Customer bookings — content only (shell lives in app/profile/layout.tsx).
 * Reads GET /bookings/me: every booking the customer made across all shops
 * and builder sites, mirroring what merchants see in their dashboard.
 */
interface Booking {
  id: string;
  bookingNumber?: string;
  serviceName?: string;
  shopId?: string;
  startAt?: string;
  participants?: number;
  totalAmount?: number;
  currency?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  PENDING: {
    label: 'قيد الانتظار',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  CONFIRMED: {
    label: 'مؤكد',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  COMPLETED: {
    label: 'مكتمل',
    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  CANCELLED: {
    label: 'ملغي',
    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
  NO_SHOW: {
    label: 'لم يحضر',
    cls: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
};

function statusInfo(status?: string) {
  const key = String(status || '').toUpperCase();
  return (
    STATUS_STYLES[key] || {
      label: String(status || '—'),
      cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    }
  );
}

function formatWhen(b: Booking) {
  if (!b.startAt) {
    return b.createdAt ? new Date(b.createdAt).toLocaleDateString('ar-EG') : '—';
  }
  const d = new Date(b.startAt);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProfileBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/bookings/me');
        // /bookings/me is a plain list (`{data: [...]}`) — extractList keeps
        // it safe even when the backend returns `data: null` for new users.
        setBookings(extractList<Booking>(res));
      } catch (err: any) {
        setError(err?.message || 'فشل تحميل الحجوزات');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = bookings.filter((b) => {
    const s = String(b.status || '').toUpperCase();
    if (filter === 'all') return true;
    if (filter === 'completed') return s === 'COMPLETED';
    if (filter === 'cancelled') return s === 'CANCELLED' || s === 'NO_SHOW';
    if (filter === 'upcoming') return s === 'PENDING' || s === 'CONFIRMED';
    return true;
  });

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
        <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold">حجوزاتي</h2>
          <p className="text-sm text-slate-500 mt-1">كل حجوزاتك من المحلات والأنشطة — في مكان واحد</p>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'upcoming', 'completed', 'cancelled'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === key
                  ? 'bg-brand-cyan text-black'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {key === 'all' && 'الكل'}
              {key === 'upcoming' && 'القادمة'}
              {key === 'completed' && 'مكتملة'}
              {key === 'cancelled' && 'ملغية'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold">
          {error}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((b, i) => {
            const info = statusInfo(b.status);
            return (
              <div
                key={b.id || i}
                className="p-4 md:p-5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 hover:border-brand-cyan/40 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/60 pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-brand-cyan/10 flex items-center justify-center shrink-0">
                      <CalendarDays className="w-5 h-5 text-brand-cyan" />
                    </div>
                    <div>
                      <span className="font-bold text-sm block">{b.serviceName || 'حجز'}</span>
                      {b.bookingNumber && (
                        <span className="text-xs text-slate-400 font-semibold" dir="ltr">
                          #{b.bookingNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${info.cls}`}>
                      {info.label}
                    </span>
                    {Number.isFinite(Number(b.totalAmount)) && Number(b.totalAmount) > 0 && (
                      <span className="text-sm font-black text-brand-cyan block mt-1">
                        {Number(b.totalAmount).toLocaleString('ar-EG')} {b.currency || 'ج.م'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formatWhen(b)}
                  </span>
                  {Number(b.participants) > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {b.participants} أفراد
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-black text-slate-700 dark:text-slate-300">
            لا توجد حجوزات في هذا القسم
          </p>
          <p className="text-slate-400 text-sm font-semibold mt-1 mb-5">
            احجز من أي محل أو نشاط وسيظهر هنا فورًا
          </p>
          <Link
            href="/dalil"
            className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-cyan text-black font-bold text-sm hover:bg-cyan-400 transition-colors"
          >
            استكشف الأنشطة والمحلات <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
