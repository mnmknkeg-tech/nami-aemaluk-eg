'use client';

/**
 * أدوات مشتركة لتبويبي «المالية» و«المدفوعات» في صفحة تحليلات المالية:
 * نطاقات الفترات، تجزئة السلاسل الزمنية، كروت المؤشرات، رسوم recharts،
 * هياكل التحميل وحالات الفراغ — كل الأرقام من بيانات حقيقية فقط.
 */
import React from 'react';
import {
  AreaChart as RAreaChart,
  Area as RArea,
  BarChart as RBarChart,
  Bar as RBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart as RPieChart,
  Pie as RPie,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ============================================================
 * تنسيق الأرقام — نفس نمط صفحة التقارير (ج.م)
 * ============================================================ */

export const fmt = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const fmt2 = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const egp = (n: number) => `ج.م ${fmt(n)}`;

/** مختصر لمحور Y — 12.5K / 3.2M */
export const compactNum = (v: number) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1)}K`;
  return String(Math.round(n));
};

/* ============================================================
 * الفترات — نفس قيم الفلتر في الصفحة
 * ============================================================ */

export type PeriodKey = 'today' | 'd7' | 'd30' | 'month' | 'year';

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'اليوم' },
  { key: 'd7', label: '7 أيام' },
  { key: 'd30', label: '30 يوم' },
  { key: 'month', label: 'هذا الشهر' },
  { key: 'year', label: 'هذه السنة' },
];

export const periodLabel = (p: PeriodKey) => PERIOD_OPTIONS.find((o) => o.key === p)?.label || '';

export type DateRange = { from: string; to: string };

const dayIso = (offset: number) => {
  const todayMs = Date.parse(`${new Date().toISOString().split('T')[0]}T00:00:00Z`);
  return new Date(todayMs + offset * 86400000).toISOString().split('T')[0];
};

/** نطاق الفترة المختارة — بتوقيت UTC لنفس طريقة مقارنة التواريخ في التقارير */
export function periodRange(p: PeriodKey): DateRange {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  switch (p) {
    case 'today': {
      const t = dayIso(0);
      return { from: t, to: t };
    }
    case 'd7':
      return { from: dayIso(-6), to: dayIso(0) };
    case 'd30':
      return { from: dayIso(-29), to: dayIso(0) };
    case 'month':
      return {
        from: new Date(Date.UTC(y, m, 1)).toISOString().split('T')[0],
        to: new Date(Date.UTC(y, m + 1, 0)).toISOString().split('T')[0],
      };
    case 'year':
      return {
        from: new Date(Date.UTC(y, 0, 1)).toISOString().split('T')[0],
        to: new Date(Date.UTC(y, 11, 31)).toISOString().split('T')[0],
      };
  }
}

/** الفترة السابقة المقابلة (لحساب الاتجاه من القوائم المؤرخة) */
export function prevPeriodRange(p: PeriodKey): DateRange {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  switch (p) {
    case 'today': {
      const t = dayIso(-1);
      return { from: t, to: t };
    }
    case 'd7':
      return { from: dayIso(-13), to: dayIso(-7) };
    case 'd30':
      return { from: dayIso(-59), to: dayIso(-30) };
    case 'month':
      return {
        from: new Date(Date.UTC(y, m - 1, 1)).toISOString().split('T')[0],
        to: new Date(Date.UTC(y, m, 0)).toISOString().split('T')[0],
      };
    case 'year':
      return {
        from: new Date(Date.UTC(y - 1, 0, 1)).toISOString().split('T')[0],
        to: new Date(Date.UTC(y - 1, 11, 31)).toISOString().split('T')[0],
      };
  }
}

/** هل التاريخ داخل النطاق؟ — نفس منطق صفحة التقارير (مقارنة نصية لليوم) */
export function inPeriod(d: string | undefined | null, range: DateRange): boolean {
  const day = String(d || '').split('T')[0];
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}

/* ============================================================
 * تجزئة السلاسل الزمنية — ساعات لليوم، أيام، شهور للسنة
 * ============================================================ */

export const AR_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const EN_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** تحويل 'Jan' أو رقم الشهر إلى اسم عربي — تنسيق فقط للقيم القادمة من الـAPI */
export const arMonth = (m: string | number) => {
  const i = EN_MONTHS.indexOf(
    String(m || '')
      .trim()
      .slice(0, 3)
  );
  if (i >= 0) return AR_MONTHS[i];
  const n = Number(m);
  if (Number.isInteger(n) && n >= 0 && n < 12) return AR_MONTHS[n];
  return String(m || '—');
};

export type Bucket = {
  key: string;
  label: string;
  revenue?: number;
  expenses?: number;
  income?: number;
  outcome?: number;
};

export function buildBuckets(p: PeriodKey, range: DateRange): Bucket[] {
  if (p === 'today') {
    return Array.from({ length: 24 }, (_, h) => ({
      key: String(h),
      label: `${String(h).padStart(2, '0')}:00`,
    }));
  }
  if (p === 'year') {
    return AR_MONTHS.map((label, i) => ({ key: String(i), label }));
  }
  const out: Bucket[] = [];
  const start = new Date(`${range.from}T00:00:00Z`);
  const end = new Date(`${range.to}T00:00:00Z`);
  for (let d = new Date(start); d <= end && out.length < 400; d.setUTCDate(d.getUTCDate() + 1)) {
    const k = d.toISOString().split('T')[0];
    out.push({ key: k, label: `${d.getUTCDate()}/${d.getUTCMonth() + 1}` });
  }
  return out;
}

/** مفتاح الحاوية الزمنية لأي عنصر مؤرّخ */
export function bucketKeyOf(dateStr: string | undefined | null, p: PeriodKey): string {
  const s = String(dateStr || '');
  if (!s) return '';
  if (p === 'today') {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '' : String(d.getUTCHours());
  }
  if (p === 'year') {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '' : String(d.getUTCMonth());
  }
  return s.split('T')[0].slice(0, 10);
}

/** توزيع عناصر مؤرخة على الحاويات — تجميع حقيقي من البيانات فقط */
export function fillBuckets<T>(
  items: T[],
  buckets: Bucket[],
  p: PeriodKey,
  field: 'revenue' | 'expenses' | 'income' | 'outcome',
  getDate: (x: T) => string,
  getValue: (x: T) => number
): void {
  for (const it of items) {
    const k = bucketKeyOf(getDate(it), p);
    if (!k) continue;
    const b = buckets.find((x) => x.key === k);
    if (b) b[field] = Number(b[field] || 0) + Number(getValue(it) || 0);
  }
}

/* ============================================================
 * كارت مؤشر KPI
 * ============================================================ */

export function KpiCard({
  icon: Icon,
  iconClass,
  label,
  value,
  valueClass = 'text-slate-900',
  sub,
  trendPct,
}: {
  icon: LucideIcon;
  iconClass?: string;
  label: string;
  value: string;
  valueClass?: string;
  sub?: React.ReactNode;
  trendPct?: number | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
        <Icon size={13} className={iconClass} /> {label}
      </p>
      <p className={`text-lg font-black ${valueClass}`}>{value}</p>
      {typeof trendPct === 'number' && Number.isFinite(trendPct) && (
        <p
          className={`text-[11px] font-bold mt-0.5 ${
            trendPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {trendPct >= 0 ? '↑' : '↓'} {Math.abs(trendPct).toFixed(1)}% عن الفترة السابقة
        </p>
      )}
      {sub && <p className="text-[11px] font-bold text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ============================================================
 * حالات — هيكل تحميل وحالات فراغ
 * ============================================================ */

export function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="h-3 w-20 bg-slate-100 rounded-full animate-pulse mb-3" />
            <div className="h-5 w-28 bg-slate-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-[300px] bg-white rounded-xl border border-slate-200 animate-pulse" />
        <div className="h-[300px] bg-white rounded-xl border border-slate-200 animate-pulse" />
      </div>
      <div className="h-[260px] bg-white rounded-xl border border-slate-200 animate-pulse" />
    </div>
  );
}

