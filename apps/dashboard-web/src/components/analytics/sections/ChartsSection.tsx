'use client';

/**
 * تاب الرسوم البيانية — رسوم recharts من بيانات حقيقية فقط:
 * - AreaChart: المبيعات خلال الفترة ← /analytics/shop/:id/sales-report?time_range=…
 *   (وبديلاً: تجميع يومي/ساعي من /orders/me عند غياب الترند)
 * - BarChart: الطلبات حسب يوم الأسبوع ← /orders/me (وبديلاً: تواريخ الترند)
 * - Donut: الطلبات حسب الحالة ← /orders/me
 * - Donut: الزيارات حسب المصدر ← /analytics/shop/:id/traffic?time_range=…
 * كل رسم له حالة فراغ عربية عند غياب البيانات — بدون أي أرقام وهمية.
 */
import React, { useEffect, useMemo, useState } from 'react';
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
} from 'recharts';
import { apiRequest } from '@/lib/auth';
import {
  type PeriodKey,
  periodRange,
  periodLabel,
  buildBuckets,
  fillBuckets,
  compactNum,
  fmt,
  ChartCard,
  SectionSkeleton,
  EmptyCard,
  ChartEmpty,
  Donut,
  downloadCSV,
} from './financeShared';

/* ===== أنواع الاستجابات — مطابقة لـ gobackend/internal/domains/analytics ===== */
type SalesTrendPoint = { date: string; revenue: number; orders: number };
type SalesReportData = { trend?: SalesTrendPoint[] };
type TrafficSource = { source?: string; source_ar?: string; visits?: number; percentage?: number };
type TrafficData = { total_visitors?: number; sources?: TrafficSource[] };
type OrderRow = { id?: string; total?: number; status?: string; createdAt?: string };

/** فترة الفلتر ← time_range المسموحة في باك-إند التحليلات */
const TIME_RANGE_BY_PERIOD: Record<PeriodKey, string> = {
  today: 'today',
  d7: 'last_7_days',
  d30: 'last_30_days',
  month: 'this_month',
  year: 'this_year',
};

/** تسميات أيام الأسبوع بالعربية — index يطابق getUTCDay() */
const WEEKDAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** تسميات حالات الطلب — نفس قيم OrderStatus في باك-إند الطلبات */
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  CONFIRMED: 'مؤكد',
  PREPARING: 'قيد التحضير',
  READY: 'جاهز',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
  REFUNDED: 'مسترجع',
};

const orderTotalOf = (o: any) => Number(o?.total || 0);
const orderDateOf = (o: any) => String(o?.createdAt || '');

/** استخراج موحّد للاستجابات — نفس نمط صفحة المالية */
const settledData = (r: PromiseSettledResult<any>): any =>
  r.status === 'fulfilled' ? (r.value?.data !== undefined ? r.value.data : r.value) : null;
const settledList = (r: PromiseSettledResult<any>): any[] => {
  const v = settledData(r);
  return Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];
};

const AXIS_STYLE = { fontSize: 10, fill: '#94A3B8', fontWeight: 600 } as const;

/** تسمية يوم للتاريخ — 18/9 */
const dayLabel = (iso: string) => {
  const s = String(iso || '');
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
};

/* ===== Tooltips — معرّفة على مستوى الموديول لتجنّب إعادة التركيب ===== */
const SalesTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as { revenue?: number; orders?: number } | undefined;
  if (!p) return null;
  return (
    <div
      className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 shadow-lg text-[11px] font-bold"
      dir="rtl"
    >
      <div className="text-slate-300 mb-0.5">{label}</div>
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span>الإيراد:</span>
        <span dir="ltr" className="tabular-nums">
          {fmt(p.revenue || 0)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span>الطلبات:</span>
        <span dir="ltr" className="tabular-nums">
          {fmt(p.orders || 0)}
        </span>
      </div>
    </div>
  );
};

const WeekdayTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as { day?: string; orders?: number } | undefined;
  if (!p) return null;
  return (
    <div
      className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 shadow-lg text-[11px] font-bold whitespace-nowrap"
      dir="rtl"
    >
      <span>{p.day}: </span>
      <span dir="ltr" className="tabular-nums">
        {fmt(p.orders || 0)}
      </span>{' '}
      <span>طلب</span>
    </div>
  );
};

