'use client';

/**
 * تاب أداء المبيعات — مؤشرات حقيقية من /analytics/sales-performance/shop/:id
 * ورسم تطور الإيراد من الطلبات الفعلية. مفيش أي بيانات وهمية: لو الـAPI
 * رجّع فاضي تظهر حالة فراغ حقيقية.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AreaChart as RAreaChart,
  Area as RArea,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Package,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import {
  KpiCard,
  ChartCard,
  SectionSkeleton,
  ChartEmpty,
  downloadCSV,
  egp,
  periodRange,
  prevPeriodRange,
  inPeriod,
  buildBuckets,
  bucketKeyOf,
  type PeriodKey,
} from './financeShared';

type SalesMetric = {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  target?: number;
  unit: string;
  period: string;
  category: 'revenue' | 'orders' | 'products' | 'conversion';
  trend: 'up' | 'down' | 'stable';
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  revenue: { label: 'الإيرادات', color: 'text-green-600', bg: 'bg-green-100' },
  orders: { label: 'الطلبات', color: 'text-blue-600', bg: 'bg-blue-100' },
  products: { label: 'المنتجات', color: 'text-purple-600', bg: 'bg-purple-100' },
  conversion: { label: 'التحويل', color: 'text-cyan-600', bg: 'bg-cyan-100' },
  profit: { label: 'الأرباح', color: 'text-emerald-600', bg: 'bg-emerald-100' },
};

const calcGrowth = (current: number, previous: number) =>
  previous > 0 ? ((current - previous) / previous) * 100 : null;

export default function SalesPerformanceSection({
  period,
  refreshKey,
  registerExport,
  searchQuery = '',
}: {
  period: PeriodKey;
  refreshKey: number;
  registerExport: (fn: (() => void) | null) => void;
  searchQuery?: string;
}) {
  const { shop } = useShop();
  const [metrics, setMetrics] = useState<SalesMetric[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const load = useCallback(async () => {
    const shopId = shop?.id;
    if (!shopId) return;
    setError('');
    try {
      const [perfRes, ordersRes] = await Promise.allSettled([
        apiRequest(`/analytics/sales-performance/shop/${shopId}`),
        apiRequest(`/orders/me?limit=200`),
      ]);
      const perfData = perfRes.status === 'fulfilled' ? perfRes.value : null;
      const raw = Array.isArray(perfData) ? perfData : perfData?.data || [];
      setMetrics(Array.isArray(raw) ? raw : []);
      const ordersList =
        ordersRes.status === 'fulfilled'
          ? Array.isArray(ordersRes.value)
            ? ordersRes.value
            : ordersRes.value?.orders || []
          : [];
      setOrders(ordersList);
      if (perfRes.status === 'rejected' && ordersRes.status === 'rejected') {
        setError('تعذر تحميل بيانات أداء المبيعات');
      }
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل بيانات أداء المبيعات');
    } finally {
      setLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  /** فلترة وبحث المؤشرات */
  const filtered = useMemo(() => {
    let result = metrics.filter((m) =>
      (m.name || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
    if (filterCategory !== 'all') result = result.filter((m) => m.category === filterCategory);
    return result;
  }, [metrics, searchQuery, filterCategory]);

  /** مؤشرات مجمعة حقيقية من الـAPI */
  const sumBy = useCallback(
    (cat: string, field: 'value' | 'previousValue') =>
      metrics.filter((m) => m.category === cat).reduce((s, m) => s + Number(m?.[field] || 0), 0),
    [metrics]
  );
  const revenue = sumBy('revenue', 'value');
  const revenuePrev = sumBy('revenue', 'previousValue');
  const ordersCount = sumBy('orders', 'value');
  const ordersPrev = sumBy('orders', 'previousValue');
  const upTrend = metrics.filter((m) => m.trend === 'up').length;

  /** الإيراد عبر الفترة — تجميع حقيقي من الطلبات */
  const range = periodRange(period);
  const periodOrders = useMemo(
    () => orders.filter((o) => inPeriod(o?.createdAt || o?.created_at, range)),
    [orders, range]
  );
  const timeline = useMemo(() => {
    const buckets = buildBuckets(period, range);
    for (const o of periodOrders) {
      const k = bucketKeyOf(o?.createdAt || o?.created_at, period);
      if (!k) continue;
      const b = buckets.find((x) => x.key === k);
      if (b) b.revenue = Number(b.revenue || 0) + Number(o?.total || 0);
    }
    return buckets.map((b) => ({ label: b.label, revenue: b.revenue || 0 }));
  }, [periodOrders, period, range]);

  useEffect(() => {
    if (loading || filtered.length === 0) {
      registerExport(null);
      return;
    }
    registerExport(() =>
      downloadCSV(
        'sales-performance.csv',
        ['Name', 'Value', 'Previous Value', 'Unit', 'Period', 'Category', 'Trend'],
        filtered.map((m) => [
          m.name,
          m.value,
          m.previousValue,
          m.unit,
          m.period,
          m.category,
          m.trend,
        ])
      )
    );
    return () => registerExport(null);
  }, [filtered, loading, registerExport]);

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
          icon={DollarSign}
          label="إجمالي الإيرادات"
          value={egp(revenue)}
          trendPct={calcGrowth(revenue, revenuePrev) ?? undefined}
        />
        <KpiCard
          icon={ShoppingCart}
          label="إجمالي الطلبات"
          value={String(Math.round(ordersCount))}
          trendPct={calcGrowth(ordersCount, ordersPrev) ?? undefined}
        />
        <KpiCard
          icon={TrendingUp}
          label="مؤشرات صاعدة"
          value={String(upTrend)}
          sub={`من ${metrics.length} مؤشر`}
        />
        <KpiCard
          icon={Activity}
          label="مؤشرات متراجعة"
          value={String(metrics.filter((m) => m.trend === 'down').length)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* تطور الإيراد */}
        <div className="lg:col-span-2">
          <ChartCard title="تطور الإيراد عبر الفترة" sub="من الطلبات الفعلية">
            {periodOrders.length > 0 ? <RevenueArea data={timeline} /> : <ChartEmpty />}
          </ChartCard>
        </div>

        {/* فلترة الفئات */}
        <ChartCard title="المؤشرات حسب الفئة" sub={`${metrics.length} مؤشر`}>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(CATEGORY_CONFIG).map((key) => {
              const c = CATEGORY_CONFIG[key];
              const count = metrics.filter((m) => m.category === key).length;
              const active = filterCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilterCategory(active ? 'all' : key)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    active
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <div className={`text-xs font-bold mb-1 ${c.color}`}>{c.label}</div>
                  <div className="text-lg font-black text-slate-900 tabular-nums">{count}</div>
                </button>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* قائمة المؤشرات */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp size={15} className="text-cyan-600" />
          <h3 className="text-sm font-bold text-slate-800">مؤشرات الأداء</h3>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded px-2 py-0.5 tabular-nums mr-auto">
            {filtered.length}
          </span>
        </div>
        {metrics.length === 0 ? (
          <div className="py-14 text-center">
            <Package size={26} className="mx-auto mb-2 text-slate-200" />
            <p className="text-sm font-bold text-slate-500">لا توجد بيانات أداء بعد</p>
            <p className="text-xs text-slate-400 mt-1">
              أول ما يبدأ فيه بيع في المتجر هتظهر مؤشرات الأداء هنا تلقائيًا
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400 font-semibold">
            لا نتائج مطابقة للبحث أو الفلتر
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((metric) => {
              const growth = calcGrowth(metric.value, metric.previousValue);
              const cat = CATEGORY_CONFIG[metric.category] || CATEGORY_CONFIG.revenue;
              return (
                <div key={metric.id} className="p-4 hover:bg-slate-50 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          metric.trend === 'up'
                            ? 'bg-green-50'
                            : metric.trend === 'down'
                              ? 'bg-red-50'
                              : 'bg-slate-100'
                        }`}
                      >
                        {metric.trend === 'up' ? (
                          <TrendingUp size={20} className="text-green-600" />
                        ) : metric.trend === 'down' ? (
                          <TrendingDown size={20} className="text-red-600" />
                        ) : (
                          <Activity size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-slate-900">{metric.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{metric.period}</div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${cat.bg} ${cat.color}`}
                    >
                      {cat.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-lg font-black text-slate-900">
                          {metric.value.toLocaleString()} {metric.unit}
                        </div>
                        <div className="text-xs text-slate-500">
                          السابق: {metric.previousValue.toLocaleString()} {metric.unit}
                        </div>
                      </div>
                      {growth !== null && (
                        <div
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            metric.trend === 'up'
                              ? 'bg-green-50 text-green-600'
                              : metric.trend === 'down'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {metric.trend === 'up' ? (
                            <ArrowUpRight size={14} />
                          ) : metric.trend === 'down' ? (
                            <ArrowDownRight size={14} />
                          ) : (
                            <Activity size={14} />
                          )}
                          <span>{Math.abs(growth).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* رسم مساحة بسلسلة واحدة — نفس ستايل محاور المشروع */
const AXIS_STYLE = { fontSize: 10, fill: '#94A3B8', fontWeight: 600 };
const compactNum = (v: number) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1)}K`;
  return String(Math.round(n));
};

function RevenueArea({ data }: { data: Array<{ label: string; revenue: number }> }) {
  const total = data.reduce((s, d) => s + d.revenue, 0);
  if (total <= 0) return <ChartEmpty />;
  return (
    <div style={{ height: 240 }} dir="ltr" className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RAreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="sales-rev-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00B8CC" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#00B8CC" stopOpacity={0.02} />
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
          <RTooltip
            content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null;
              return (
                <div
                  className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 shadow-lg text-[11px] font-bold whitespace-nowrap"
                  dir="rtl"
                >
                  <span className="text-slate-400 font-semibold">{label} — </span>
                  <span dir="ltr" className="tabular-nums">
                    ج.م {Number(payload[0].value || 0).toLocaleString()}
                  </span>
                </div>
              );
            }}
            cursor={{ stroke: '#E2E8F0' }}
          />
          <RArea
            type="monotone"
            dataKey="revenue"
            name="الإيراد"
            stroke="#00B8CC"
            strokeWidth={2.5}
            fill="url(#sales-rev-grad)"
            activeDot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#00B8CC' }}
            animationDuration={450}
          />
        </RAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
