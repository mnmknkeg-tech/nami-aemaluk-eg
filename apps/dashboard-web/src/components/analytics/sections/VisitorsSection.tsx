'use client';

/**
 * تاب الزوار — بيانات حقيقية من /analytics/shop/:id/traffic:
 * زوار فريدون، مشاهدات، متوسط الجلسة، الارتداد، المصادر، الأجهزة،
 * وأكثر الصفحات زيارة.
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
import { Eye, Users, Timer, TrendingDown } from 'lucide-react';
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

type TrafficSource = { source: string; source_ar: string; visits: number; percentage: number };
type TrafficDevice = { device: string; device_ar: string; percentage: number; visits: number };
type TrafficPage = { path: string; views: number; percentage?: number };
type TrafficData = {
  total_visitors: number;
  unique_visitors: number;
  avg_session: string;
  bounce_rate: number;
  sources: TrafficSource[];
  devices: TrafficDevice[];
  pages: TrafficPage[];
};

const LOCALE = 'ar-EG-u-nu-latn';
const fmtNum = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 });

/** فترة الصفحة → مدة تقرير الترافيك من الباك إند (7/30/90 يوم) */
const periodToDays = (p: PeriodKey): '7' | '30' | '90' =>
  p === 'today' || p === 'd7' ? '7' : p === 'd30' || p === 'month' ? '30' : '90';

export default function VisitorsSection({
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
  const [data, setData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (d: '7' | '30' | '90') => {
      const shopId = shop?.id;
      if (!shopId) return;
      setError('');
      try {
        const res = await apiRequest(`/analytics/shop/${shopId}/traffic?period=${d}d`);
        setData(res?.data || res || null);
      } catch (e: any) {
        setError(e?.message || 'تعذر تحميل بيانات الزوار');
      } finally {
        setLoading(false);
      }
    },
    [shop?.id]
  );

  useEffect(() => {
    load(days);
  }, [days, load, refreshKey]);

  const sources = data?.sources || [];
  const devices = data?.devices || [];
  const pages = data?.pages || [];

  const sourceDonut = useMemo(
    () =>
      sources
        .map((s) => ({ name: s.source_ar || s.source, value: Number(s.visits || 0) }))
        .filter((d) => d.value > 0),
    [sources]
  );
  const deviceDonut = useMemo(
    () =>
      devices
        .map((d) => ({ name: d.device_ar || d.device, value: Number(d.visits || 0) }))
        .filter((d) => d.value > 0),
    [devices]
  );
  const topPages = useMemo(
    () =>
      [...pages]
        .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
        .slice(0, 8)
        .map((p) => ({ name: (p.path || '/').slice(0, 24), views: Number(p.views || 0) })),
    [pages]
  );

  const pageViews = pages.reduce((s, p) => s + Number(p.views || 0), 0);

  useEffect(() => {
    if (loading || sources.length === 0) {
      registerExport(null);
      return;
    }
    registerExport(() =>
      downloadCSV(
        'traffic-sources.csv',
        ['Source', 'Visits', 'Percentage'],
        sources.map((s) => [s.source_ar || s.source, s.visits, s.percentage])
      )
    );
    return () => registerExport(null);
  }, [sources, loading, registerExport]);

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
          icon={Users}
          label="زوار فريدون"
          value={fmtNum(data?.unique_visitors || 0)}
          sub={`إجمالي الزيارات: ${fmtNum(data?.total_visitors || 0)}`}
        />
        <KpiCard icon={Eye} label="مشاهدات الصفحات" value={fmtNum(pageViews)} />
        <KpiCard icon={Timer} label="متوسط مدة الجلسة" value={String(data?.avg_session || '—')} />
        <KpiCard
          icon={TrendingDown}
          label="معدل الارتداد"
          value={`${Number(data?.bounce_rate || 0).toFixed(1)}%`}
          valueClass={Number(data?.bounce_rate || 0) > 60 ? 'text-red-600' : 'text-slate-900'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* المصادر */}
        <ChartCard title="مصادر الزيارات">
          {sourceDonut.length > 0 ? (
            <Donut
              data={sourceDonut}
              centerValue={fmtNum(data?.total_visitors || 0)}
              centerLabel="زيارة"
            />
          ) : (
            <ChartEmpty hint="أول زيارة للموقع ستغذي التحليلات تلقائيًا" />
          )}
        </ChartCard>

        {/* الأجهزة */}
        <ChartCard title="الأجهزة المستخدمة">
          {deviceDonut.length > 0 ? (
            <Donut
              data={deviceDonut}
              centerValue={fmtNum(data?.total_visitors || 0)}
              centerLabel="زيارة"
            />
          ) : (
            <ChartEmpty />
          )}
        </ChartCard>
      </div>

      {/* أكثر الصفحات زيارة */}
      <ChartCard title="أكثر الصفحات زيارة" sub="حسب عدد المشاهدات">
        {topPages.length > 0 ? <PagesBars data={topPages} /> : <ChartEmpty />}
      </ChartCard>
    </div>
  );
}

const AXIS_STYLE = { fontSize: 10, fill: '#94A3B8', fontWeight: 600 };
const compact = (v: number) => String(Math.round(Number(v || 0)));

function PagesBars({ data }: { data: Array<{ name: string; views: number }> }) {
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
            tickFormatter={compact}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            width={130}
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
                    {fmtAr(payload[0].value)} مشاهدة
                  </span>
                </div>
              );
            }}
            cursor={{ fill: '#F1F5F9' }}
          />
          <RBar
            dataKey="views"
            name="مشاهدات"
            fill="#6366F1"
            radius={[0, 4, 4, 0]}
            animationDuration={450}
          />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

const fmtAr = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 });
