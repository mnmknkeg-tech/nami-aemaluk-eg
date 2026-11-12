'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Target, TrendingDown, CircleDollarSign, Activity, Gauge } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import { downloadCSV, type PeriodKey } from './financeShared';
import { fmtNum, fmtEGP, fmtPct } from './InsightsShared';

/* صفحة التحويلات — بيانات حقيقية من /analytics/shop/:id/conversions */

type FunnelStage = { id: string; label: string; label_ar: string; visitors: number };
type ConversionGoal = {
  id: string;
  name: string;
  name_ar: string;
  conversions: number;
  visitors: number;
  rate: number;
  target: number;
  status: string;
};
type ConversionSource = {
  id: string;
  source: string;
  source_ar: string;
  visits: number;
  conversions: number;
  rate: number;
  revenue: number;
  trend: number;
};
type TimelinePoint = { day: string; rate: number; conversions: number };
type ConversionsData = {
  funnel: FunnelStage[];
  goals: ConversionGoal[];
  sources: ConversionSource[];
  timeline: TimelinePoint[];
  overall_rate: number;
  total_conversions: number;
  total_revenue: number;
  avg_rate: number;
};

/** فترة الصفحة → مدة تقرير التحويلات من الباك إند (7/30/90 يوم) */
const periodToDays = (p: PeriodKey): '7' | '30' | '90' =>
  p === 'today' || p === 'd7' ? '7' : p === 'd30' || p === 'month' ? '30' : '90';

const GOAL_STATUS: Record<string, { label: string; cls: string }> = {
  'on-track': { label: 'على المسار', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'at-risk': { label: 'معرض للخطر', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  behind: { label: 'متأخر', cls: 'bg-red-50 text-red-700 border-red-200' },
};

export default function ConversionsSection({
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
  const [data, setData] = useState<ConversionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (d: '7' | '30' | '90') => {
      const shopId = shop?.id;
      if (!shopId) return;
      setError('');
      try {
        const res = await apiRequest(`/analytics/shop/${shopId}/conversions?period=${d}d`);
        setData(res || null);
      } catch (e: any) {
        setError(e?.message || 'تعذر تحميل بيانات التحويلات');
      } finally {
        setLoading(false);
      }
    },
    [shop?.id]
  );

  useEffect(() => {
    load(days);
  }, [days, load, refreshKey]);

  const funnel = useMemo(() => data?.funnel || [], [data]);
  const funnelTop = funnel[0]?.visitors || 0;

  useEffect(() => {
    if (loading || (data?.sources || []).length === 0) {
      registerExport(null);
      return;
    }
    registerExport(() =>
      downloadCSV(
        'conversions-sources.csv',
        ['Source', 'Visits', 'Conversions', 'Rate %', 'Revenue'],
        (data?.sources || []).map((s) => [
          s.source_ar || s.source,
          s.visits,
          s.conversions,
          s.rate.toFixed(2),
          Number(s.revenue || 0).toFixed(2),
        ])
      )
    );
    return () => registerExport(null);
  }, [data, loading, registerExport]);

  const kpis = useMemo(
    () => [
      { label: 'معدل التحويل الكلي', value: fmtPct(data?.overall_rate || 0) },
      { label: 'عدد التحويلات', value: fmtNum(data?.total_conversions || 0) },
      { label: 'إيراد التحويلات', value: fmtEGP(data?.total_revenue || 0) },
      { label: 'متوسط معدل المراحل', value: fmtPct(data?.avg_rate || 0) },
    ],
    [data]
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* ===== KPIs ===== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
            <p className="text-[11px] font-semibold text-slate-400">{k.label}</p>
            {loading ? (
              <div className="h-7 w-24 bg-slate-100 rounded-md animate-pulse mt-2" />
            ) : (
              <div className="text-[22px] font-extrabold text-slate-900 tabular-nums leading-7 mt-1">
                {k.value}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ===== Funnel ===== */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
          <Target size={15} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800">مسار التحويل</h3>
          <span className="text-[10px] text-slate-400 font-semibold mr-auto">
            نسبة كل مرحلة من إجمالي الزوار
          </span>
        </div>
        <div className="p-5 space-y-3">
          {loading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            ))
          ) : funnel.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold text-center py-6">
              لا توجد بيانات زوار بعد — أول زيارة للموقع ستغذي المسار تلقائيًا
            </p>
          ) : (
            funnel.map((s, i) => {
              const width = funnelTop > 0 ? Math.max((s.visitors / funnelTop) * 100, 3) : 3;
              const drop =
                i > 0 && funnel[i - 1].visitors > 0
                  ? Math.round((1 - s.visitors / funnel[i - 1].visitors) * 100)
                  : 0;
              return (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                    <span className="text-slate-700 font-bold">{s.label_ar || s.label}</span>
                    <span className="text-slate-500 tabular-nums">
                      {fmtNum(s.visitors)}
                      {drop > 0 && (
                        <span className="text-red-400 mr-2 inline-flex items-center gap-0.5">
                          <TrendingDown size={10} />
                          {drop}% تسرب
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-7 bg-slate-50 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg bg-indigo-600 transition-all duration-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ===== Goals + Sources ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Gauge size={15} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">أهداف التحويل</h3>
          </div>
          <div className="p-5 space-y-4">
            {loading ? (
              [0, 1].map((i) => (
                <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
              ))
            ) : (data?.goals || []).length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold text-center py-4">
                لا توجد أهداف معرّفة
              </p>
            ) : (
              data!.goals.map((g) => {
                const st = GOAL_STATUS[g.status] || GOAL_STATUS['behind'];
                const progress = g.target > 0 ? Math.min((g.rate / g.target) * 100, 100) : 0;
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {g.name_ar || g.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 tabular-nums">
                        {fmtPct(g.rate)} / {fmtPct(g.target)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Activity size={15} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">مصادر التحويل</h3>
          </div>
          {loading ? (
            <div className="p-5 space-y-2">
              <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : (data?.sources || []).length === 0 ? (
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
                {data!.sources.map((s) => (
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

      {/* ===== Timeline ===== */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
          <Activity size={15} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800">معدل التحويل يوميًا</h3>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
          ) : (data?.timeline || []).length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold text-center py-4">
              لا توجد بيانات يومية بعد
            </p>
          ) : (
            <div className="flex items-end gap-1.5 h-24 pt-4 border-b border-slate-200">
              {data!.timeline.map((t, i) => {
                const max = Math.max(...data!.timeline.map((x) => x.rate), 0.001);
                return (
                  <div key={i} className="flex-1 group relative h-full flex items-end">
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-600 bg-white border border-slate-200 rounded px-1 opacity-0 group-hover:opacity-100 whitespace-nowrap tabular-nums z-10">
                      {t.day}: {fmtPct(t.rate)}
                    </span>
                    <div
                      className="w-full bg-indigo-500 rounded-t"
                      style={{ height: `${Math.max((t.rate / max) * 100, 3)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
