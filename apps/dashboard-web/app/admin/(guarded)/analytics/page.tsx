'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, RefreshCw, TrendingUp, Users, Store, ShoppingBag, Eye, Clock,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useToast } from '@/components/settings/ToastProvider';
import { PageHeader, Panel, LoadingBlock, formatEGP, TONE_ICON, TONE_TEXT } from '@/components/admin/ui';
import { cn } from '@/lib/cn';

const DAYS_OPTIONS = [7, 14, 30] as const;

export default function AdminAnalyticsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState<number>(DAYS_OPTIONS[1]);
  const [kpis, setKpis] = useState<any>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [a, s, act] = await Promise.all([
        apiRequest('/analytics/system'),
        apiRequest(`/analytics/system/timeseries?days=${days}`).catch(() => []),
        apiRequest('/analytics/system/activity?take=12').catch(() => []),
      ]);
      setKpis(a || null);
      setSeries(Array.isArray(s) ? s : []);
      setActivity(Array.isArray(act) ? act : []);
    } catch (e: any) {
      toast({ title: e?.message || 'فشل تحميل التحليلات', variant: 'destructive' });
      setKpis(null); setSeries([]); setActivity([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [days]);

  const chartData = useMemo(() => {
    return (Array.isArray(series) ? series : []).map((x) => ({
      name: String(x?.date || '').slice(5),
      revenue: Math.round(Number(x?.revenue || 0)),
      orders: Math.round(Number(x?.orders || 0)),
    }));
  }, [series]);

  const maxRevenue = useMemo(() => Math.max(...chartData.map((d) => d.revenue), 1), [chartData]);

  const kpisList = [
    { icon: TrendingUp, label: 'إجمالي الإيرادات', value: formatEGP(kpis?.totalRevenue), tone: 'cyan' as const },
    { icon: ShoppingBag, label: 'إجمالي الطلبات', value: Math.round(Number(kpis?.totalOrders || 0)).toLocaleString('ar-EG'), tone: 'green' as const },
    { icon: Users, label: 'إجمالي المستخدمين', value: Math.round(Number(kpis?.totalUsers || 0)).toLocaleString('ar-EG'), tone: 'indigo' as const },
    { icon: Store, label: 'إجمالي المتاجر', value: Math.round(Number(kpis?.totalShops || 0)).toLocaleString('ar-EG'), tone: 'amber' as const },
    { icon: Eye, label: 'إجمالي الزيارات', value: Math.round(Number(kpis?.totalVisits || 0)).toLocaleString('ar-EG'), tone: 'purple' as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="تحليلات المنصة"
        subtitle="إحصائيات ومؤشرات الأداء"
        tone="cyan"
        actions={
          <>
            <div className="flex gap-2">
              {DAYS_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-black transition-colors',
                    days === d ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {d} يوم
                </button>
              ))}
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="px-4 py-2 rounded-xl text-xs font-black bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60 inline-flex items-center gap-2"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              تحديث
            </button>
          </>
        }
      />

      {loading ? (
        <Panel><LoadingBlock /></Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpisList.map((k) => (
              <div key={k.label} className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-wider">{k.label}</p>
                    <p className={cn('text-xl font-black mt-2 tabular-nums', TONE_TEXT[k.tone])}>{k.value}</p>
                  </div>
                  <div className={cn('p-3 rounded-2xl', TONE_ICON[k.tone])}><k.icon size={20} /></div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel className="lg:col-span-2 p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-slate-900 font-black text-lg">الإيرادات ({days} يوم)</h3>
                <div className="text-slate-400 text-xs font-black uppercase tracking-widest">يومي</div>
              </div>
              <div className="w-full min-h-[280px] flex items-end gap-2 pt-4">
                {chartData.length === 0 ? (
                  <div className="w-full text-center text-slate-400 font-bold py-20">لا توجد بيانات</div>
                ) : chartData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="text-[10px] font-black text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.revenue.toLocaleString()}
                    </div>
                    <div
                      className="w-full bg-gradient-to-t from-cyan-500/40 to-cyan-500 rounded-t-lg transition-all hover:from-cyan-500/60"
                      style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 240)}px` }}
                      title={`${d.name}: ${d.revenue.toLocaleString()} ج.م`}
                    />
                    <div className="text-[9px] font-bold text-slate-400">{d.name}</div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-900 font-black text-lg">النشاط الأخير</h3>
                <Clock size={16} className="text-slate-400" />
              </div>
              <div className="space-y-3">
                {activity.length === 0 ? (
                  <div className="text-slate-400 font-bold text-sm">لا يوجد نشاط</div>
                ) : activity.slice(0, 10).map((e, i) => (
                  <div key={String(e?.id || i)} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: String(e?.color || '#0891b2') }} />
                    <div className="flex-1">
                      <div className="text-slate-700 font-bold text-sm leading-6">{String(e?.title || '')}</div>
                      <div className="text-slate-400 font-bold text-xs mt-1">
                        {(() => {
                          const dt = new Date(e?.createdAt || 0);
                          return !Number.isNaN(dt.getTime()) ? dt.toLocaleString('ar-EG') : '';
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
