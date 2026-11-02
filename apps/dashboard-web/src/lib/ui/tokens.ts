/* ============================================================
 * Design tokens — نظام التصميم الموحد للداشبورد
 * كل الألوان والظلال والأنصاف تُستخدم من هنا فقط.
 * ============================================================ */

/** لوحة الألوان الأساسية — Indigo هو اللون الأساسي (Primary) */
export const palette = {
  primary: '#4F46E5', // indigo-600
  primarySoft: '#EEF2FF', // indigo-50
  success: '#059669', // emerald-600
  successSoft: '#ECFDF5',
  warning: '#D97706', // amber-600
  warningSoft: '#FFFBEB',
  error: '#DC2626', // red-600
  errorSoft: '#FEF2F2',
  info: '#2563EB', // blue-600
  infoSoft: '#EFF6FF',
  ink: '#0F172A', // slate-900
  muted: '#64748B', // slate-500
  faint: '#94A3B8', // slate-400
  line: '#E2E8F0', // slate-200
  surface: '#F7F8FA', // خلفية الصفحة — محايد بارد
} as const;

/** ألوان سلاسل الرسوم البيانية — تسلسل هرمي واضح */
export const chartColors = {
  revenue: '#4F46E5',
  orders: '#7C3AED',
  series: ['#4F46E5', '#7C3AED', '#0EA5E9', '#059669', '#F59E0B', '#DC2626'],
  grid: '#EEF1F6',
  axis: '#94A3B8',
  cursor: '#E2E8F0',
} as const;

/** الظلال — طبقتان فقط: كارت عادي + كارت مرفوع عند الـ hover */
export const shadows = {
  card: '0 1px 2px rgba(16,24,40,0.04), 0 6px 16px -10px rgba(16,24,40,0.08)',
  lift: '0 2px 4px rgba(16,24,40,0.05), 0 16px 32px -12px rgba(16,24,40,0.14)',
} as const;

/** أنصاف القطر الموحدة */
export const radius = {
  card: 'rounded-2xl',
  inner: 'rounded-xl',
  chip: 'rounded-full',
} as const;

/** أنماط نصية — للتسلسل الهرمي الطباعي */
export const text = {
  pageTitle: 'text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight',
  sectionTitle: 'text-[15px] font-extrabold text-slate-900',
  cardTitle: 'text-[13px] font-bold text-slate-800',
  kpiLabel: 'text-[11px] font-semibold text-slate-400',
  kpiValue: 'text-[22px] sm:text-2xl font-extrabold text-slate-900 tabular-nums leading-7',
  meta: 'text-[11px] font-medium text-slate-400',
  body: 'text-xs font-semibold text-slate-600',
} as const;

/** كلاسات الكارت الأساسية */
export const cardClass =
  'bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-10px_rgba(16,24,40,0.08)]';

/** حاويات الأيقونات الملوّنة — tinted bg + icon */
export const iconTint: Record<string, string> = {
  primary: 'bg-indigo-50 text-indigo-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  error: 'bg-red-50 text-red-600',
  info: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  neutral: 'bg-slate-100 text-slate-500',
};