export type ChartsSectionProps = {
  period: PeriodKey;
  /** يتغير عند الضغط على «تحديث» — إعادة جلب مع تغيّره */
  refreshKey?: number;
  /** تسجيل زر تصدير CSV في شريط أدوات الصفحة */
  registerExport?: (fn: (() => void) | null) => void;
};

export default function ChartsSection({ period, refreshKey, registerExport }: ChartsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SalesReportData | null>(null);
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const shop = await apiRequest('/shops/me');
        const sid = shop?.id;
        if (!sid || cancelled) return;
        const cur = periodRange(period);
        const tr = TIME_RANGE_BY_PERIOD[period] || 'last_30_days';
        const ordQ = `/orders/me?limit=200&from=${encodeURIComponent(`${cur.from}T00:00:00Z`)}&to=${encodeURIComponent(`${cur.to}T23:59:59Z`)}`;
        const [reportRes, trafficRes, ordRes] = await Promise.allSettled([
          apiRequest(`/analytics/shop/${sid}/sales-report?time_range=${tr}`),
          apiRequest(`/analytics/shop/${sid}/traffic?time_range=${tr}`),
          apiRequest(ordQ),
        ]);
        if (cancelled) return;
        setReport(settledData(reportRes));
        setTraffic(settledData(trafficRes));
        setOrders(settledList(ordRes));
      } catch {
        if (!cancelled) {
          setReport(null);
          setTraffic(null);
          setOrders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, refreshKey]);

  const cur = useMemo(() => periodRange(period), [period]);

  /* ===== المبيعات عبر الفترة — ترند التقرير، وبديلاً تجميع الطلبات ===== */
  const trendData = useMemo(
    () =>
      (report?.trend || []).map((t) => ({
        label: dayLabel(t.date),
        revenue: Number(t.revenue) || 0,
        orders: Number(t.orders) || 0,
      })),
    [report]
  );

  const bucketTrend = useMemo(() => {
    const bs = buildBuckets(period, cur);
    fillBuckets(orders, bs, period, 'revenue', orderDateOf, orderTotalOf);
    fillBuckets(orders, bs, period, 'income', orderDateOf, () => 1); // عدد الطلبات
    return bs.map((b) => ({
      label: b.label,
      revenue: Number(b.revenue || 0),
      orders: Number(b.income || 0),
    }));
  }, [period, cur, orders]);

  const salesData = useMemo(
    () => (trendData.some((d) => d.revenue > 0 || d.orders > 0) ? trendData : bucketTrend),
    [trendData, bucketTrend]
  );
  const salesHasData = salesData.some((d) => d.revenue > 0 || d.orders > 0);

  /* ===== الطلبات حسب يوم الأسبوع — من الطلبات، وبديلاً من تواريخ الترند ===== */
  const weekdayData = useMemo(() => {
    const counts = new Array(7).fill(0) as number[];
    if (orders.length > 0) {
      for (const o of orders) {
        const d = new Date(o?.createdAt || '');
        if (!Number.isNaN(d.getTime())) counts[d.getUTCDay()] += 1;
      }
    } else {
      for (const t of report?.trend || []) {
        const d = new Date(t?.date || '');
        if (!Number.isNaN(d.getTime())) counts[d.getUTCDay()] += Number(t.orders) || 0;
      }
    }
    return WEEKDAY_LABELS.map((day, i) => ({ day, orders: counts[i] }));
  }, [orders, report]);
  const ordersCount = useMemo(
    () =>
      orders.length > 0
        ? orders.length
        : (report?.trend || []).reduce((s, t) => s + (Number(t.orders) || 0), 0),
    [orders, report]
  );

  /* ===== الطلبات حسب الحالة ===== */
  const statusData = useMemo(() => {
    if (orders.length === 0) return [];
    const counts = new Map<string, number>();
    for (const o of orders) {
      const s = String(o?.status || 'PENDING').toUpperCase();
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([status, count]) => ({ name: STATUS_LABELS[status] || status, value: count }))
      .sort((a, b) => b.value - a.value);
  }, [orders]);

  /* ===== الزيارات حسب المصدر ===== */
  const trafficData = useMemo(
    () =>
      (traffic?.sources || [])
        .map((s) => ({
          name: s.source_ar || s.source || 'مصدر غير معروف',
          value: Number(s.visits) || 0,
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [traffic]
  );
  const trafficTotal = useMemo(
    () => trafficData.reduce((s, d) => s + d.value, 0) || Number(traffic?.total_visitors) || 0,
    [trafficData, traffic]
  );

  const hasAnyData = salesHasData || ordersCount > 0 || trafficTotal > 0;

  /* ===== تصدير CSV — يُسجَّل في شريط أدوات الصفحة ===== */
  useEffect(() => {
    if (!registerExport) return;
    if (loading || !hasAnyData) {
      registerExport(null);
      return () => registerExport(null);
    }
    const fn = () => {
      const rows: (string | number)[][] = [];
      salesData.forEach((d) => rows.push(['مبيعات الفترة', d.label, d.revenue, d.orders]));
      weekdayData.forEach((w) => rows.push(['طلبات يوم الأسبوع', w.day, '', w.orders]));
      statusData.forEach((s) => rows.push(['حالة الطلب', s.name, '', s.value]));
      trafficData.forEach((t) => rows.push(['زيارات حسب المصدر', t.name, '', t.value]));
      downloadCSV('charts-insights.csv', ['النوع', 'البيان', 'الإيراد (ج.م)', 'العدد'], rows);
    };
    registerExport(fn);
    return () => registerExport(null);
  }, [registerExport, loading, hasAnyData, salesData, weekdayData, statusData, trafficData]);

  if (loading) return <SectionSkeleton />;

  if (!hasAnyData) {
    return (
      <EmptyCard
        title="لا توجد بيانات"
        hint="لم تُسجَّل مبيعات أو زيارات في هذه الفترة — جرّب اختيار فترة زمنية أطول من الفلتر بالأعلى"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== المبيعات خلال الفترة — AreaChart ===== */}
      <ChartCard title="المبيعات خلال الفترة" sub={periodLabel(period)}>
        {salesHasData ? (
          <div style={{ height: 260 }} dir="ltr" className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RAreaChart data={salesData} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="insights-sales-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity={0.02} />
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
                <RTooltip content={<SalesTooltip />} cursor={{ stroke: '#E2E8F0' }} />
                <RArea
                  type="monotone"
                  dataKey="revenue"
                  name="الإيراد"
                  stroke="#00E5FF"
                  strokeWidth={2.5}
                  fill="url(#insights-sales-grad)"
                  activeDot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#00E5FF' }}
                  animationDuration={450}
                />
              </RAreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartEmpty hint="المبيعات تظهر بعد أول طلب مؤكد" />
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ===== الطلبات حسب يوم الأسبوع — BarChart ===== */}
        <ChartCard title="الطلبات حسب يوم الأسبوع" sub={`${fmt(ordersCount)} طلب`}>
          {ordersCount > 0 ? (
            <div style={{ height: 220 }} dir="ltr" className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RBarChart data={weekdayData} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={AXIS_STYLE}
                    axisLine={false}
                    tickLine={false}
                    reversed
                  />
                  <YAxis
                    tick={AXIS_STYLE}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    orientation="right"
                    allowDecimals={false}
                  />
                  <RTooltip content={<WeekdayTooltip />} cursor={{ fill: '#F1F5F9' }} />
                  <RBar
                    dataKey="orders"
                    name="الطلبات"
                    fill="#00E5FF"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                    animationDuration={450}
                  />
                </RBarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartEmpty hint="لم تُسجَّل طلبات في هذه الفترة" />
          )}
        </ChartCard>

        {/* ===== الطلبات حسب الحالة — Donut ===== */}
        <ChartCard
          title="الطلبات حسب الحالة"
          sub={statusData.length > 0 ? `${fmt(ordersCount)} طلب` : undefined}
        >
          {statusData.length > 0 ? (
            <Donut data={statusData} centerValue={fmt(ordersCount)} centerLabel="طلب" />
          ) : (
            <ChartEmpty hint="لم تُسجَّل طلبات في هذه الفترة" />
          )}
        </ChartCard>
      </div>

      {/* ===== الزيارات حسب المصدر — Donut ===== */}
      <ChartCard
        title="الزيارات حسب المصدر"
        sub={trafficTotal > 0 ? `${fmt(trafficTotal)} زيارة` : undefined}
      >
        {trafficData.length > 0 ? (
          <Donut data={trafficData} centerValue={fmt(trafficTotal)} centerLabel="زيارة" />
        ) : (
          <ChartEmpty hint="بيانات الزيارات تظهر بعد أول زيارة مسجَّلة للمتجر" />
        )}
      </ChartCard>
    </div>
  );
}
