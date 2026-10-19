'use client';

/**
 * تاب العمليات — كفاءة التشغيل من الطلبات الفعلية: توزيع الطلبات على
 * ساعات اليوم (الذروة)، أيام الأسبوع، المصادر (موقع/كاشير/فاتورة)،
 * ومعدل الإلغاء. كل الأرقام من بيانات حقيقية فقط.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BarChart as RBarChart,
  Bar as RBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from 'recharts';
import { ShoppingBag, Receipt, XCircle, Flame, PackageSearch } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import {
  KpiCard,
  ChartCard,
  SectionSkeleton,
  ChartEmpty,
  Donut,
  downloadCSV,
  egp,
  periodRange,
  inPeriod,
  type PeriodKey,
} from './financeShared';

const LOCALE = 'ar-EG-u-nu-latn';
const fmtNum = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 });

const AR_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const SOURCE_LABELS: Record<string, string> = {
  pos: 'الكاشير',
  manual: 'فاتورة يدوية',
  website: 'الموقع',
  web: 'الموقع',
};

const labelOf = (s: string) =>
  SOURCE_LABELS[String(s || '').toLowerCase()] || String(s || 'الموقع');

export default function OperationsSection({
  period,
  refreshKey,
  registerExport,
}: {
  period: PeriodKey;
  refreshKey: number;
  registerExport: (fn: (() => void) | null) => void;
  searchQuery?: string;
}) {
  const { shop } = useShop();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const shopId = shop?.id;
    if (!shopId) return;
    setError('');
    try {
      const res = await apiRequest(`/shops/${shopId}/orders`);
      setOrders(Array.isArray(res) ? res : res?.orders || []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل بيانات العمليات');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const range = periodRange(period);

  /** طلبات الفترة المختارة (بدون الملغي/المسترجع في متوسطات القيمة) */
  const periodOrders = useMemo(
    () => orders.filter((o) => inPeriod(o?.createdAt || o?.created_at, range)),
    [orders, range]
  );

  const activeOrders = useMemo(
    () =>
      periodOrders.filter(
        (o) =>
          !['CANCELLED', 'REFUNDED', 'RETURNED'].includes(String(o?.status || '').toUpperCase())
      ),
    [periodOrders]
  );

  const aov = useMemo(() => {
    if (activeOrders.length === 0) return null;
    const total = activeOrders.reduce((s, o) => s + Number(o?.total || 0), 0);
    return total / activeOrders.length;
  }, [activeOrders]);

  const cancelRate = useMemo(() => {
    if (periodOrders.length === 0) return null;
    const cancelled = periodOrders.filter(
      (o) => String(o?.status || '').toUpperCase() === 'CANCELLED'
    ).length;
    return (cancelled / periodOrders.length) * 100;
  }, [periodOrders]);

  /** توزيع الطلبات على ساعات اليوم — من createdAt الحقيقية */
  const hourBars = useMemo(() => {
    const counts = Array.from({ length: 24 }, () => 0);
    for (const o of periodOrders) {
      const d = new Date(o?.createdAt || o?.created_at || '');
      if (Number.isNaN(d.getTime())) continue;
      counts[d.getHours()] += 1;
    }
    return counts.map((v, h) => ({ label: `${String(h).padStart(2, '0')}:00`, orders: v }));
  }, [periodOrders]);

  const peakHour = useMemo(() => {
    let best = -1;
    let bestCount = 0;
    for (const h of hourBars) {
      if (h.orders > bestCount) {
        bestCount = h.orders;
        best = hourBars.indexOf(h);
      }
    }
    return bestCount > 0 ? hourBars[best] : null;
  }, [hourBars]);

  const weekdayBars = useMemo(() => {
    const counts = Array.from({ length: 7 }, () => 0);
    for (const o of periodOrders) {
      const d = new Date(o?.createdAt || o?.created_at || '');
      if (Number.isNaN(d.getTime())) continue;
      counts[d.getDay()] += 1;
    }
    return counts.map((v, i) => ({ label: AR_WEEKDAYS[i], orders: v }));
  }, [periodOrders]);

  const sourceDonut = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of periodOrders) {
      const k = labelOf(String(o?.source || ''));
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [periodOrders]);

  useEffect(() => {
    if (loading || periodOrders.length === 0) {
      registerExport(null);
      return;
    }
    registerExport(() =>
      downloadCSV(
        'operations-hours.csv',
        ['Hour', 'Orders'],
        hourBars.map((h) => [h.label, h.orders])
      )
    );
    return () => registerExport(null);
  }, [hourBars, periodOrders.length, loading, registerExport]);

  if (loading) return <SectionSkeleton />;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={ShoppingBag}
          label="إجمالي الطلبات"
          value={fmtNum(periodOrders.length)}
          sub={`فعّال: ${fmtNum(activeOrders.length)}`}
        />
        <KpiCard icon={Receipt} label="متوسط قيمة الطلب" value={aov !== null ? egp(aov) : '—'} />
        <KpiCard
          icon={XCircle}
          label="معدل الإلغاء"
          value={cancelRate !== null ? `${fmtNum(Math.round(cancelRate * 10) / 10)}%` : '—'}
          valueClass={cancelRate !== null && cancelRate > 10 ? 'text-red-600' : 'text-slate-900'}
        />
        <KpiCard
          icon={Flame}
          label="ساعة الذروة"
          value={peakHour ? peakHour.label : '—'}
          sub={peakHour ? `${fmtNum(peakHour.orders)} طلب` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ساعات الذروة */}
        <div className="lg:col-span-2">
          <ChartCard title="توزيع الطلبات على مدار اليوم" sub="ساعات الذروة من وقت إنشاء الطلب">
            {periodOrders.length > 0 ? <HourBars data={hourBars} /> : <ChartEmpty />}
          </ChartCard>
        </div>

        {/* حسب المصدر */}
        <ChartCard title="الطلبات حسب المصدر">
          {sourceDonut.length > 0 ? (
            <Donut data={sourceDonut} centerValue={fmtNum(periodOrders.length)} centerLabel="طلب" />
          ) : (
            <ChartEmpty />
          )}
        </ChartCard>
      </div>

      {/* أيام الأسبوع */}
      <ChartCard title="الطلبات حسب يوم الأسبوع">
        {periodOrders.length > 0 ? <WeekdayBars data={weekdayBars} /> : <ChartEmpty />}
      </ChartCard>

      {/* ملحوظة للبيانات الناقصة */}
      {periodOrders.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <PackageSearch size={26} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-500">مفيش طلبات في الفترة دي</p>
          <p className="text-xs text-slate-400 mt-1">
            جرّب توسّع الفترة من الفلتر فوق — التحليلات بتتحدث فورًا
          </p>
        </div>
      )}
    </div>
  );
}

