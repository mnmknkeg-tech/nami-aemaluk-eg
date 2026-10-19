'use client';

/**
 * هيكل صفحات المخزون الموحّد — نسخة مطابقة لهيكل صفحتي المنتجات والطلبات:
 * شريط هيدر أبيض (عنوان + وصف + إجراءات دائرية) ← شريط تبويبات القسم
 * ← بطاقة تابات وبحث/فلاتر ← بطاقة جدول grid-cols-12 ← ترقيم صفحات.
 * مرجع التصميم: app/dashboard/(main)/inventory/page.tsx و sales/page.tsx
 */
import React, { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, ChevronLeft, Info, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const INV_PAGE_FONT = { fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" };

export type InvTab = { id: string; label: string; count?: number };

/**
 * حالة تبويب القسم متزامنة مع ?tab= في الرابط — نفس نمط صفحة الحجوزات.
 * المبدأ: الوظيفة التابعة = تبويب داخل الصفحة، مش صفحة مستقلة.
 */
export function useInvSectionTab(
  validTabs: string[],
  fallback: string
): [string, (id: string) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const param = searchParams.get('tab') || '';
  const active = validTabs.includes(param) ? param : fallback;
  const change = useCallback(
    (id: string) => {
      router.push(`${pathname}?tab=${id}`, { scroll: false });
    },
    [router, pathname]
  );
  return [active, change];
}

/** شريط تبويبات القسم — شريط أبيض أسفل الهيدر (تبويبات الصفحة الستة) */
export function SectionTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: InvTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto py-2">
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`h-8 px-3.5 rounded-full text-[12px] font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {t.label}
              {typeof t.count === 'number' && (
                <span
                  className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** بطاقة التابات الداخلية + البحث/الفلاتر — نفس بلوك InventoryPage للعرض داخل الـviews */
export function InvControlsCard({
  tabs,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  searchPlaceholder = 'بحث…',
  filters,
}: {
  tabs?: InvTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
}) {
  const hasTabs = Boolean(tabs && tabs.length > 0);
  const hasControls = search !== undefined || Boolean(filters);
  if (!hasTabs && !hasControls) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      {hasTabs && (
        <div className="px-2 sm:px-3 py-2 flex gap-0.5 overflow-x-auto">
          {tabs!.map((f) => {
            const isActive = activeTab === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onTabChange?.(f.id)}
                className={`h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.label}
                {typeof f.count === 'number' && (
                  <span
                    className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums ${
                      isActive ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {hasControls && (
        <div
          className={`px-3 sm:px-4 py-2.5 flex flex-col lg:flex-row lg:items-center gap-2.5 ${
            hasTabs ? 'border-t border-slate-100' : ''
          }`}
        >
          {search !== undefined && (
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={15}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full h-10 pr-10 pl-4 rounded-full border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
              />
            </div>
          )}
          {filters && <div className="flex items-center gap-2">{filters}</div>}
        </div>
      )}
    </div>
  );
}

/** شريط أدوات الـview — وصف/إحصاء سريع يمين وأزرار الإجراءات يسار */
export function InvToolbar({
  hint,
  children,
}: {
  hint?: React.ReactNode;
  children?: React.ReactNode;
}) {
  if (!hint && !children) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      {hint && <div className="text-[12px] font-bold text-slate-500">{hint}</div>}
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

/** زر إجراء في شريط الأدوات — نفس ستايل أزرار الهيدر */
export function InvToolButton({
  onClick,
  primary,
  disabled,
  title,
  children,
}: {
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-9 px-4 rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
        primary
          ? 'bg-slate-900 text-white hover:bg-slate-700'
          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

/** حالة التحميل الموحدة */
export function InvLoading() {
  return (
    <div className="flex items-center justify-center min-h-[30vh]">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
    </div>
  );
}

/** حالة الفراغ الموحدة */
export function InvEmpty({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <Icon size={32} className="mx-auto mb-3 text-slate-300" />
      <p className="text-slate-400 font-bold text-sm">{title}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

type InventoryPageProps = {
  title: string;
  subtitle?: React.ReactNode;
  onInfo?: () => void;
  infoTitle?: string;
  actions?: React.ReactNode;
  error?: string;
  onDismissError?: () => void;
  tabs?: InvTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  loading?: boolean;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function InventoryPage({
  title,
  subtitle,
  onInfo,
  infoTitle = 'معلومات / Info',
  actions,
  error,
  onDismissError,
  tabs,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  searchPlaceholder = 'بحث…',
  filters,
  loading,
  empty,
  footer,
  children,
}: InventoryPageProps) {
  return (
    <div className="min-h-full bg-[#F4F5F7] text-slate-900" style={INV_PAGE_FONT}>
      {/* شريط الهيدر — نفس هيكل المنتجات/الطلبات */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              {onInfo && (
                <button
                  onClick={onInfo}
                  className="p-1 rounded-full text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-all"
                  title={infoTitle}
                >
                  <Info size={15} />
                </button>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </div>

      {/* شريط الخطأ */}
      {error && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[12px] font-bold">
            {error}
            {onDismissError && (
              <button onClick={onDismissError} className="p-1 rounded hover:bg-red-100">
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* بطاقة التابات + البحث/الفلاتر */}
      {((tabs && tabs.length > 0) || search !== undefined || filters) && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-white border border-slate-200 rounded-xl">
            {tabs && tabs.length > 0 && (
              <div className="px-2 sm:px-3 py-2 flex gap-0.5 overflow-x-auto">
                {tabs.map((f) => {
                  const isActive = activeTab === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => onTabChange?.(f.id)}
                      className={`h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                        isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {f.label}
                      {typeof f.count === 'number' && (
                        <span
                          className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums ${
                            isActive ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {f.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <div
              className={`px-3 sm:px-4 py-2.5 flex flex-col lg:flex-row lg:items-center gap-2.5 ${
                tabs && tabs.length > 0 ? 'border-t border-slate-100' : ''
              }`}
            >
              {search !== undefined && (
                <div className="relative flex-1 min-w-[200px]">
                  <Search
                    size={15}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    className="w-full h-10 pr-10 pl-4 rounded-full border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                  />
                </div>
              )}
              {filters && <div className="flex items-center gap-2">{filters}</div>}
            </div>
          </div>
        </div>
      )}

      {/* المحتوى */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
          </div>
        ) : empty ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">{empty}</div>
        ) : (
          <>
            {children}
            {footer}
          </>
        )}
      </div>
    </div>
  );
}

export type InvColumn = { label: string; className: string };

/** بطاقة الجدول — هيدر grid-cols-12 وصفوف بنفس النظام */
export function InvTableCard({
  columns,
  headerExtra,
  children,
}: {
  columns: InvColumn[];
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="hidden md:grid grid-cols-12 px-4 py-3 bg-slate-50 border-b border-slate-200">
        {headerExtra}
        {columns.map((c) => (
          <div key={c.label} className={`${c.className} text-right text-xs font-bold text-slate-500`}>
            {c.label}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

/** صف الجدول */
export function InvRow({
  children,
  muted,
  onClick,
}: {
  children: React.ReactNode;
  muted?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`grid grid-cols-12 px-4 py-3 items-center border-b border-slate-100 hover:bg-slate-50 transition-colors ${
        muted ? 'opacity-60' : ''
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      {children}
    </div>
  );
}

/** أزرار الإجراءات الدائرية داخل الصف */
export function InvRowAction({
  onClick,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 transition-colors ${
        danger
          ? 'hover:text-red-600 hover:bg-red-50'
          : 'hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

/** pill الحالة داخل الصف */
export function InvStatusPill({
  tone,
  onClick,
  disabled,
  children,
}: {
  tone: 'emerald' | 'slate' | 'red' | 'amber';
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
    slate: 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200',
    red: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
    amber: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
  };
  const cls = `h-8 px-3 rounded-full text-[11px] font-bold flex items-center gap-1.5 border transition-all disabled:opacity-50 ${tones[tone]}`;
  if (onClick) {
    return (
      <button onClick={onClick} disabled={disabled} className={cls}>
        {children}
      </button>
    );
  }
  return <span className={cls.replace(/hover:\S+/g, '')}>{children}</span>;
}

/** ترقيم الصفحات — نفس بلوك صفحة المنتجات */
export function InvPagination({
  page,
  totalPages,
  total,
  perPage,
  onPage,
  label = 'عنصر',
}: {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
  label?: string;
}) {
  if (totalPages <= 1) return null;
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );
  const cells: (number | '...')[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - (pages[i - 1] as number) > 1) cells.push('...');
    cells.push(p);
  });
  return (
    <div className="flex items-center justify-between p-4 mt-4 rounded-xl border border-slate-200 bg-white">
      <div className="text-xs font-bold text-slate-500">
        عرض {from} - {to} من {total} {label}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <ChevronRight size={16} />
        </button>
        {cells.map((c, i) =>
          c === '...' ? (
            <span key={`e${i}`} className="text-xs font-bold text-slate-300 px-1">
              …
            </span>
          ) : (
            <button
              key={c}
              onClick={() => onPage(c)}
              className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${
                c === page ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {c}
            </button>
          )
        )}
        <button
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
    </div>
  );
}

/** شريط تحديد جماعي (يظهر تحت الهيدر لما يكون فيه صفوف مختارة) */
export function InvBulkBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[12px] font-bold">
        {children}
      </div>
    </div>
  );
}
