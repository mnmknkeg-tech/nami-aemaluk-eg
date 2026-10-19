'use client';

/**
 * تاب أداء المنتجات — بيانات حقيقية من /analytics/shop/:id/product-performance
 * مع رسم أعلى المنتجات إيرادًا وجدول الترتيب الكامل.
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
import { Package, Star, ArrowUpDown } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import {
  KpiCard,
  ChartCard,
  SectionSkeleton,
  ChartEmpty,
  downloadCSV,
  type PeriodKey,
} from './financeShared';
import { fmtNum, fmtEGP } from './InsightsShared';

type ProductPerf = {
  id: string;
  name: string;
  category: string;
  units_sold: number;
  revenue: number;
  stock: number;
  avg_rating: number;
  status: string; // star | rising | stable | declining
};

type PerfReport = {
  products: ProductPerf[];
  totals: { units: number; revenue: number; views: number; avg_conv: number };
};

/** فترة الصفحة (اليوم/أسبوع/شهر/سنة) → مدة تقرير المنتجات من الباك إند (7/30/90 يوم) */
const periodToDays = (p: PeriodKey): '7' | '30' | '90' =>
  p === 'today' || p === 'd7' ? '7' : p === 'd30' || p === 'month' ? '30' : '90';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  star: { label: 'نجم', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  rising: { label: 'صاعد', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  stable: { label: 'ثابت', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  declining: { label: 'متراجع', cls: 'bg-red-50 text-red-700 border-red-200' },
};

type SortKey = 'revenue' | 'units_sold' | 'stock';

export default function ProductPerformanceSection({
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
  const days = periodToDays(period);
  const [data, setData] = useState<PerfReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('revenue');

  const load = useCallback(
    async (d: '7' | '30' | '90') => {
      const shopId = shop?.id;
      if (!shopId) return;
      setError('');
      try {
        const res = await apiRequest(`/analytics/shop/${shopId}/product-performance?period=${d}d`);
        setData(res || null);
      } catch (e: any) {
        setError(e?.message || 'تعذر تحميل أداء المنتجات');
      } finally {
        setLoading(false);
      }
    },
    [shop?.id]
  );

  useEffect(() => {
    load(days);
  }, [days, load, refreshKey]);

  const products = useMemo(() => {
    let list = [...(data?.products || [])];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => Number(b[sortKey] || 0) - Number(a[sortKey] || 0));
    return list;
  }, [data, searchQuery, sortKey]);

  const totals = data?.totals;

  /** أعلى 10 منتجات إيرادًا — للرسم البياني */
  const topProducts = useMemo(
    () =>
      [...(data?.products || [])]
        .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))
        .slice(0, 10)
        .map((p) => ({ name: (p.name || 'منتج').slice(0, 18), revenue: Number(p.revenue || 0) })),
    [data]
  );

  useEffect(() => {
    if (loading || products.length === 0) {
      registerExport(null);
      return;
    }
    registerExport(() =>
      downloadCSV(
        'product-performance.csv',
        ['Product', 'Category', 'Units Sold', 'Revenue', 'Stock', 'Avg Rating', 'Status'],
        products.map((p) => [
          p.name || '—',
          p.category || '—',
          p.units_sold,
          Number(p.revenue || 0).toFixed(2),
          p.stock,
          p.avg_rating,
          p.status,
        ])
      )
    );
    return () => registerExport(null);
  }, [products, loading, registerExport]);

  if (loading) return <SectionSkeleton />;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard icon={Package} label="إيراد المنتجات" value={fmtEGP(totals?.revenue || 0)} />
        <KpiCard icon={Package} label="قطع مباعة" value={fmtNum(totals?.units || 0)} />
        <KpiCard
          icon={Package}
          label="عدد المنتجات"
          value={fmtNum((data?.products || []).length)}
        />
        <KpiCard
          icon={Star}
          label="متوسط معدل التحويل"
          value={`${(totals?.avg_conv || 0).toFixed(1)}%`}
        />
      </div>

      {/* أعلى المنتجات إيرادًا */}
      <ChartCard title="أعلى المنتجات إيرادًا" sub="أول 10 منتجات">
        {topProducts.length > 0 ? <TopProductsBars data={topProducts} /> : <ChartEmpty />}
      </ChartCard>

      {/* جدول المنتجات */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Package size={15} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800">كل المنتجات</h3>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded px-2 py-0.5 tabular-nums mr-auto">
            {fmtNum(products.length)}
          </span>
          <div className="relative flex items-center gap-1">
            <ArrowUpDown size={13} className="text-slate-400" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-9 px-2 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 bg-white focus:outline-none"
            >
              <option value="revenue">الأعلى إيرادًا</option>
              <option value="units_sold">الأكثر مبيعًا</option>
              <option value="stock">الأعلى مخزونًا</option>
            </select>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="py-14 text-center">
            <Package size={26} className="mx-auto mb-2 text-slate-200" />
            <p className="text-sm font-bold text-slate-500">
              {searchQuery
                ? 'لا نتائج مطابقة للبحث'
                : 'لا توجد منتجات بعد — أضف أول منتج وسيظهر أداؤه هنا'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[760px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">المنتج</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">الفئة</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">قطع مباعة</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">الإيراد</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">المخزون</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const st = STATUS_META[p.status] || STATUS_META.stable;
                  const lowStock = p.stock > 0 && p.stock <= 5;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold text-slate-800 max-w-[200px] truncate">
                          {p.name || 'منتج'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.category || '—'}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700 tabular-nums">
                        {fmtNum(p.units_sold)}
                      </td>
                      <td className="px-4 py-3 text-xs font-extrabold text-slate-900 tabular-nums">
                        {fmtEGP(p.revenue)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold tabular-nums ${lowStock ? 'text-amber-600' : 'text-slate-700'}`}
                        >
                          {fmtNum(p.stock)}
                        </span>
                        {lowStock && (
                          <span className="text-[9px] font-bold text-amber-600 mr-1">منخفض</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${st.cls}`}
                        >
                          {p.status === 'star' && <Star size={9} className="inline ml-0.5" />}
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const AXIS_STYLE = { fontSize: 10, fill: '#94A3B8', fontWeight: 600 };
const compactNum = (v: number) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1)}K`;
  return String(Math.round(n));
};

function TopProductsBars({ data }: { data: Array<{ name: string; revenue: number }> }) {
  return (
    <div style={{ height: 260 }} dir="ltr" className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="#EEF1F6" horizontal={false} />
          <XAxis
            type="number"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={compactNum}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            width={110}
            orientation="right"
          />
          <RTooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              return (
                <div
                  className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 shadow-lg text-[11px] font-bold whitespace-nowrap"
                  dir="rtl"
                >
                  <span dir="ltr" className="tabular-nums">
                    ج.م {Number(payload[0].value || 0).toLocaleString()}
                  </span>
                </div>
              );
            }}
            cursor={{ fill: '#F1F5F9' }}
          />
          <RBar
            dataKey="revenue"
            name="الإيراد"
            fill="#00B8CC"
            radius={[0, 4, 4, 0]}
            animationDuration={450}
          />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