const AXIS_STYLE = { fontSize: 10, fill: '#94A3B8', fontWeight: 600 };
const compact = (v: number) => String(Math.round(Number(v || 0)));

const countTip =
  (unit: string) =>
  ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 shadow-lg text-[11px] font-bold whitespace-nowrap"
        dir="rtl"
      >
        <span className="text-slate-400 font-semibold">{label} — </span>
        <span dir="ltr" className="tabular-nums">
          {payload[0].value} {unit}
        </span>
      </div>
    );
  };

function HourBars({ data }: { data: Array<{ label: string; orders: number }> }) {
  return (
    <div style={{ height: 240 }} dir="ltr" className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="#EEF1F6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={12}
            reversed
          />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            width={40}
            orientation="right"
            tickFormatter={compact}
            allowDecimals={false}
          />
          <RTooltip content={countTip('طلب')} cursor={{ fill: '#F1F5F9' }} />
          <RBar
            dataKey="orders"
            name="طلبات"
            fill="#00B8CC"
            radius={[4, 4, 0, 0]}
            animationDuration={450}
          />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeekdayBars({ data }: { data: Array<{ label: string; orders: number }> }) {
  return (
    <div style={{ height: 220 }} dir="ltr" className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="#EEF1F6" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} reversed />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            width={40}
            orientation="right"
            tickFormatter={compact}
            allowDecimals={false}
          />
          <RTooltip content={countTip('طلب')} cursor={{ fill: '#F1F5F9' }} />
          <RBar
            dataKey="orders"
            name="طلبات"
            fill="#6366F1"
            radius={[4, 4, 0, 0]}
            animationDuration={450}
          />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
