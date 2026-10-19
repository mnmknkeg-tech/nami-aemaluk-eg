'use client';

/**
 * مكتبة واجهة موحدة لقسم الأدمن — ثيم فاتح.
 * كل صفحات /admin تستخدم هذه المكونات بدل تكرار نفس الـ JSX والأنماط.
 */
import React from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

// ─── الألوان الموحدة (Tones) ────────────────────────────────────────────────

export type Tone = 'cyan' | 'purple' | 'green' | 'amber' | 'red' | 'sky' | 'indigo' | 'slate';

export const TONE_ICON: Record<Tone, string> = {
  cyan: 'bg-cyan-50 text-cyan-600',
  purple: 'bg-purple-50 text-purple-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  sky: 'bg-sky-50 text-sky-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  slate: 'bg-slate-100 text-slate-500',
};

export const TONE_TEXT: Record<Tone, string> = {
  cyan: 'text-cyan-600',
  purple: 'text-purple-600',
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  sky: 'text-sky-600',
  indigo: 'text-indigo-600',
  slate: 'text-slate-500',
};

export const TONE_BADGE: Record<Tone, string> = {
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};

// ─── أدوات مساعدة مشتركة (كانت مكررة في كل صفحة) ────────────────────────────

export function fmtDate(value: any): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ar-EG');
}

export function timeAgo(input: any): string {
  if (!input) return '';
  const d = new Date(String(input));
  const ms = Date.now() - d.getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'الآن';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return 'منذ لحظات';
  const min = Math.floor(sec / 60);
  if (min < 60) return `منذ ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  return `منذ ${day} يوم`;
}

export function formatEGP(n: any): string {
  const v = Number(n || 0);
  return `ج.م ${Math.round(Number.isFinite(v) ? v : 0).toLocaleString('ar-EG')}`;
}

// ─── Spinner / Loading ──────────────────────────────────────────────────────

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin text-cyan-600', className)} />;
}

export function LoadingBlock({ label = 'جاري التحميل...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-slate-500 font-bold">
      <Spinner size={18} />
      {label}
    </div>
  );
}

// ─── الحاويات ───────────────────────────────────────────────────────────────

export function Panel({
  children,
  className,
  padded = false,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-3xl shadow-sm',
        padded && 'p-6 md:p-8',
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── هيدر الصفحة (كان مكررًا في كل صفحة) ────────────────────────────────────

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  tone = 'cyan',
  actions,
  stats,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  subtitle?: string;
  tone?: Tone;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className={cn('p-3 rounded-2xl shrink-0', TONE_ICON[tone])}>
          <Icon size={24} />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-slate-500 text-sm font-bold mt-1">{subtitle}</p>}
        </div>
      </div>
      {(actions || stats) && (
        <div className="flex flex-col gap-3">
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          {stats && <div className="flex flex-wrap gap-2">{stats}</div>}
        </div>
      )}
    </div>
  );
}

// ─── شرائح الإحصائيات الصغيرة (كانت مكررة في 5 صفحات) ───────────────────────

export function StatChip({
  label,
  value,
  tone = 'slate',
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 text-center shadow-sm min-w-[84px]">
      {Icon && <Icon size={16} className={cn('mx-auto mb-1', TONE_TEXT[tone])} />}
      <div className="text-slate-500 text-[10px] font-black">{label}</div>
      <div className={cn('mt-1 text-lg font-black tabular-nums', TONE_TEXT[tone] === 'text-slate-500' ? 'text-slate-900' : TONE_TEXT[tone])}>
        {value}
      </div>
    </div>
  );
}

// ─── البحث والفلاتر (كانت مكررة في كل صفحة) ─────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = 'ابحث...',
  onSubmit,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  className?: string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className={cn('relative flex-1 min-w-[180px]', className)}
    >
      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-11 pl-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all text-sm font-bold"
      />
    </form>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 text-sm font-bold outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all',
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── الشرائح (Badges) ───────────────────────────────────────────────────────

export function Badge({
  tone = 'slate',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border whitespace-nowrap',
        TONE_BADGE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── حالة الفراغ (كانت مكررة في كل صفحة) ────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="py-20 text-center">
      <Icon size={44} className="mx-auto text-slate-300 mb-4" />
      <p className="text-slate-600 font-bold">{title}</p>
      {subtitle && <p className="text-slate-400 text-sm font-bold mt-1">{subtitle}</p>}
    </div>
  );
}

// ─── الترقيم (كان مكررًا في 4 صفحات بنفس الشكل تمامًا) ──────────────────────

export function Pagination({
  page,
  totalPages,
  total,
  unit = 'عنصر',
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  unit?: string;
  onPage: (next: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between p-4 border-t border-slate-100">
      <span className="text-slate-500 text-xs font-bold">
        صفحة {page + 1} من {totalPages} ({total.toLocaleString('ar-EG')} {unit})
      </span>
      <div className="flex gap-2">
        <button
          disabled={page === 0}
          onClick={() => onPage(Math.max(0, page - 1))}
          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black disabled:opacity-40 hover:bg-slate-200 transition-colors"
        >
          <ChevronRight size={14} /> السابق
        </button>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black disabled:opacity-40 hover:bg-slate-200 transition-colors"
        >
          التالي <ChevronLeft size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── الجداول الموحدة ────────────────────────────────────────────────────────

export const TH = 'p-4 text-slate-500 font-black text-[11px] uppercase tracking-wider whitespace-nowrap';
export const TD = 'p-4 align-middle';

export function AdminTable({
  head,
  children,
  minW = 'min-w-[720px]',
}: {
  head: React.ReactNode;
  children: React.ReactNode;
  minW?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-right border-collapse', minW)}>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const TR = 'border-b border-slate-100 hover:bg-slate-50/70 transition-colors';

// ─── أزرار ──────────────────────────────────────────────────────────────────

export const BTN_PRIMARY =
  'px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2';
export const BTN_GHOST =
  'px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200 disabled:opacity-50 transition-colors inline-flex items-center gap-2';
export const BTN_SUCCESS =
  'px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black hover:bg-emerald-600 disabled:opacity-50 transition-colors inline-flex items-center gap-2';
export const BTN_DANGER_SOFT =
  'px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-black hover:bg-red-100 disabled:opacity-50 transition-colors inline-flex items-center gap-2';
export const BTN_SOFT =
  'px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-100 disabled:opacity-50 transition-colors inline-flex items-center gap-2';

// ─── شريط التبويبات ─────────────────────────────────────────────────────────

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; icon?: React.ComponentType<{ size?: number }>; badge?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-black transition-colors inline-flex items-center gap-2',
              isActive ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            )}
          >
            {Icon && <Icon size={14} />}
            {t.label}
            {typeof t.badge === 'number' && t.badge > 0 && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px]',
                  isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                )}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── حاوية حقل (label + input) ─────────────────────────────────────────────

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mr-1 block">{label}</label>
      {children}
    </div>
  );
}

export const INPUT_CLASS =
  'w-full bg-white border border-slate-200 rounded-2xl py-3.5 px-5 font-bold text-right text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all outline-none';
