'use client';

/**
 * تاب المؤشرات (KPIs) — بطاقات مقاييس حقيقية من تحليلات المتجر:
 * - /analytics/shop/:id/sales-report?time_range=…      ← ترند الإيراد/الطلبات + المنتجات المباعة
 * - /analytics/shop/:id/customer-insights?time_range=… ← العملاء والعملاء الجدد
 * - /analytics/shop/:id/traffic?time_range=…           ← زوار الفترة (نحسب منه معدل التحويل)
 * - /orders/me?from&to                                 ← الفترة الحالية والسابقة لنسب التغير
 * نسبة التغير تُحسب مقابل الفترة السابقة من قوائم الطلبات الحقيقية، ومع غيابها
 * من نصفي الترند بنفس أسلوب الباك-إند. خط الاتجاه المصغّر يظهر فقط حيث توجد
 * سلسلة زمنية حقيقية — بدون أي أرقام وهمية.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import {
  DollarSign,
  ShoppingCart,
  Receipt,
  Eye,
  Target,
  Package,
  Users,
  UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import {
  type PeriodKey,
  periodRange,
  prevPeriodRange,
  periodLabel,
  buildBuckets,
  fillBuckets,
  fmt,
  egp,
  KpiCard,
  SectionSkeleton,
  EmptyCard,
  downloadCSV,
} from './financeShared';

/* ===== أنواع الاستجابات — مطابقة لـ gobackend/internal/domains/analytics ===== */
type SalesTrendPoint = { date: string; revenue: number; orders: number };
type SalesReportStat = { label?: string; label_ar?: string; value?: string };
type SalesReportData = { stats?: SalesReportStat[]; trend?: SalesTrendPoint[] };
type CustomerInsightsData = {
  total_customers?: number;
  new_customers?: number;
  returning_customers?: number;
};
type TrafficData = { total_visitors?: number; unique_visitors?: number };
type OrderRow = {
  id?: string;
  total?: number;
  createdAt?: string;
  customerId?: string | null;
  userId?: string;
  customerPhone?: string | null;
};

/** فترة الفلتر ← time_range المسموحة في باك-إند التحليلات */
const TIME_RANGE_BY_PERIOD: Record<PeriodKey, string> = {
  today: 'today',
  d7: 'last_7_days',
  d30: 'last_30_days',
  month: 'this_month',
  year: 'this_year',
};

const orderTotalOf = (o: any) => Number(o?.total || 0);
const orderDateOf = (o: any) => String(o?.createdAt || '');
/** مفتاح العميل — عميل مركزي أو مستخدم أو هاتف */
const customerKeyOf = (o: any) =>
  String(o?.customerId || o?.userId || o?.customerPhone || o?.id || '');

const sumOf = (rows: any[], f: (x: any) => number) => rows.reduce((s, x) => s + f(x), 0);
const uniqueCount = (rows: any[], keyOf: (x: any) => string) => {
  const set = new Set<string>();
  for (const r of rows) {
    const k = keyOf(r);
    if (k) set.add(k);
  }
  return set.size;
};

/** نسبة التغير بين نصفَي سلسلة — نفس أسلوب الباك-إند في تقارير الأداء */
const halfChange = (series: number[]): number | null => {
  if (!series.length) return null;
  const half = Math.floor(series.length / 2);
  if (half <= 0) return null;
  const prev = series.slice(0, half).reduce((a, b) => a + b, 0);
  const cur = series.slice(half).reduce((a, b) => a + b, 0);
  if (prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
};

const pctChange = (cur: number, prev: number): number | null =>
  prev > 0 ? ((cur - prev) / prev) * 100 : null;

/** استخراج موحّد للاستجابات — نفس نمط صفحة المالية */
const settledData = (r: PromiseSettledResult<any>): any =>
  r.status === 'fulfilled' ? (r.value?.data !== undefined ? r.value.data : r.value) : null;
const settledList = (r: PromiseSettledResult<any>): any[] => {
  const v = settledData(r);
  return Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];
};

