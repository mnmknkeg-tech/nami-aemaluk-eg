'use client';

/**
 * تاب المرتجعات — مؤشرات ورسوم من مرتجعات المتجر الفعلية
 * (الموقع والكاشير والفواتير) مع فلترة بالفترة واتجاه مقارن بالفترة السابقة.
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
import { Undo2, PackageSearch } from 'lucide-react';
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
  prevPeriodRange,
  inPeriod,
  buildBuckets,
  bucketKeyOf,
  type PeriodKey,
} from './financeShared';

type ReturnRow = {
  orderId: string;
  orderShortId: string;
  source: string;
  returnCreatedAt?: string | Date;
  totalAmount: number;
  reason?: string | null;
  itemCount: number;
};

const LOCALE = 'ar-EG-u-nu-latn';
const fmtNum = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 });
const fmtMoney = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(LOCALE, { maximumFractionDigits: 2 });

const fmtDate = (iso?: string | Date) => {
  if (!iso) return '—';
  try {
    return new Date(iso as any).toLocaleDateString(LOCALE, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const sourceLabel = (source?: string) => {
  const s = String(source || '').toLowerCase();
  if (s === 'pos') return 'الكاشير';
  if (s === 'manual') return 'فاتورة يدوية';
  return 'الموقع';
};

export default function ReturnsSection({
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
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const shopId = shop?.id;
    if (!shopId) return;
    setError('');
    try {
      const res = await apiRequest(`/shops/${shopId}/orders`);
      const orders = Array.isArray(res) ? res : res?.orders || [];
      const list = Array.isArray(orders) ? orders : [];
      setTotalOrders(list.length);

      const returnedOrders = list.filter((o: any) =>
        ['RETURNED', 'REFUNDED'].includes(String(o?.status || '').toUpperCase())
      );

      const out: ReturnRow[] = [];
      for (const order of returnedOrders) {
        const orderId = String(order?.id || '').trim();
        if (!orderId) continue;
        const source = String(order?.source || '').toLowerCase();
        const orderDate = order?.created_at || order?.createdAt;
        try {
          const listRes = await apiRequest(`/shops/${shopId}/orders/${orderId}/returns`);
          const returnsList = Array.isArray(listRes) ? listRes : listRes?.returns || [];
          if (Array.isArray(returnsList) && returnsList.length > 0) {
            for (const r of returnsList) {
              out.push({
                orderId,
                orderShortId: orderId.slice(0, 8).toUpperCase(),
                source,
                returnCreatedAt: r?.createdAt || orderDate,
                totalAmount: Number(r?.totalAmount || 0) || 0,
                reason: r?.reason ?? null,
                itemCount: Array.isArray(r?.items) ? r.items.length : 0,
              });
            }
            continue;
          }
        } catch {
          /* مفيش سجلات مرتجع للطلب — نرجّع بصف احتياطي */
        }
        out.push({
          orderId,
          orderShortId: orderId.slice(0, 8).toUpperCase(),
          source,
          returnCreatedAt: orderDate,
          totalAmount: Number(order?.total || 0) || 0,
          reason: null,
          itemCount: Array.isArray(order?.items) ? order.items.length : 0,
        });
      }

      out.sort((a, b) => {
        const ta = a.returnCreatedAt ? new Date(a.returnCreatedAt as any).getTime() : 0;
        const tb = b.returnCreatedAt ? new Date(b.returnCreatedAt as any).getTime() : 0;
        return tb - ta;
      });
      setRows(out);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل تقرير المرتجعات');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const range = periodRange(period);

  /** مرتجعات الفترة المختارة فقط */
  const periodRows = useMemo(
    () => rows.filter((r) => inPeriod(r.returnCreatedAt as string | undefined, range)),
    [rows, range]
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return periodRows;
    const q = searchQuery.trim().toLowerCase();
    return periodRows.filter(
      (r) => r.orderId.toLowerCase().includes(q) || r.orderShortId.toLowerCase().includes(q)
    );
  }, [periodRows, searchQuery]);

  const stats = useMemo(() => {
    const count = periodRows.length;
    const totalReturnedAmount = periodRows.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
    const ordersInRange = totalOrders; // القائمة الحالية هي مرجع النسبة
    const rate = ordersInRange > 0 ? (count / ordersInRange) * 100 : 0;
    return { count, totalReturnedAmount, rate };
  }, [periodRows, totalOrders]);

  /** اتجاه عدد المرتجعات مقابل الفترة السابقة */
  const trendPct = useMemo(() => {
    const prev = prevPeriodRange(period);
    const prevCount = rows.filter((r) =>
      inPeriod(r.returnCreatedAt as string | undefined, prev)
    ).length;
    if (prevCount === 0) return null;
    return ((stats.count - prevCount) / prevCount) * 100;
  }, [rows, period, stats.count]);

  /** مرتجعات عبر الفترة — تجميع حقيقي بالحاويات الزمنية */
  const timeline = useMemo(() => {
    const buckets = buildBuckets(period, range);
    for (const r of periodRows) {
      const k = bucketKeyOf(r.returnCreatedAt as string | undefined, period);
      if (!k) continue;
      const b = buckets.find((x) => x.key === k);
      if (b) b.revenue = Number(b.revenue || 0) + 1;
    }
    return buckets.map((b) => ({ label: b.label, returns: Number(b.revenue || 0) }));
  }, [periodRows, period, range]);

  const sourceDonut = useMemo(() => {
    const groups = [
      { name: 'الموقع', match: (s: string) => s !== 'pos' && s !== 'manual' },
      { name: 'الكاشير', match: (s: string) => s === 'pos' },
      { name: 'فاتورة يدوية', match: (s: string) => s === 'manual' },
    ];
    return groups
      .map((g) => ({
        name: g.name,
        value: periodRows.filter((r) => g.match(r.source)).length,
      }))
      .filter((d) => d.value > 0);
  }, [periodRows]);

  useEffect(() => {
    if (loading || filtered.length === 0) {
      registerExport(null);
      return;
    }
    registerExport(() =>
      downloadCSV(
        'returns.csv',
        ['Order', 'Source', 'Date', 'Items', 'Refunded Amount', 'Reason'],
        filtered.map((r) => [
          `#${r.orderShortId}`,
          sourceLabel(r.source),
          fmtDate(r.returnCreatedAt),
          r.itemCount,
          Number(r.totalAmount || 0).toFixed(2),
          r.reason || '-',
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
          icon={Undo2}
          label="عدد المرتجعات"
          value={fmtNum(stats.count)}
          trendPct={trendPct ?? undefined}
        />
        <KpiCard
          icon={Undo2}
          label="إجمالي المسترجع"
          value={egp(stats.totalReturnedAmount)}
          valueClass="text-orange-600"
        />
        <KpiCard
          icon={Undo2}
          label="نسبة المرتجعات"
          value={`${fmtNum(Math.round(stats.rate * 10) / 10)}%`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* مرتجعات عبر الفترة */}
        <div className="lg:col-span-2">
          <ChartCard title="المرتجعات عبر الفترة" sub="حسب تاريخ المرتجع">
            {periodRows.length > 0 ? <ReturnsBars data={timeline} /> : <ChartEmpty />}
          </ChartCard>
        </div>

        {/* حسب المصدر */}
        <ChartCard title="المرتجعات حسب المصدر">
          {sourceDonut.length > 0 ? (
            <Donut data={sourceDonut} centerValue={fmtNum(stats.count)} centerLabel="مرتجع" />
          ) : (
            <ChartEmpty />
          )}
        </ChartCard>
      </div>

      {/* سجل المرتجعات */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <PackageSearch size={15} className="text-orange-600" />
          <h3 className="text-sm font-bold text-slate-800">سجل المرتجعات</h3>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded px-2 py-0.5 tabular-nums mr-auto">
            {fmtNum(filtered.length)}
          </span>
        </div>
        {periodRows.length === 0 ? (
          <div className="py-14 text-center">
            <Undo2 size={26} className="mx-auto mb-2 text-emerald-300" />
            <p className="text-sm font-bold text-emerald-700">
              مفيش مرتجعات في الفترة دي — كده كويس 👍
            </p>
            <p className="text-xs text-slate-400 mt-1">
              كل الطلبات ماشية تمام، أول ما يحصل مرتجع هيظهر هنا فورًا
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400 font-semibold">
            لا نتائج مطابقة للبحث
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[720px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">الطلب</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">المصدر</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">التاريخ</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">عدد الأصناف</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">
                    المبلغ المسترجع
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">السبب</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={`${r.orderId}-${i}`}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs font-extrabold text-slate-800 tabular-nums">
                      #{r.orderShortId}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded px-2 py-0.5 whitespace-nowrap">
                        {sourceLabel(r.source)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {fmtDate(r.returnCreatedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                      {fmtNum(r.itemCount)}
                    </td>
                    <td className="px-4 py-3 text-xs font-extrabold text-orange-600 tabular-nums">
                      ج.م {fmtMoney(r.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[220px] truncate">
                      {r.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* أعمدة المرتجعات — نفس ستايل رسوم المشروع */

const AXIS_STYLE = { fontSize: 10, fill: '#94A3B8', fontWeight: 600 };
const compact = (v: number) => String(Math.round(Number(v || 0)));

function ReturnsBars({ data }: { data: Array<{ label: string; returns: number }> }) {
  if (!data.length) return <ChartEmpty />;
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
            minTickGap={16}
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
                    {payload[0].value} مرتجع
                  </span>
                </div>
              );
            }}
            cursor={{ fill: '#F1F5F9' }}
          />
          <RBar
            dataKey="returns"
            name="مرتجعات"
            fill="#F59E0B"
            radius={[4, 4, 0, 0]}
            animationDuration={450}
          />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
