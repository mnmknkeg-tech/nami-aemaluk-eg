'use client';

/**
 * تاب رؤى العملاء — من /analytics/shop/:id/customer-insights مع مؤشرات
 * ودونات الشرائح وقائمة أفضل العملاء. الفترة متزامنة مع فلتر الصفحة.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Users, UserPlus, Repeat, CircleDollarSign } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import {
  KpiCard,
  ChartCard,
  SectionSkeleton,
  ChartEmpty,
  Donut,
  downloadCSV,
  type PeriodKey,
} from './financeShared';
import { fmtNum, fmtEGP } from './InsightsShared';

type CustomerSegment = { segment: string; segment_ar: string; count: number; percentage: number };
type TopCustomer = { name: string; orders: number; spent: number };
type CustomerInsightsData = {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  avg_order_value: number;
  segments: CustomerSegment[];
  top_customers: TopCustomer[];
};

/** فترة الصفحة → مدة تقرير العملاء من الباك إند (7/30/90 يوم) */
const periodToDays = (p: PeriodKey): '7' | '30' | '90' =>
  p === 'today' || p === 'd7' ? '7' : p === 'd30' || p === 'month' ? '30' : '90';

export default function CustomerInsightsSection({
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
  const days = periodToDays(period);
  const [data, setData] = useState<CustomerInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (d: '7' | '30' | '90') => {
      const shopId = shop?.id;
      if (!shopId) return;
      setError('');
      try {
        const res = await apiRequest(`/analytics/shop/${shopId}/customer-insights?period=${d}d`);
        setData(res || null);
      } catch (e: any) {
        setError(e?.message || 'تعذر تحميل تحليلات العملاء');
      } finally {
        setLoading(false);
      }
    },
    [shop?.id]
  );

  useEffect(() => {
    load(days);
  }, [days, load, refreshKey]);

  const segments = data?.segments || [];
  const topCustomers = data?.top_customers || [];

  const segmentDonut = useMemo(
    () =>
      segments
        .map((s) => ({ name: s.segment_ar || s.segment, value: s.count }))
        .filter((d) => d.value > 0),
    [segments]
  );

  useEffect(() => {
    if (loading || topCustomers.length === 0) {
      registerExport(null);
      return;
    }
    registerExport(() =>
      downloadCSV(
        'top-customers.csv',
        ['Customer', 'Orders', 'Spent'],
        topCustomers.map((c) => [c.name || '—', c.orders, Number(c.spent || 0).toFixed(2)])
      )
    );
    return () => registerExport(null);
  }, [topCustomers, loading, registerExport]);

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
        <KpiCard icon={Users} label="إجمالي العملاء" value={fmtNum(data?.total_customers || 0)} />
        <KpiCard
          icon={UserPlus}
          label="عملاء جدد"
          value={fmtNum(data?.new_customers || 0)}
          valueClass="text-emerald-600"
        />
        <KpiCard
          icon={Repeat}
          label="عملاء عائدون"
          value={fmtNum(data?.returning_customers || 0)}
          valueClass="text-indigo-600"
        />
        <KpiCard
          icon={CircleDollarSign}
          label="متوسط قيمة الطلب"
          value={fmtEGP(data?.avg_order_value || 0)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* شرائح العملاء */}
        <ChartCard title="شرائح العملاء" sub="جديد مقابل عائد">
          {segmentDonut.length > 0 ? (
            <Donut
              data={segmentDonut}
              centerValue={fmtNum(data?.total_customers || 0)}
              centerLabel="عميل"
            />
          ) : (
            <ChartEmpty hint="أول عميل شراء سيصنّف تلقائيًا" />
          )}
        </ChartCard>

        {/* أفضل العملاء */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <CircleDollarSign size={15} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">أفضل العملاء</h3>
          </div>
          {topCustomers.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={24} className="mx-auto mb-2 text-slate-200" />
              <p className="text-xs font-semibold text-slate-400">
                لا توجد مشتريات بعد — أوائل العملاء هيظهروا هنا
              </p>
            </div>
          ) : (
            <div className="px-5 py-2 divide-y divide-slate-50">
              {topCustomers.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {(c.name || '?')?.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{c.name || 'عميل'}</p>
                    <p className="text-[10px] text-slate-400 tabular-nums">
                      {fmtNum(c.orders)} طلب
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 tabular-nums">
                    {fmtEGP(c.spent)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