/* ===== خط الاتجاه المصغّر — يظهر فقط مع سلسلة حقيقية (نقطتان أو أكثر) ===== */
function Sparkline({ data, color, gid }: { data: number[]; color: string; gid: string }) {
  if (data.length < 2 || !data.some((v) => Number(v) !== 0)) return null;
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-9 -mx-1 mt-2" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gid})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** بطاقة مؤشر بخط اتجاه — نفس ستايل KpiCard تماماً مع Sparkline أسفل القيمة */
function SparkKpiCard({
  icon: Icon,
  iconClass,
  label,
  value,
  trendPct,
  sub,
  series,
  sparkColor,
  gid,
}: {
  icon: LucideIcon;
  iconClass?: string;
  label: string;
  value: string;
  trendPct?: number | null;
  sub?: string;
  series: number[];
  sparkColor: string;
  gid: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
        <Icon size={13} className={iconClass} /> {label}
      </p>
      <p className="text-lg font-black text-slate-900">{value}</p>
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
      <Sparkline data={series} color={sparkColor} gid={gid} />
    </div>
  );
}

type MetricCard = {
  id: string;
  label: string;
  value: string;
  trendPct?: number | null;
  icon: LucideIcon;
  iconClass?: string;
  sub?: string;
  series: number[];
  sparkColor?: string;
};

export type KpiSectionProps = {
  period: PeriodKey;
  /** يتغير عند الضغط على «تحديث» — إعادة جلب مع تغيّره */
  refreshKey?: number;
  /** تسجيل زر تصدير CSV في شريط أدوات الصفحة */
  registerExport?: (fn: (() => void) | null) => void;
};

export default function KpiSection({ period, refreshKey, registerExport }: KpiSectionProps) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SalesReportData | null>(null);
  const [customers, setCustomers] = useState<CustomerInsightsData | null>(null);
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [ordersCur, setOrdersCur] = useState<OrderRow[]>([]);
  const [ordersPrev, setOrdersPrev] = useState<OrderRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const shop = await apiRequest('/shops/me');
        const sid = shop?.id;
        if (!sid || cancelled) return;
        const cur = periodRange(period);
        const prev = prevPeriodRange(period);
        const tr = TIME_RANGE_BY_PERIOD[period] || 'last_30_days';
        const ordQ = (f: string, t: string) =>
          `/orders/me?limit=200&from=${encodeURIComponent(`${f}T00:00:00Z`)}&to=${encodeURIComponent(`${t}T23:59:59Z`)}`;
        const [reportRes, custRes, trafficRes, ordCurRes, ordPrevRes] = await Promise.allSettled([
          apiRequest(`/analytics/shop/${sid}/sales-report?time_range=${tr}`),
          apiRequest(`/analytics/shop/${sid}/customer-insights?time_range=${tr}`),
          apiRequest(`/analytics/shop/${sid}/traffic?time_range=${tr}`),
          apiRequest(ordQ(cur.from, cur.to)),
          apiRequest(ordQ(prev.from, prev.to)),
        ]);
        if (cancelled) return;
        setReport(settledData(reportRes));
        setCustomers(settledData(custRes));
        setTraffic(settledData(trafficRes));
        setOrdersCur(settledList(ordCurRes));
        setOrdersPrev(settledList(ordPrevRes));
      } catch {
        if (!cancelled) {
          setReport(null);
          setCustomers(null);
          setTraffic(null);
          setOrdersCur([]);
          setOrdersPrev([]);
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

  /* ===== سلاسل زمنية — من ترند التقرير، وبديلاً من طلبات الفترة ===== */
  const trend = useMemo(() => report?.trend || [], [report]);
  const trendRevenue = useMemo(() => trend.map((p) => Number(p.revenue) || 0), [trend]);
  const trendOrders = useMemo(() => trend.map((p) => Number(p.orders) || 0), [trend]);
  const trendAov = useMemo(
    () =>
      trend.map((p) => (Number(p.orders) > 0 ? (Number(p.revenue) || 0) / Number(p.orders) : 0)),
    [trend]
  );

  const bucketData = useMemo(() => {
    const bs = buildBuckets(period, cur);
    fillBuckets(ordersCur, bs, period, 'revenue', orderDateOf, orderTotalOf);
    fillBuckets(ordersCur, bs, period, 'income', orderDateOf, () => 1); // عدد الطلبات
    return bs;
  }, [period, cur, ordersCur]);
  const bucketRevenue = useMemo(() => bucketData.map((b) => Number(b.revenue || 0)), [bucketData]);
  const bucketOrders = useMemo(() => bucketData.map((b) => Number(b.income || 0)), [bucketData]);
  const bucketAov = useMemo(
    () =>
      bucketData.map((b) =>
        Number(b.income || 0) > 0 ? Number(b.revenue || 0) / Number(b.income || 0) : 0
      ),
    [bucketData]
  );

  const revSeries = useMemo(
    () => (trendRevenue.some((v) => v > 0) ? trendRevenue : bucketRevenue),
    [trendRevenue, bucketRevenue]
  );
  const ordSeries = useMemo(
    () => (trendOrders.some((v) => v > 0) ? trendOrders : bucketOrders),
    [trendOrders, bucketOrders]
  );
  const aovSeries = useMemo(
    () => (trendAov.some((v) => v > 0) ? trendAov : bucketAov),
    [trendAov, bucketAov]
  );

  /* ===== إجماليات الفترة الحالية والسابقة — بيانات حقيقية فقط ===== */
  const revFromOrders = useMemo(() => sumOf(ordersCur, orderTotalOf), [ordersCur]);
  const revPrev = useMemo(() => sumOf(ordersPrev, orderTotalOf), [ordersPrev]);
  const revCur = useMemo(
    () =>
      trendRevenue.reduce((a, b) => a + b, 0) > 0
        ? trendRevenue.reduce((a, b) => a + b, 0)
        : revFromOrders,
    [trendRevenue, revFromOrders]
  );
  const ordCur = useMemo(
    () =>
      trendOrders.reduce((a, b) => a + b, 0) > 0
        ? trendOrders.reduce((a, b) => a + b, 0)
        : ordersCur.length,
    [trendOrders, ordersCur]
  );
  const ordPrev = ordersPrev.length;
  const aovCur = ordCur > 0 ? revCur / ordCur : 0;
  const aovPrev = ordPrev > 0 ? revPrev / ordPrev : 0;

  const revenueTrend = useMemo(
    () => pctChange(revCur, revPrev) ?? halfChange(revSeries),
    [revCur, revPrev, revSeries]
  );
  const ordersTrend = useMemo(
    () => pctChange(ordCur, ordPrev) ?? halfChange(ordSeries),
    [ordCur, ordPrev, ordSeries]
  );
  const aovTrend = useMemo(
    () => pctChange(aovCur, aovPrev) ?? halfChange(aovSeries),
    [aovCur, aovPrev, aovSeries]
  );

  /* ===== العملاء — من customer-insights، وبديلاً من طلبات الفترة ===== */
  const customersCur = useMemo(() => {
    const t = Number(customers?.total_customers);
    if (Number.isFinite(t) && t > 0) return t;
    return uniqueCount(ordersCur, customerKeyOf);
  }, [customers, ordersCur]);
  const customersPrev = useMemo(() => uniqueCount(ordersPrev, customerKeyOf), [ordersPrev]);
  const customersTrend = useMemo(
    () => pctChange(customersCur, customersPrev),
    [customersCur, customersPrev]
  );
  const newCustomers = Number(customers?.new_customers) || 0;

  const itemsSold = useMemo(() => {
    const stat = (report?.stats || []).find(
      (s) => s.label === 'Items Sold' || s.label_ar === 'المنتجات المباعة'
    );
    const v = Number(stat?.value);
    return Number.isFinite(v) ? v : 0;
  }, [report]);

  const visitors = Number(traffic?.total_visitors) || 0;
  const conversion = visitors > 0 ? (ordCur / visitors) * 100 : 0;

  /* ===== بطاقات المؤشرات ===== */
  const cards = useMemo<MetricCard[]>(
    () => [
      {
        id: 'revenue',
        label: 'إجمالي الإيرادات',
        value: egp(revCur),
        trendPct: revenueTrend,
        icon: DollarSign,
        iconClass: 'text-emerald-600',
        sub: revCur > 0 ? `إيراد ${periodLabel(period)}` : undefined,
        series: revSeries,
        sparkColor: '#00E5FF',
      },
      {
        id: 'orders',
        label: 'إجمالي الطلبات',
        value: fmt(ordCur),
        trendPct: ordersTrend,
        icon: ShoppingCart,
        iconClass: 'text-blue-600',
        series: ordSeries,
        sparkColor: '#8B5CF6',
      },
      {
        id: 'aov',
        label: 'متوسط قيمة الطلب',
        value: egp(aovCur),
        trendPct: aovTrend,
        icon: Receipt,
        iconClass: 'text-purple-600',
        series: aovSeries,
        sparkColor: '#10B981',
      },
      {
        id: 'items',
        label: 'المنتجات المباعة',
        value: fmt(itemsSold),
        icon: Package,
        iconClass: 'text-amber-600',
        sub: 'عدد القطع المباعة في طلبات الفترة',
        series: [],
      },
      {
        id: 'customers',
        label: 'العملاء',
        value: fmt(customersCur),
        trendPct: customersTrend,
        icon: Users,
        iconClass: 'text-sky-600',
        sub: 'عملاء اشتروا خلال الفترة',
        series: [],
      },
      {
        id: 'new-customers',
        label: 'عملاء جدد',
        value: fmt(newCustomers),
        icon: UserPlus,
        iconClass: 'text-teal-600',
        sub: 'أول طلب لهم خلال هذه الفترة',
        series: [],
      },
      {
        id: 'visitors',
        label: 'الزوار',
        value: fmt(visitors),
        icon: Eye,
        iconClass: 'text-cyan-600',
        sub: 'زيارات المتجر خلال الفترة',
        series: [],
      },
      {
        id: 'conversion',
        label: 'معدل التحويل',
        value: `${conversion.toFixed(1)}%`,
        icon: Target,
        iconClass: 'text-rose-600',
        sub: 'نسبة الطلبات من الزيارات',
        series: [],
      },
    ],
    [
      period,
      revCur,
      revenueTrend,
      revSeries,
      ordCur,
      ordersTrend,
      ordSeries,
      aovCur,
      aovTrend,
      aovSeries,
      itemsSold,
      customersCur,
      customersTrend,
      newCustomers,
      visitors,
      conversion,
    ]
  );

  const hasAnyData =
    revCur > 0 ||
    ordCur > 0 ||
    ordersCur.length > 0 ||
    itemsSold > 0 ||
    customersCur > 0 ||
    newCustomers > 0 ||
    visitors > 0 ||
    revSeries.some((v) => v > 0);

  /* ===== تصدير CSV — يُسجَّل في شريط أدوات الصفحة ===== */
  useEffect(() => {
    if (!registerExport) return;
    if (loading || !hasAnyData) {
      registerExport(null);
      return () => registerExport(null);
    }
    const fn = () => {
      downloadCSV(
        'kpi-insights.csv',
        ['المؤشر', `القيمة (${periodLabel(period)})`, 'التغير عن الفترة السابقة'],
        cards.map((c) => [
          c.label,
          c.value,
          typeof c.trendPct === 'number' && Number.isFinite(c.trendPct)
            ? `${c.trendPct >= 0 ? '+' : '-'}${Math.abs(c.trendPct).toFixed(1)}%`
            : '—',
        ])
      );
    };
    registerExport(fn);
    return () => registerExport(null);
  }, [registerExport, loading, hasAnyData, cards, period]);

  if (loading) return <SectionSkeleton />;

  if (!hasAnyData) {
    return (
      <EmptyCard
        title="لا توجد بيانات"
        hint="لم تُسجَّل طلبات أو زيارات في هذه الفترة — جرّب اختيار فترة زمنية أطول من الفلتر بالأعلى"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) =>
        c.series.length >= 2 && c.sparkColor ? (
          <SparkKpiCard
            key={c.id}
            icon={c.icon}
            iconClass={c.iconClass}
            label={c.label}
            value={c.value}
            trendPct={c.trendPct}
            sub={c.sub}
            series={c.series}
            sparkColor={c.sparkColor}
            gid={`kpi-spark-${c.id}`}
          />
        ) : (
          <KpiCard
            key={c.id}
            icon={c.icon}
            iconClass={c.iconClass}
            label={c.label}
            value={c.value}
            trendPct={c.trendPct ?? undefined}
            sub={c.sub}
          />
        )
      )}
    </div>
  );
}
