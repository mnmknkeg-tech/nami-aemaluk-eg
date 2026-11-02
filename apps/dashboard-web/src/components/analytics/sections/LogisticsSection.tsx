'use client';

/**
 * تاب اللوجستيات — مؤشرات الشحن والتوصيل من الطلبات الفعلية:
 * حالة الطلبات، أزمنة التوصيل (createdAt → deliveredAt)، التوصيلات عبر
 * الفترة، وجدول أحدث التوصيلات. كل الأرقام من بيانات حقيقية فقط.
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
import { Truck, PackageCheck, Timer, UserCheck, PackageSearch } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import {
  KpiCard,
  ChartCard,
  SectionSkeleton,
  ChartEmpty,
  Donut,
  downloadCSV,
  periodRange,
  inPeriod,
  buildBuckets,
  bucketKeyOf,
  type PeriodKey,
} from './financeShared';

const LOCALE = 'ar-EG-u-nu-latn';
const fmtNum = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 });

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  CONFIRMED: 'مؤكد',
  PREPARING: 'قيد التجهيز',
  READY: 'جاهز للشحن',
  DELIVERED: 'تم التوصيل',
  CANCELLED: 'ملغي',
  REFUNDED: 'مسترجع',
  RETURNED: 'مرتجع',
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
};

/** متوسط زمن التوصيل بالساعات من timestamps حقيقية */
const deliveryHours = (o: any): number | null => {
  const created = o?.createdAt || o?.created_at;
  const delivered = o?.deliveredAt;
  if (!created || !delivered) return null;
  const ms = new Date(delivered).getTime() - new Date(created).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / 3600000;
};

