'use client';

/**
 * تاب التفاعل — سلوك الزوار مع المتجر من بيانات حقيقية: مشاهدات الصفحات،
 * أعلى المنتجات/الصفحات تفاعلًا، معدل الارتداد، وتقدم مسار التحويل.
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
import { Eye, HeartHandshake, Timer, Target } from 'lucide-react';
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

type TrafficPage = { path: string; views: number };
type TrafficData = {
  total_visitors: number;
  unique_visitors: number;
  avg_session: string;
  bounce_rate: number;
  pages: TrafficPage[];
};
type ConversionsData = {
  funnel: { id: string; label_ar: string; label: string; visitors: number }[];
  overall_rate: number;
};

const LOCALE = 'ar-EG-u-nu-latn';
const fmtNum = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 });

const periodToDays = (p: PeriodKey): '7' | '30' | '90' =>
  p === 'today' || p === 'd7' ? '7' : p === 'd30' || p === 'month' ? '30' : '90';

export default function EngagementSection({
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
        setError('تعذر تحميل بيانات التفاعل');
      }
      setLoading(false);
    },
    [shop?.id]
  );

  useEffect(() => {
    load(days);
  }, [days, load, refreshKey]);

  const pages = useMemo(
    () => [...(traffic?.pages || [])].sort((a, b) => Number(b.views || 0) - Number(a.views || 0)),
    [traffic]
  );
  const pageViews = pages.reduce((s, p) => s + Number(p.views || 0), 0);
  const visitors = Number(traffic?.unique_visitors || 0);
  const viewsPerVisit = visitors > 0 ? pageViews / visitors : 0;
  const funnel = conversions?.funnel || [];

  /** آخر مرحلة تحويل كنسبة من الزوار = أعمق تفاعل محقق */
  const deepestConversion = funnel.length > 0 ? funnel[funnel.length - 1] : null;

  const topPages = pages
    .slice(0, 8)
    .map((p) => ({ name: (p.path || '/').slice(0, 24), views: Number(p.views || 0) }));
  const funnelBars = funnel.map((f) => ({
    name: f.label_ar || f.label,
    visitors: Number(f.visitors || 0),
  }));

  useEffect(() => {
    if (loading || pages.length === 0) {
      registerExport(null);
      return;
    }
    registerExport(() =>
      downloadCSV(
        'engagement-pages.csv',
        ['Page', 'Views'],
        pages.map((p) => [p.path || '/', p.views])
      )
    );
    return () => registerExport(null);
  }, [pages, loading, registerExport]);

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
        <KpiCard icon={Eye} label="مشاهدات الصفحات" value={fmtNum(pageViews)} />
        <KpiCard
          icon={HeartHandshake}
          label="مشاهدات لكل زيارة"
          value={visitors > 0 ? viewsPerVisit.toFixed(1) : '—'}
          sub={`من ${fmtNum(visitors)} زائر`}
        />
        <KpiCard
          icon={Timer}
          label="متوسط مدة الجلسة"
          value={String(traffic?.avg_session || '—')}
        />
        <KpiCard
          icon={Target}
          label="أعمق تفاعل"
          value={deepestConversion ? fmtNum(deepestConversion.visitors) : '—'}
          sub={
            deepestConversion ? deepestConversion.label_ar || deepestConversion.label : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* أكثر الصفحات تفاعلًا */}
        <ChartCard title="أكثر الصفحات تفاعلًا" sub="حسب المشاهدات">
          {topPages.length > 0 ? (
            <PagesBars data={topPages} />
          ) : (
            <ChartEmpty hint="أول زيارة للموقع ستغذي التحليلات تلقائيًا" />
          )}
        </ChartCard>

        {/* تقدم مسار التحويل */}
        <ChartCard title="تقدم تفاعل الزوار" sub="عدد الزوار في كل مرحلة">
          {funnelBars.length > 0 ? <FunnelBars data={funnelBars} /> : <ChartEmpty />}
        </ChartCard>
      </div>
    </div>
  );
}

const AXIS_STYLE = { fontSize: 10, fill: '#94A3B8', fontWeight: 600 };
const compact = (v: number) => String(Math.round(Number(v || 0)));
const fmtAr = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 });

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
            fill="#8B5CF6"
            radius={[0, 4, 4, 0]}
            animationDuration={450}
          />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FunnelBars({ data }: { data: Array<{ name: string; visitors: number }> }) {
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
            width={120}
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
                    {fmtAr(payload[0].value)} زائر
                  </span>
                </div>
              );
            }}
            cursor={{ fill: '#F1F5F9' }}
          />
          <RBar
            dataKey="visitors"
            name="زوار"
            fill="#00B8CC"
            radius={[0, 4, 4, 0]}
            animationDuration={450}
          />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
