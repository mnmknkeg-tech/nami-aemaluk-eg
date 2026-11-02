'use client';

/**
 * أدوات مشتركة لصفحة "المؤشرات والرسوم" (analytics/insights):
 * خيارات الفترة الزمنية (مرتبطة بقيم time_range في باك-إند التحليلات)،
 * الصيغ العربية للأرقام، مكوّنات الرسم المشتركة (بطاقة رسم، حالة فراغ، خط اتجاه مصغّر).
 */
import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { ArrowDownRight, ArrowUpRight, BarChart3 } from 'lucide-react';

/* ============================================================
 * الفترات الزمنية — نفس قيم time_range المسموحة في
 * gobackend/internal/domains/analytics/types.go
 * ============================================================ */
export type InsightsPeriod = 'today' | '7d' | '30d' | 'month' | 'year';

export const INSIGHTS_PERIODS: Array<{ key: InsightsPeriod; label: string; timeRange: string }> = [
  { key: 'today', label: 'اليوم', timeRange: 'today' },
  { key: '7d', label: '7 أيام', timeRange: 'last_7_days' },
  { key: '30d', label: '30 يوم', timeRange: 'last_30_days' },
  { key: 'month', label: 'هذا الشهر', timeRange: 'this_month' },
  { key: 'year', label: 'هذه السنة', timeRange: 'this_year' },
];

export const timeRangeFor = (p: InsightsPeriod): string =>
  INSIGHTS_PERIODS.find((x) => x.key === p)?.timeRange || 'last_30_days';

/** نافذة الفترة (from/to) لاستعلامات القوائم مثل /orders/me */
export const periodWindowFor = (p: InsightsPeriod): { from: string; to: string } => {
  const now = new Date();
  const start = new Date(now);
  switch (p) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case '30d':
    default:
      start.setDate(start.getDate() - 30);
      break;
  }
  return { from: start.toISOString(), to: now.toISOString() };
};

/* ============================================================
 * صيغ الأرقام — نفس أسلوب باقي صفحات التحليلات
 * ============================================================ */
const LOCALE = 'ar-EG-u-nu-latn';

export const fmtNum = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 });

export const fmtEGP = (n: number) =>
  `${(Number.isFinite(n) ? n : 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 })} ج.م`;

export const fmtPct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

export const fmtCompact = (n: number) => {
  const v = Number.isFinite(n) ? n : 0;
  if (Math.abs(v) >= 1_000_000)
    return `${(v / 1_000_000).toLocaleString(LOCALE, { maximumFractionDigits: 1 })}م`;
  if (Math.abs(v) >= 1_000)
    return `${(v / 1_000).toLocaleString(LOCALE, { maximumFractionDigits: 1 })}ألف`;
  return fmtNum(v);
};

export const fmtDay = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
};

/* ============================================================
 * ألوان الرسوم — أسيس #00E5FF مع سلسلة مكملة
 * ============================================================ */
export const INSIGHTS_CHART = {
  accent: '#00E5FF',
  grid: '#EEF1F6',
  axis: '#94A3B8',
  series: ['#00E5FF', '#8B5CF6', '#10B981', '#0EA5E9', '#F59E0B', '#EF4444'],
};

/** تسميات أيام الأسبوع بالعربية — index يطابق Date.getDay() */
export const WEEKDAY_LABELS = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

/** تسميات حالات الطلب — نفس قيم OrderStatus في باك-إند الطلبات */
export const ORDER_STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'قيد الانتظار', color: '#94A3B8' },
  CONFIRMED: { label: 'مؤكد', color: '#0EA5E9' },
  PREPARING: { label: 'قيد التحضير', color: '#F59E0B' },
  READY: { label: 'جاهز', color: '#8B5CF6' },
  DELIVERED: { label: 'تم التسليم', color: '#10B981' },
  CANCELLED: { label: 'ملغي', color: '#EF4444' },
  REFUNDED: { label: 'مسترجع', color: '#64748B' },
};

/**
 * نسبة التغير بين النصف الثاني والنصف الأول من سلسلة زمنية —
 * نفس أسلوب الباك-إند في GetSalesPerformance (تقسيم الترند نصفين).
 */
export function changeFromSeries(series: number[]): number | null {
  if (!series || series.length < 2) return null;
  const half = Math.floor(series.length / 2);
  if (half <= 0) return null;
  const prev = series.slice(0, half).reduce((a, b) => a + b, 0);
  const cur = series.slice(half).reduce((a, b) => a + b, 0);
  if (prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

/** شارة نسبة التغير — أخضر/أحمر مع سهم، رمادي لو غير متاح */
export function ChangePill({ change }: { change: number | null }) {
  if (change === null || !Number.isFinite(change)) {
    return <span className="text-[11px] font-bold text-slate-300 tabular-nums">—</span>;
  }
  const up = change > 0.05;
  const down = change < -0.05;
  if (!up && !down) {
    return <span className="text-[11px] font-bold text-slate-400">ثابت</span>;
  }
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-bold rounded-full px-2 py-0.5 tabular-nums ${
        up ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
      }`}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {fmtPct(Math.abs(change))}
    </span>
  );
}

/* ============================================================
 * مكوّنات العرض المشتركة
 * ============================================================ */

/** بطاقة رسم بيانية — بيضاء بحدود رمادية بعنوان عربي */
export function ChartCard({
  title,
  icon,
  extra,
  className = '',
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
        {extra}
      </div>
      {children}
    </div>
  );
}

/** حالة فراغ عربية موحدة لبطاقات الرسوم */
export function ChartEmpty({ hint }: { hint?: string }) {
  return (
    <div className="min-h-[160px] flex flex-col items-center justify-center text-center gap-1 py-8">
      <BarChart3 size={26} className="text-slate-200" />
      <p className="text-[13px] font-bold text-slate-400">لا توجد بيانات</p>
      {hint && <p className="text-[11px] font-semibold text-slate-300">{hint}</p>}
    </div>
  );
}

/** هيكل تحميل (skeleton) لشبكة البطاقات */
export function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4">
          <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
          <div className="h-6 w-28 bg-slate-100 rounded animate-pulse mt-3" />
          <div className="h-10 bg-slate-50 rounded animate-pulse mt-3" />
        </div>
      ))}
    </>
  );
}

/** هيكل تحميل لبطاقة رسم بيانية */
export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return <div className="bg-slate-50 rounded-xl animate-pulse" style={{ height }} />;
}

/** خط اتجاه مصغّر (sparkline) لبطاقات الـKPI — يظهر فقط مع نقطتين أو أكثر */
export function MiniSparkline({
  data,
  color = INSIGHTS_CHART.accent,
}: {
  data: number[];
  color?: string;
}) {
  const points = (data || []).map((v, i) => ({ i, v }));
  if (points.length < 2) return null;
  const gradId = `ins-spark-${color.replace('#', '')}`;
  return (
    <div className="h-10 -mx-1 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
