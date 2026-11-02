'use client';

/**
 * تاب التسويق — قنوات الترافيك وأداء المصادر وتحويلاتها من بيانات
 * حقيقية (/traffic + /conversions): دونات القنوات، معدل التحويل،
 * وجدول أداء المصادر بالإيراد.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Megaphone, Target, Receipt, TrendingUp } from 'lucide-react';
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
import { fmtNum, fmtEGP, fmtPct } from './InsightsShared';

type TrafficSource = { source: string; source_ar: string; visits: number; percentage: number };
type TrafficData = { total_visitors: number; sources: TrafficSource[] };
type ConversionSource = {
  id: string;
  source: string;
  source_ar: string;
  visits: number;
  conversions: number;
  rate: number;
  revenue: number;
};
type ConversionsData = {
  sources: ConversionSource[];
  overall_rate: number;
  total_conversions: number;
  total_revenue: number;
};

const periodToDays = (p: PeriodKey): '7' | '30' | '90' =>
  p === 'today' || p === 'd7' ? '7' : p === 'd30' || p === 'month' ? '30' : '90';

export default function MarketingSection({
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
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [conversions, setConversions] = useState<ConversionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (d: '7' | '30' | '90') => {
      const shopId = shop?.id;
      if (!shopId) return;
      setError('');
      const [tRes, cRes] = await Promise.allSettled([
        apiRequest(`/analytics/shop/${shopId}/traffic?period=${d}d`),
        apiRequest(`/analytics/shop/${shopId}/conversions?period=${d}d`),
      ]);
      setTraffic(tRes.status === 'fulfilled' ? tRes.value?.data || tRes.value || null : null);
      setConversions(cRes.status === 'fulfilled' ? cRes.value?.data || cRes.value || null : null);
      if (tRes.status === 'rejected' && cRes.status === 'rejected') {
        setError('تعذر تحميل بيانات التسويق');
      }
      setLoading(false);
    },
    [shop?.id]
  );

  useEffect(() => {
    load(days);
  }, [days, load, refreshKey]);

  const sources = traffic?.sources || [];
  const convSources = conversions?.sources || [];

  const sourceDonut = useMemo(
    () =>
      sources
        .map((s) => ({ name: s.source_ar || s.source, value: Number(s.visits || 0) }))
        .filter((d) => d.value > 0),
    [sources]
  );

  const bestSource = useMemo(() => {
    if (convSources.length === 0) return null;
    return [...convSources].sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))[0];
  }, [convSources]);

  useEffect(() => {
    if (loading || convSources.length === 0) {
      registerExport(null);
      return;
    }
    registerExport(() =>
      downloadCSV(
        'marketing-sources.csv',
        ['Source', 'Visits', 'Conversions', 'Rate %', 'Revenue'],
        convSources.map((s) => [
          s.source_ar || s.source,
          s.visits,
          s.conversions,
          s.rate.toFixed(2),
          Number(s.revenue || 0).toFixed(2),
        ])
      )
    );
    return () => registerExport(null);
  }, [convSources, loading, registerExport]);

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
        <KpiCard
          icon={Target}
          label="معدل التحويل الكلي"
          value={fmtPct(conversions?.overall_rate || 0)}
        />
        <KpiCard
          icon={Megaphone}
          label="عدد التحويلات"
          value={fmtNum(conversions?.total_conversions || 0)}
        />
        <KpiCard
          icon={Receipt}
          label="إيراد التحويلات"
          value={fmtEGP(conversions?.total_revenue || 0)}
          valueClass="text-emerald-600"
        />
        <KpiCard
          icon={TrendingUp}
          label="أفضل مصدر"
          value={bestSource ? bestSource.source_ar || bestSource.source : '—'}
          sub={bestSource ? fmtEGP(bestSource.revenue) : undefined}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* قنوات الترافيك */}
        <ChartCard title="قنوات الترافيك" sub="توزيع الزيارات">
          {sourceDonut.length > 0 ? (
            <Donut
              data={sourceDonut}
              centerValue={fmtNum(traffic?.total_visitors || 0)}
              centerLabel="زيارة"
            />
          ) : (
            <ChartEmpty hint="أول زيارة للموقع ستغذي التحليلات تلقائيًا" />
          )}
        </ChartCard>

        {/* أداء المصادر */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Megaphone size={15} className="text-rose-600" />
            <h3 className="text-sm font-bold text-slate-800">أداء المصادر</h3>
          </div>
          {convSources.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold text-center py-8">
              لا توجد بيانات مصادر بعد
            </p>
          ) : (
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-[10px] font-semibold text-slate-400 pb-2 pr-5">المصدر</th>
                  <th className="text-[10px] font-semibold text-slate-400 pb-2">زيارات</th>
                  <th className="text-[10px] font-semibold text-slate-400 pb-2">تحويلات</th>
                  <th className="text-[10px] font-semibold text-slate-400 pb-2">المعدل</th>
                  <th className="text-[10px] font-semibold text-slate-400 pb-2 pl-5 text-left">
                    الإيراد
                  </th>
                </tr>
              </thead>
              <tbody>
                {convSources.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="py-2.5 pr-5 text-xs font-bold text-slate-800">
                      {s.source_ar || s.source}
                    </td>
                    <td className="py-2.5 text-xs text-slate-600 tabular-nums">
                      {fmtNum(s.visits)}
                    </td>
                    <td className="py-2.5 text-xs text-slate-600 tabular-nums">
                      {fmtNum(s.conversions)}
                    </td>
                    <td className="py-2.5 text-xs font-bold text-slate-800 tabular-nums">
                      {fmtPct(s.rate)}
                    </td>
                    <td className="py-2.5 pl-5 text-xs font-bold text-slate-900 tabular-nums text-left">
                      {fmtEGP(s.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