export function EmptyCard({ title = 'لا توجد بيانات', hint }: { title?: string; hint?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <Inbox size={32} className="mx-auto mb-3 text-slate-300" />
      <p className="text-slate-400 font-bold text-sm">{title}</p>
      {hint && <p className="text-slate-400 text-xs mt-1.5 font-semibold">{hint}</p>}
    </div>
  );
}

export function ChartEmpty({ hint }: { hint?: string }) {
  return (
    <div className="h-full min-h-[160px] flex flex-col items-center justify-center gap-1.5 py-8">
      <Inbox size={26} className="text-slate-200" />
      <p className="text-slate-400 font-bold text-xs">لا توجد بيانات</p>
      {hint && <p className="text-slate-300 text-[11px] font-semibold">{hint}</p>}
    </div>
  );
}

/** بطاقة رسم بياني موحّدة */
export function ChartCard({
  title,
  sub,
  className = '',
  children,
}: {
  title: string;
  sub?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-[13px] font-black text-slate-800">{title}</h3>
        {sub && <span className="text-[11px] font-bold text-slate-400">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

/* ============================================================
 * رسوم recharts — نفس ستايل الصفحة الرئيسية (محاور/Tooltip)
 * ============================================================ */

const AXIS_STYLE = { fontSize: 10, fill: '#94A3B8', fontWeight: 600 };
export const DONUT_PALETTE = [
  '#00E5FF',
  '#0EA5E9',
  '#6366F1',
  '#10B981',
  '#F59E0B',
  '#F43F5E',
  '#8B5CF6',
  '#94A3B8',
];

function AreaTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 shadow-lg text-[11px] font-bold"
      dir="rtl"
    >
      <div className="text-slate-300 mb-0.5">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: p.color || p.stroke }}
          />
          <span>{p.name}:</span>
          <span dir="ltr" className="tabular-nums">
            {fmt2(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** AreaChart بسلسلتين (أ/ب) — يستخدمه تبوبا المالية والمدفوعات */
export function DualAreaChart({
  data,
  aName,
  bName,
  aColor,
  bColor,
  gid,
  height = 240,
}: {
  data: Array<{ label: string; a: number; b: number }>;
  aName: string;
  bName: string;
  aColor: string;
  bColor: string;
  gid: string;
  height?: number;
}) {
  if (!data.length) return <ChartEmpty />;
  return (
    <div style={{ height }} dir="ltr" className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RAreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={aColor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={aColor} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={bColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EEF1F6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
            reversed
          />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            width={52}
            orientation="right"
            tickFormatter={compactNum}
          />
          <RTooltip content={<AreaTip />} cursor={{ stroke: '#E2E8F0' }} />
          <RArea
            type="monotone"
            dataKey="a"
            name={aName}
            stroke={aColor}
            strokeWidth={2.5}
            fill={`url(#${gid}-a)`}
            activeDot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: aColor }}
            animationDuration={450}
          />
          <RArea
            type="monotone"
            dataKey="b"
            name={bName}
            stroke={bColor}
            strokeWidth={2}
            fill={`url(#${gid}-b)`}
            animationDuration={450}
          />
        </RAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProfitTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0]?.value || 0);
  return (
    <div
      className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 shadow-lg text-[11px] font-bold whitespace-nowrap"
      dir="rtl"
    >
      <span className="text-slate-400 font-semibold">{label} — </span>
      <span dir="ltr" className="tabular-nums">
        {v >= 0 ? '' : '-'}
        {fmt2(Math.abs(v))}
      </span>
    </div>
  );
}

/** BarChart صافي الربح لكل فترة — أخضر للربح وأحمر للخسارة */
export function ProfitBars({
  data,
  height = 220,
}: {
  data: Array<{ label: string; profit: number }>;
  height?: number;
}) {
  if (!data.length) return <ChartEmpty />;
  return (
    <div style={{ height }} dir="ltr" className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="#EEF1F6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
            reversed
          />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            width={52}
            orientation="right"
            tickFormatter={compactNum}
          />
          <RTooltip content={<ProfitTip />} cursor={{ fill: '#F1F5F9' }} />
          <ReferenceLine y={0} stroke="#CBD5E1" />
          <RBar dataKey="profit" name="صافي الربح" radius={[4, 4, 0, 0]} animationDuration={450}>
            {data.map((d, i) => (
              <Cell key={i} fill={Number(d.profit) >= 0 ? '#00B8CC' : '#F43F5E'} />
            ))}
          </RBar>
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DonutTip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload || {};
  const v = Number(p.value || 0);
  const pct = total > 0 ? Math.round((v / total) * 100) : 0;
  return (
    <div
      className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 shadow-lg text-[11px] font-bold whitespace-nowrap"
      dir="rtl"
    >
      <span>{p.name}: </span>
      <span dir="ltr" className="tabular-nums">
        {fmt2(v)}
      </span>
      {pct > 0 && <span> ({pct}%)</span>}
    </div>
  );
}

/** دونات مع قائمة تفصيلية — من بيانات حقيقية فقط (تُستدعى ببيانات غير فارغة) */
export function Donut({
  data,
  centerValue,
  centerLabel,
}: {
  data: Array<{ name: string; value: number }>;
  centerValue: string;
  centerLabel: string;
}) {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  return (
    <div>
      <div className="relative h-[180px]" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <RPieChart>
            <RPie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={56}
              outerRadius={82}
              paddingAngle={data.length > 1 ? 2 : 0}
              strokeWidth={0}
              animationDuration={450}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={DONUT_PALETTE[i % DONUT_PALETTE.length]} />
              ))}
            </RPie>
            <RTooltip content={<DonutTip total={total} />} />
          </RPieChart>
        </ResponsiveContainer>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          dir="rtl"
        >
          <span className="text-sm font-black text-slate-900 tabular-nums" dir="ltr">
            {centerValue}
          </span>
          <span className="text-[10px] font-bold text-slate-400">{centerLabel}</span>
        </div>
      </div>
      <div className="mt-2 space-y-1.5 max-h-[190px] overflow-y-auto pl-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-slate-600 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: DONUT_PALETTE[i % DONUT_PALETTE.length] }}
              />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="font-black text-slate-800 tabular-nums" dir="ltr">
                {fmt2(d.value)}
              </span>
              <span className="text-[10px] font-bold text-slate-400 tabular-nums w-8 text-left">
                {total > 0 ? Math.round((Number(d.value) / total) * 100) : 0}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 * تصدير CSV — تفويض لمحرك التصدير الموحد (BOM + escaping كامل)
 * ============================================================ */

export async function downloadCSV(name: string, headers: string[], rows: (string | number)[][]) {
  const { buildExportBlob, downloadBlob } = await import('@/lib/export');
  const blob = buildExportBlob({ filename: name, headers, rows }, 'csv');
  downloadBlob(blob, name.endsWith('.csv') ? name : `${name}.csv`);
}
