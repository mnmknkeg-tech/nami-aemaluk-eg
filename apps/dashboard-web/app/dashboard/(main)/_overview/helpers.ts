/* ============================================================
 * Overview page helpers — formatting, status metas, period windows.
 * Page-local semantics; NOT the shared lib/format.ts.
 * ============================================================ */

import { HIDE_UNPUBLISHED } from '@/config/sidebar';
import type { PeriodKey } from './types';

// Market-launch switch: analytics is local-only, so these dashboard KPIs fall
// back to their own section in production builds instead of deep-linking into
// a hidden analytics page.
export const analyticsHref = (analyticsPath: string, fallbackPath: string) =>
  HIDE_UNPUBLISHED ? fallbackPath : analyticsPath;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ============================================================
 * Helpers
 * ============================================================ */

export const LOCALE = 'ar-EG-u-nu-latn';

// اختصارات افتراضية تظهر لما مفيش تاريخ زيارات لسه
// Market-launch switch: local-only sections are excluded in production builds.
export const DEFAULT_SHORTCUTS: { href: string; labelAr: string }[] = [
  { href: '/dashboard/sales', labelAr: 'كل الطلبات' },
  { href: '/dashboard/inventory/products', labelAr: 'المنتجات' },
  { href: '/dashboard/notifications', labelAr: 'الإشعارات' },
  { href: '/dashboard/pos', labelAr: 'الكاشير' },
  // التحليلات: لوكال فقط (نفس نمط المالية/المحاسبة/HR/AI).
  ...(HIDE_UNPUBLISHED ? [] : [{ href: '/dashboard/analytics', labelAr: 'التحليلات' }]),
  { href: '/dashboard/marketing', labelAr: 'التسويق' },
];

export const fmtEGP = (n: number) =>
  `${(Number.isFinite(n) ? n : 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 })} ج.م`;
export const fmtNum = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 });
export const fmtCompact = (n: number) => {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString(LOCALE, { maximumFractionDigits: 1 })}م`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString(LOCALE, { maximumFractionDigits: 1 })}ألف`;
  return fmtNum(n);
};
export const fmtShortId = (id?: string) => {
  const s = id || '';
  return s.length > 10 ? `#${s.slice(0, 8)}…` : `#${s}`;
};
export const fmtDate = (iso?: string | null, opts: Intl.DateTimeFormatOptions = {}) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', ...opts });
  } catch {
    return d.toLocaleDateString();
  }
};
export const timeAgo = (iso?: string | null) => {
  if (!iso) return '—';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${fmtNum(m)} د`;
  if (m < 1440) return `منذ ${fmtNum(Math.floor(m / 60))} س`;
  return fmtDate(iso);
};
export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'نهار سعيد';
  return 'مساء الخير';
};
export const todayLong = () => {
  try {
    return new Date().toLocaleDateString(LOCALE, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const STATUS_META: Record<string, { label: string; chip: string; color: string }> = {
  PENDING: {
    label: 'قيد الانتظار',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    color: '#d97706',
  },
  CONFIRMED: { label: 'مؤكد', chip: 'bg-blue-50 text-blue-700 border-blue-200', color: '#2563eb' },
  PREPARING: {
    label: 'قيد التحضير',
    chip: 'bg-violet-50 text-violet-700 border-violet-200',
    color: '#7c3aed',
  },
  READY: { label: 'جاهز', chip: 'bg-teal-50 text-teal-700 border-teal-200', color: '#0d9488' },
  DELIVERED: {
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
export const statusMeta = (s?: string) =>
  STATUS_META[String(s || '').toUpperCase()] || {
    label: s || 'أخرى',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
    color: '#94a3b8',
  };

const BOOKING_STATUS_META: Record<string, { label: string; chip: string; color: string }> = {
  PENDING: {
    label: 'بانتظار التأكيد',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    color: '#d97706',
  },
  CONFIRMED: {
    label: 'مؤكد',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: '#059669',
  },
  COMPLETED: { label: 'مكتمل', chip: 'bg-teal-50 text-teal-700 border-teal-200', color: '#0d9488' },
  CANCELLED: { label: 'ملغي', chip: 'bg-red-50 text-red-700 border-red-200', color: '#dc2626' },
  EXPIRED: {
    label: 'منتهي',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
    color: '#64748b',
  },
};
export const bookingStatusMeta = (s?: string) =>
  BOOKING_STATUS_META[String(s || '').toUpperCase()] || {
    label: s || 'غير محدد',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
    color: '#94a3b8',
  };

export const PERIODS: Array<{ key: PeriodKey; label: string; timeRange: string }> = [
  { key: '7', label: '7 أيام', timeRange: 'last_7_days' },
  { key: '30', label: '30 يوم', timeRange: 'last_30_days' },
  { key: '90', label: '90 يوم', timeRange: 'last_90_days' },
  { key: '365', label: 'السنة', timeRange: 'this_year' },
];
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export function previousWindow(key: PeriodKey): { start_date: string; end_date: string } {
  const now = new Date();
  if (key === '365') {
    const y = now.getFullYear() - 1;
    return { start_date: `${y}-01-01`, end_date: `${y}-12-31` };
  }
  const days = Number(key);
  const end = new Date(now);
  end.setDate(end.getDate() - days);
  const start = new Date(now);
  start.setDate(start.getDate() - days * 2);
  return { start_date: isoDate(start), end_date: isoDate(end) };
}
export const pctDelta = (cur: number, prev: number): number | null => {
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
};
