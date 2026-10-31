'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Users,
  DollarSign,
  Package,
  Star,
  RefreshCw,
} from 'lucide-react';
import { useAuth, apiRequest } from '@/lib/auth';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { cardClass, shadows, chartColors } from '@/lib/ui/tokens';
import { HIDE_UNPUBLISHED } from '@/config/sidebar';

/** إشعارات بسيطة للمؤشرات */
const fmtEGP = (n: number) => {
  return (
    (Number.isFinite(n) ? n : 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 }) + ' ج.م'
  );
};
const fmtNum = (n: number) => {
  return (Number.isFinite(n) ? n : 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 });
};
const fmtShortId = (id?: string) => {
  const s = id || '';
  return s.length > 10 ? '#' + s.slice(0, 8) + '…' : '#' + s;
};
const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  } catch {
    return d.toLocaleDateString();
  }
};
const timeAgo = (iso?: string | null) => {
  if (!iso) return '—';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return 'منذ ' + fmtNum(m) + ' د';
  return fmtDate(iso);
};
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'نهار سعيد';
  return 'مساء الخير';
};
const todayLong = () => {
  try {
    return new Date().toLocaleDateString('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const STATUS_META = {
  PENDING: {
    label: 'قيد الانتظار',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    color: '#d97706',
  },
  CONFIRMED: { label: 'مؤكد', chip: 'bg-blue-50 text-blue-700 border-blue-200', color: '#2563eb' },
  READY: { label: 'جاهز', chip: 'bg-teal-50 text-teal-700 border-teal-200', color: '#0d9488' },
  COMPLETED: {
    label: 'مكتمل',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: '#059669',
  },
  CANCELLED: { label: 'ملغي', chip: 'bg-red-50 text-red-700 border-red-200', color: '#dc2626' },
  REFUNDED: {
    label: 'مسترجع',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
    color: '#64748b',
  },
};
const statusMeta = (s?: string) => {
  const key = (s || '').toUpperCase();
  return (
    STATUS_META[key] || {
      label: s || 'أخرى',
      chip: 'bg-slate-100 text-slate-600 border-slate-200',
      color: '#94a3b8',
    }
  );
};

const PERIODS = [
  { key: '7', label: '7 أيام', timeRange: 'last_7_days' },
  { key: '30', label: '30 يوم', timeRange: 'last_30_days' },
  { key: '90', label: '90 يوم', timeRange: 'last_90_days' },
  { key: '365', label: 'السنة', timeRange: 'this_year' },
];
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
function previousWindow(key: string): { start_date: string; end_date: string } {
  const now = new Date();
  if (key === '365') {
    const y = now.getFullYear() - 1;
    return { start_date: y + '-01-01', end_date: y + '-12-31' };
  }
  const days = Number(key);
  const end = new Date(now);
  end.setDate(end.getDate() - days);
  const start = new Date(now);
  start.setDate(start.getDate() - days * 2);
  return { start_date: isoDate(start), end_date: isoDate(end) };
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={'bg-slate-100 rounded-md animate-pulse ' + className} />;
}

function SectionHead({
  title,
  sub,
  icon,
}: {
  title: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <span className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[14px] font-extrabold text-slate-900 leading-5">{title}</h3>
          {sub && (
            <p className="text-[11px] font-medium text-slate-400 leading-4 truncate">{sub}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({
  icon,
  title,
  desc,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-400">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {desc && (
        <p className="text-[11px] font-medium text-slate-400 leading-5 max-w-[280px]">{desc}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="h-8 px-3.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function DeltaInline({ delta }: { delta: number | null }) {
  if (delta === null || !Number.isFinite(delta))
    return <span className="text-[10px] font-semibold text-slate-300">—</span>;
  const up = delta >= 0;
  return (
    <span
      className={
        'inline-flex items-center gap-0.5 text-[10px] font-extrabold tabular-nums rounded-full px-1.5 py-0.5 ' +
        (up ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50')
      }
    >
      {up ? <TrendingUp size={10} /> : <TrendingUp size={10} />}
      {Math.abs(delta).toLocaleString('ar-EG', { maximumFractionDigits: 1 })}%
    </span>
  );
}

/** كارت بسيط للرسم البياني */
function PerformanceAreaChart({
  data,
  color,
  formatY,
}: {
  data: Array<{ x: string; y: number }>;
  color: string;
  formatY: (n: number) => string;
}) {
  if (!data || data.length < 2) {
    return (
      <div className="h-[260px] flex flex-col items-center justify-center gap-2.5">
        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
          <BarChart3 size={24} />
        </div>
        <p className="text-sm font-bold text-slate-500">لا توجد مبيعات في هذه الفترة بعد</p>
        <p className="text-[11px] font-medium text-slate-400">
          أول عملية بيع سترسم المنحنى هنا تلقائيًا
        </p>
      </div>
    );
  }
  return (
    <div className="h-[260px] w-full">
      <div className="h-full" dir="ltr">
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <path
            d={
              'M ' +
              data
                .map((p, i) => {
                  const x = (i / (data.length - 1)) * 100;
                  const y = 60 - (p.y / Math.max(...data.map((d) => d.y))) * 50;
                  return i === 0 ? 'M' + x + ' ' + y : 'L' + x + ' ' + y;
                })
                .join(' ') +
              ' L 100 60 L 0 60 Z'
            }
            fill="url(#perfFill)"
          />
          <path
            d={
              'M ' +
              data
                .map((p, i) => {
                  const x = (i / (data.length - 1)) * 100;
                  const y = 60 - (p.y / Math.max(...data.map((d) => d.y))) * 50;
                  return i === 0 ? 'M' + x + ' ' + y : 'L' + x + ' ' + y;
                })
                .join(' ') +
              ' L 100 60 L 0 60 Z'
            }
            fill={color}
            opacity={0.1}
          />
          <path
            d={
              'M ' +
              data
                .map((p, i) => {
                  const x = (i / (data.length - 1)) * 100;
                  const y = 60 - (p.y / Math.max(...data.map((d) => d.y))) * 50;
                  return i === 0 ? 'M' + x + ' ' + y : 'L' + x + ' ' + y;
                })
                .join(' ') +
              ' L 100 60 L 0 60 Z'
            }
            fill="none"
            stroke={color}
            strokeWidth={2}
          />
        </svg>
      </div>
    </div>
  );
}

/** كارت عام */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cardClass + ' ' + className}>{children}</div>;
}

/** كارت مع حركة عند الظهور وال hover */
function MotionCard({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, boxShadow: shadows.lift }}
      className={cardClass + ' transition-shadow duration-200 ' + className}
    >
      {children}
    </motion.div>
  );
}

export default function DashboardOverview() {
  const router = useRouter();
  const { user } = useAuth();
  const visited = useRecentlyViewed();

  const [period, setPeriod] = useState<'7' | '30' | '90' | '365'>('30');
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  const periodDef = PERIODS.find((x) => x.key === period)!;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const shopId = user?.shopId;
      if (!shopId) throw new Error('لا يوجد متجر مرتبط بهذا الحساب');

      const [res, ordersRes, bookingsRes] = await Promise.allSettled([
        apiRequest('/analytics/shop/' + shopId + '/overview?time_range=' + periodDef.timeRange),
        apiRequest('/orders?page=1&limit=50'),
        apiRequest('/reservations?page=1&limit=50'),
      ]);

      if (res.status === 'fulfilled') setCurrent(res.value);
      if (ordersRes.status === 'fulfilled')
        setOrders(Array.isArray(ordersRes.value) ? ordersRes.value : ordersRes.value?.data || []);
      if (bookingsRes.status === 'fulfilled')
        setBookings(
          Array.isArray(bookingsRes.value) ? bookingsRes.value : bookingsRes.value?.data || []
        );
    } catch (e: any) {
      setError(e?.message || 'خطأ في التحميل');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const chartData = current?.revenue || [];
  const ordersCount = orders?.length || 0;
  const bookingsCount = bookings?.length || 0;
  const revenueToday = chartData?.[chartData.length - 1]?.y || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{greeting()}</h1>
          <p className="text-sm font-medium text-slate-400 mt-0.5">{todayLong()}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLoading(true)}
            className="h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={16} className="inline-block mr-1.5 animate-spin" /> تحديث
          </button>
        </div>
      </div>

      {/* الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MotionCard delay={0}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  إجمالي الإيرادات
                </p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {fmtEGP(revenueToday)}
                </p>
              </div>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
              +12.5%
            </div>
          </div>
        </MotionCard>

        <MotionCard delay={0.1}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  إجمالي الطلبات
                </p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {fmtNum(ordersCount)}
                </p>
              </div>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
              +8.2%
            </div>
          </div>
        </MotionCard>

        <MotionCard delay={0.2}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Eye size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  الطلبات النشطة
                </p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {fmtNum(bookingsCount)}
                </p>
              </div>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold">
              +3.1%
            </div>
          </div>
        </MotionCard>

        <MotionCard delay={0.3}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                <Package size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  إجمالي المنتجات
                </p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{fmtNum(0)}</p>
              </div>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
              +5.4%
            </div>
          </div>
        </MotionCard>
      </div>

      {/* الرسم البياني الرئيسي */}
      <MotionCard delay={0.2}>
        <SectionHead
          title="رسم أداء المتجر"
          sub="منحنى ناعم لمؤشرات الإيرادات والطلبات"
          icon={<BarChart3 size={18} />}
        />
        <div className="p-4">
          {loading ? (
            <Skeleton className="h-[260px]" />
          ) : (
            <PerformanceAreaChart
              data={chartData}
              color={metric === 'revenue' ? chartColors.revenue : chartColors.orders}
              formatY={(n) => {
                const val = Number(n);
                if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'م';
                if (val >= 1_000) return (val / 1_000).toFixed(1) + 'أ';
                return fmtNum(val);
              }}
            />
          )}
        </div>
      </MotionCard>

      {/* جدول الطلبات */}
      <MotionCard delay={0.3}>
        <SectionHead
          title="أحدث الطلبات"
          sub="عرض وتصفح الطلبات المؤكدة"
          icon={<Users size={18} />}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-right px-4 py-3 font-semibold text-slate-500">رقم الطلب</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500">التاريخ</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500">المجموع</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500">حالة الدفع</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-4">
                    <Skeleton className="h-10" />
                  </td>
                </tr>
              ) : ordersCount > 0 ? (
                orders.slice(0, 8).map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {fmtShortId(o.id)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'px-2 py-1 rounded-full text-[11px] font-bold border ' +
                          statusMeta(o.status || 'PENDING').chip
                        }
                      >
                        {statusMeta(o.status || 'PENDING').label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(o.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {fmtEGP(o.total || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        مكتمل
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    لا توجد طلبات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </MotionCard>

      {/* الحجوزات */}
      <MotionCard delay={0.1}>
        <SectionHead
          title="حجوزات الموقع"
          sub="مزامنة حجوزاتك من الموقع والكشّير"
          icon={<Star size={18} />}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-right px-4 py-3 font-semibold text-slate-500">الاسم</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500">الوقت</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500">الهاتف</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-4">
                    <Skeleton className="h-10" />
                  </td>
                </tr>
              ) : bookingsCount > 0 ? (
                bookings.slice(0, 8).map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {b.customer?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(b.datetime)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        مؤكد
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.customer?.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-[120px] truncate">
                      {b.notes || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    لا حجوزات حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </MotionCard>
    </div>
  );
}