export default function LogisticsSection({
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
      setError(e?.message || 'تعذر تحميل بيانات الشحن');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const range = periodRange(period);

  /** طلبات الفترة المختارة */
  const periodOrders = useMemo(
    () => orders.filter((o) => inPeriod(o?.createdAt || o?.created_at, range)),
    [orders, range]
  );

  const delivered = useMemo(
    () => periodOrders.filter((o) => String(o?.status || '').toUpperCase() === 'DELIVERED'),
    [periodOrders]
  );
  const inTransit = useMemo(
    () =>
      periodOrders.filter((o) =>
        ['CONFIRMED', 'PREPARING', 'READY'].includes(String(o?.status || '').toUpperCase())
      ),
    [periodOrders]
  );
  const withCourier = useMemo(() => periodOrders.filter((o) => o?.courierId), [periodOrders]);

  const avgDeliveryHours = useMemo(() => {
    const times = delivered.map(deliveryHours).filter((t): t is number => t !== null);
    if (times.length === 0) return null;
    return times.reduce((s, t) => s + t, 0) / times.length;
  }, [delivered]);

  const statusDonut = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of periodOrders) {
      const k = String(o?.status || '').toUpperCase();
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v }))
      .sort((a, b) => b.value - a.value);
  }, [periodOrders]);

  /** التوصيلات عبر الفترة (حسب deliveredAt) */
  const timeline = useMemo(() => {
    const buckets = buildBuckets(period, range);
    for (const o of delivered) {
      const k = bucketKeyOf(o?.deliveredAt, period);
      if (!k) continue;
      const b = buckets.find((x) => x.key === k);
      if (b) b.revenue = Number(b.revenue || 0) + 1;
    }
    return buckets.map((b) => ({ label: b.label, delivered: Number(b.revenue || 0) }));
  }, [delivered, period, range]);

  /** أحدث التوصيلات + فلترة البحث برقم الطلب */
  const recentDeliveries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return delivered
      .filter((o) => {
        const id = String(o?.id || '').toLowerCase();
        return !q || id.includes(q) || id.slice(0, 8).includes(q);
      })
      .sort(
        (a, b) => new Date(b?.deliveredAt || 0).getTime() - new Date(a?.deliveredAt || 0).getTime()
      )
      .slice(0, 20);
  }, [delivered, searchQuery]);

  useEffect(() => {
    if (loading || recentDeliveries.length === 0) {
      registerExport(null);
      return;
    }
    registerExport(() =>
      downloadCSV(
        'deliveries.csv',
        ['Order', 'Status', 'Delivered At', 'Delivery Hours', 'Courier'],
        recentDeliveries.map((o) => [
          `#${String(o?.id || '')
            .slice(0, 8)
            .toUpperCase()}`,
          STATUS_LABELS[String(o?.status || '').toUpperCase()] || String(o?.status || ''),
          fmtDate(o?.deliveredAt),
          deliveryHours(o) !== null ? deliveryHours(o)!.toFixed(1) : '-',
          o?.courierId ? String(o.courierId).slice(0, 8).toUpperCase() : '-',
        ])
      )
    );
    return () => registerExport(null);
  }, [recentDeliveries, loading, registerExport]);

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
          icon={PackageCheck}
          label="تم توصيلها"
          value={fmtNum(delivered.length)}
          valueClass="text-emerald-600"
        />
        <KpiCard
          icon={Truck}
          label="قيد التجهيز والشحن"
          value={fmtNum(inTransit.length)}
          valueClass="text-blue-600"
        />
        <KpiCard
          icon={Timer}
          label="متوسط زمن التوصيل"
          value={avgDeliveryHours !== null ? `${avgDeliveryHours.toFixed(1)} ساعة` : '—'}
          sub={delivered.length > 0 ? `من ${fmtNum(delivered.length)} طلب مسلّم` : undefined}
        />
        <KpiCard icon={UserCheck} label="مسلمة لكورير" value={fmtNum(withCourier.length)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* التوصيلات عبر الفترة */}
        <div className="lg:col-span-2">
          <ChartCard title="التوصيلات عبر الفترة" sub="حسب تاريخ التسليم">
            {delivered.length > 0 ? <DeliveryBars data={timeline} /> : <ChartEmpty />}
          </ChartCard>
        </div>

        {/* حالة الطلبات */}
        <ChartCard title="حالة الطلبات" sub={`${fmtNum(periodOrders.length)} طلب`}>
          {statusDonut.length > 0 ? (
            <Donut data={statusDonut} centerValue={fmtNum(periodOrders.length)} centerLabel="طلب" />
          ) : (
            <ChartEmpty />
          )}
        </ChartCard>
      </div>

      {/* أحدث التوصيلات */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <PackageSearch size={15} className="text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800">أحدث التوصيلات</h3>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded px-2 py-0.5 tabular-nums mr-auto">
            {fmtNum(recentDeliveries.length)}
          </span>
        </div>
        {delivered.length === 0 ? (
          <div className="py-14 text-center">
            <Truck size={26} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-500">مفيش توصيلات في الفترة دي</p>
            <p className="text-xs text-slate-400 mt-1">
              أول ما يتسلم طلب هيظهر هنا مع زمن التوصيل بتاعه
            </p>
          </div>
        ) : recentDeliveries.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400 font-semibold">
            لا نتائج مطابقة للبحث
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[680px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">الطلب</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">الحالة</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">
                    تاريخ التسليم
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">زمن التوصيل</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">الكورير</th>
                </tr>
              </thead>
              <tbody>
                {recentDeliveries.map((o, i) => {
                  const hrs = deliveryHours(o);
                  return (
                    <tr
                      key={String(o?.id || i)}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs font-extrabold text-slate-800 tabular-nums">
                        #
                        {String(o?.id || '')
                          .slice(0, 8)
                          .toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 whitespace-nowrap">
                          {STATUS_LABELS[String(o?.status || '').toUpperCase()] ||
                            String(o?.status || '')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {fmtDate(o?.deliveredAt)}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700 tabular-nums">
                        {hrs !== null ? `${hrs.toFixed(1)} ساعة` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 tabular-nums" dir="ltr">
                        {o?.courierId ? String(o.courierId).slice(0, 8).toUpperCase() : '—'}
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
const compact = (v: number) => String(Math.round(Number(v || 0)));

function DeliveryBars({ data }: { data: Array<{ label: string; delivered: number }> }) {
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
                    {payload[0].value} توصيلة
                  </span>
                </div>
              );
            }}
            cursor={{ fill: '#F1F5F9' }}
          />
          <RBar
            dataKey="delivered"
            name="توصيلات"
            fill="#10B981"
            radius={[4, 4, 0, 0]}
            animationDuration={450}
          />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
