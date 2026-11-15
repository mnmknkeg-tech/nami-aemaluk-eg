'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart as RAreaChart,
  Area as RArea,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, ChevronLeft, EyeOff, TrendingDown, TrendingUp } from 'lucide-react';
import { chartColors, shadows, cardClass } from '@/lib/ui/tokens';
import { fmtNum, LOCALE } from './helpers';

/* ============================================================
 * Overview UI — charts + card primitives + empty/delta states.
 * ============================================================ */

/* ============================================================
 * Tiny sparkline (SVG polyline)
 * ============================================================ */

const AXIS_STYLE = { fontSize: 10, fill: chartColors.axis, fontWeight: 600 };

function TrendTooltip({ active, payload, label, format }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 shadow-lg text-[11px] font-bold whitespace-nowrap">
      <span className="text-slate-400 font-semibold">{label} — </span>
      {format(payload[0].value)}
    </div>
  );
}

/** سباركلاين مصغّر لكروت المؤشرات (Recharts Area) */
export function Sparkline({
  values,
  color = chartColors.revenue,
}: {
  values: number[];
  color?: string;
}) {
  const data = (values || []).map((v, i) => ({ i, v }));
  if (data.length < 2) return null;
  const gid = `spark-${color.replace('#', '')}`;
  return (
    <div className="w-16 h-7" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <RAreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <RArea
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gid})`}
          />
        </RAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** دونات توزيع حالات الطلبات — من بيانات الطلبات الحقيقية */
export function StatusDonut({
  data,
  total,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  total: number;
}) {
  const shown = data.length > 0 ? data : [{ name: 'لا طلبات', value: 1, color: '#F1F5F9' }];
  return (
    <div className="relative h-[170px]" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={shown}
            dataKey="value"
            innerRadius={56}
            outerRadius={80}
            paddingAngle={data.length > 1 ? 2 : 0}
            strokeWidth={0}
            animationDuration={450}
          >
            {shown.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <RTooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length || data.length === 0) return null;
              const p = payload[0].payload;
              return (
                <div className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 shadow-lg text-[11px] font-bold whitespace-nowrap">
                  {p.name}: {fmtNum(p.value)} ({total > 0 ? Math.round((p.value / total) * 100) : 0}
                  %)
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        dir="rtl"
      >
        <span className="text-xl font-extrabold text-slate-900 tabular-nums leading-6">
          {fmtNum(total)}
        </span>
        <span className="text-[10px] font-semibold text-slate-400">طلب</span>
      </div>
    </div>
  );
}

/* ============================================================
 * Big area chart (hand-rolled SVG, smooth curve + gradient)
 * ============================================================ */

/** الرسم الرئيسي — أداء المتجر (منحنى ناعم + gradient + tooltip) */
export function PerformanceAreaChart({
  data,
  color,
  formatY,
  formatTip,
}: {
  data: Array<{ x: string; y: number }>;
  color: string;
  formatY: (n: number) => string;
  formatTip: (n: number) => string;
}) {
  if (!data || data.length < 2) {
    return (
      <div className="h-[260px] flex flex-col items-center justify-center gap-2.5">
        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
          <BarChart3 size={24} />
        </div>
        <p className="text-sm font-bold text-slate-500">لا توجد مبيعات في هذه الفترة بعد</p>
        <p className="text-[11px] font-medium text-slate-400">
          أول عملية بيع سترسم المنحنى هنا تلقائيًا.
        </p>
      </div>
    );
  }
  return (
    <div className="h-[260px] w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <RAreaChart data={data} margin={{ top: 10, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis
            dataKey="x"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
            reversed
          />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatY}
            width={46}
            orientation="right"
          />
          <RTooltip
            content={<TrendTooltip format={formatTip} />}
            cursor={{ stroke: chartColors.cursor }}
          />
          <RArea
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={2.5}
            fill="url(#perfFill)"
            activeDot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: color }}
            animationDuration={450}
          />
        </RAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================
 * UI primitives — نظام موحد للكروت والحالات
 * ============================================================ */

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`${cardClass} ${className}`}>{children}</div>;
}

/** كارت بحركة ظهور ناعمة + رفع خفيف عند الـ hover */
export function MotionCard({
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
      className={`${cardClass} transition-shadow duration-200 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />;
}

export function SectionHead({
  title,
  sub,
  icon,
  actionLabel,
  onAction,
}: {
  title: string;
  sub?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
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
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5 shrink-0"
        >
          {actionLabel} <ChevronLeft size={12} />
        </button>
      )}
    </div>
  );
}

/** الزر الصغير جدًا في رُكن كل قسم — ضغطة واحدة تخفي القسم */
export function SectionHideButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="إخفاء هذا القسم"
      aria-label="إخفاء هذا القسم"
      className="absolute top-2 left-2 z-20 w-5 h-5 rounded-md flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all"
    >
      <EyeOff size={11} />
    </button>
  );
}

export function Empty({
  icon,
  title,
  desc,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
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
      <div className="flex items-center gap-2 mt-1.5">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="h-8 px-3.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 transition-colors"
          >
            {actionLabel}
          </button>
        )}
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="h-8 px-3.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition-colors"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function DeltaInline({ delta }: { delta: number | null }) {
  if (delta === null || !Number.isFinite(delta))
    return <span className="text-[10px] font-semibold text-slate-300">—</span>;
  const up = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold tabular-nums rounded-full px-1.5 py-0.5 ${up ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}
    >
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(delta).toLocaleString(LOCALE, { maximumFractionDigits: 1 })}%
    </span>
  );
}
