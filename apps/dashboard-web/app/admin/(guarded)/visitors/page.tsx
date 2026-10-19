'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ChevronLeft, ChevronRight, Clock, Download, Eye, Globe,
  Layers, Link2, Loader2, Monitor, RefreshCw, Search, Smartphone, Tablet,
  Users, Wifi, X,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useToast } from '@/components/settings/ToastProvider';
import { downloadCsv } from '@/lib/csv';
import {
  PageHeader, Panel, LoadingBlock, TONE_ICON, TONE_TEXT,
} from '@/components/admin/ui';
import { cn, cn as cnLib } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

type DeviceKey = 'desktop' | 'mobile' | 'tablet';

const DEVICE_META: Record<DeviceKey, { label: string; color: string; bg: string }> = {
  desktop: { label: 'كمبيوتر',  color: '#0891b2', bg: '#0891b21A' },
  mobile:  { label: 'موبايل',   color: '#9333ea', bg: '#9333ea1A' },
  tablet:  { label: 'تابلت',    color: '#d97706', bg: '#d977061A' },
};
const DEVICE_ICONS: Record<DeviceKey, React.ComponentType<{ size?: number }>> = {
  desktop: Monitor,
  mobile:  Smartphone,
  tablet:  Tablet,
};

interface Visit {
  id: string;
  path: string;
  referrer?: string;
  device_type: DeviceKey;
  user_agent?: string;
  ip_address?: string;
  visitor_id?: string;
  user_id?: string;
  shop_id?: string;
  created_at: string;
}

interface DeviceCount  { device_type: string; label: string; visits: number }
interface PathCount    { path: string; visits: number }
interface RefCount     { referrer: string; visits: number }
interface DayCount     { date: string; visits: number; unique_visitors: number }

interface Stats {
  total_visits:    number;
  unique_visitors: number;
  today_visits:    number;
  live_visits:     number;
  pages_count:     number;
  by_device:       DeviceCount[];
  top_pages:       PathCount[];
  top_referrers:   RefCount[];
  by_day:          DayCount[];
  recent:          Visit[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: any) => Math.round(Number(v || 0)).toLocaleString('ar-EG');

function fmtDateTime(v?: string) {
  if (!v) return '—';
  const dt = new Date(v);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleString('ar-EG', { hour12: true });
}

function referrerHost(ref?: string): string {
  if (!ref || ref === 'مباشر') return 'مباشر';
  try { return new URL(ref).hostname.replace(/^www\./, ''); }
  catch { return ref.length > 40 ? ref.slice(0, 40) + '…' : ref; }
}

function deviceInfo(d?: string): { label: string; color: string; bg: string } {
  const k = d as DeviceKey;
  return DEVICE_META[k] ?? { label: 'غير معروف', color: '#64748B', bg: '#64748B1A' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

function KpiCard({
  icon: Icon, label, value, tone, sub, live = false,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
  tone: keyof typeof TONE_ICON;
  sub?: string;
  live?: boolean;
}) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden">
      {live && (
        <span className="absolute top-4 left-4 flex items-center gap-1.5 text-[10px] font-black text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          مباشر
        </span>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">{label}</p>
          <p className={cn('text-2xl md:text-3xl font-black mt-1.5 tabular-nums', TONE_TEXT[tone])}>{value}</p>
          {sub && <p className="text-slate-400 text-[10px] font-bold mt-1">{sub}</p>}
        </div>
        <div className={cn('p-3 rounded-2xl', TONE_ICON[tone])}><Icon size={20} /></div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminVisitorsPage() {
  const { toast } = useToast();

  // filters
  const [days,        setDays]        = useState(7);
  const [device,      setDevice]      = useState('');
  const [pathQuery,   setPathQuery]   = useState('');
  const [appliedPath, setAppliedPath] = useState('');

  // data
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [visits,   setVisits]   = useState<Visit[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(false);

  // ui state
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRef,    setAutoRef]    = useState(false);
  const [activeTab,  setActiveTab]  = useState<'pages' | 'referrers'>('pages');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── query string ──
  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('days', String(days));
    if (device)            p.set('device_type', device);
    if (appliedPath.trim()) p.set('path', appliedPath.trim());
    return p;
  }, [days, device, appliedPath]);

  // ── load helpers ──
  const loadStats = useCallback(async () => {
    const data = await apiRequest<Stats>(`/analytics/visits/stats?${query}`);
    setStats(data ?? null);
  }, [query]);

  const loadVisits = useCallback(async (targetPage: number) => {
    const p = new URLSearchParams(query);
    p.set('page',  String(targetPage));
    p.set('limit', String(PAGE_SIZE));

    // apiRequest unwraps .data, but we need .meta.total too.
    // Cast to any to read the wrapper before unwrapping.
    const raw = await (apiRequest as any)(`/analytics/visits?${p}`, {}, /* raw */ true).catch(
      () => apiRequest<any>(`/analytics/visits?${p}`)
    );

    // If the raw call returned a wrapper {success, data, meta} use it; otherwise treat as array
    let list: Visit[] = [];
    let metaTotal = 0;
    let metaHasMore = false;

    if (raw && typeof raw === 'object' && 'success' in raw) {
      list = Array.isArray(raw.data) ? raw.data : [];
      metaTotal   = raw.meta?.total   ?? 0;
      metaHasMore = raw.meta?.hasMore ?? list.length === PAGE_SIZE;
    } else if (Array.isArray(raw)) {
      list = raw;
      metaHasMore = list.length === PAGE_SIZE;
    }

    setVisits(list);
    setTotal(metaTotal);
    setHasMore(metaHasMore);
  }, [query]);

  const loadAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      await Promise.all([loadStats(), loadVisits(page)]);
    } catch (e: any) {
      toast({ title: e?.message || 'فشل تحميل بيانات الزيارات', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadStats, loadVisits, page, toast]);

  // reload on filter change
  useEffect(() => {
    setPage(1);
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, device, appliedPath]);

  // auto-refresh every 30 s
  useEffect(() => {
    if (autoRef) {
      timerRef.current = setInterval(() => loadAll(true), 30_000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRef, loadAll]);

  const goToPage = (next: number) => {
    if (next < 1) return;
    setPage(next);
    loadVisits(next).catch(() => setVisits([]));
  };

  const hasFilters = !!device || !!appliedPath;
  const clearFilters = () => { setDevice(''); setPathQuery(''); setAppliedPath(''); };

  // chart helpers
  const maxDayVisits = useMemo(
    () => Math.max(...(stats?.by_day || []).map((d) => Number(d.visits || 0)), 1),
    [stats],
  );
  const maxPageVisits = useMemo(
    () => Math.max(...(stats?.top_pages || []).map((p) => Number(p.visits || 0)), 1),
    [stats],
  );
  const maxRefVisits = useMemo(
    () => Math.max(...(stats?.top_referrers || []).map((r) => Number(r.visits || 0)), 1),
    [stats],
  );
  const deviceTotal = useMemo(
    () => (stats?.by_device || []).reduce((s, d) => s + Number(d.visits || 0), 0),
    [stats],
  );

  const handleExportCsv = () => {
    if (!visits.length) return;
    downloadCsv(
      `visitors-${days}d-${new Date().toISOString().slice(0, 10)}`,
      ['الصفحة', 'الجهاز', 'المصدر', 'IP', 'التاريخ'],
      visits.map((v) => [
        v.path || '/',
        deviceInfo(v.device_type).label,
        referrerHost(v.referrer),
        v.ip_address || '—',
        fmtDateTime(v.created_at),
      ]),
    ).catch(() => toast({ title: 'فشل التصدير', variant: 'destructive' }));
  };

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Header ── */}
      <PageHeader
        icon={Eye}
        title="زيارات الموقع"
        subtitle="من دخل الموقع، على أي صفحة، ومن أي جهاز ومصدر"
        tone="purple"
        actions={
          <>
            {/* Days */}
            <div className="flex gap-1.5">
              {[1, 7, 14, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cnLib(
                    'px-3 py-1.5 rounded-xl text-[11px] font-black transition-colors',
                    days === d
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {d === 1 ? 'اليوم' : `${d}يوم`}
                </button>
              ))}
            </div>

            {/* Device */}
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-white border border-slate-200 text-slate-700"
            >
              <option value="">كل الأجهزة</option>
              <option value="desktop">كمبيوتر</option>
              <option value="mobile">موبايل</option>
              <option value="tablet">تابلت</option>
            </select>

            {/* Path search */}
            <form
              onSubmit={(e) => { e.preventDefault(); setAppliedPath(pathQuery); }}
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5"
            >
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                value={pathQuery}
                onChange={(e) => setPathQuery(e.target.value)}
                placeholder="ابحث مسار..."
                className="bg-transparent text-[11px] font-bold text-slate-800 outline-none w-32 placeholder:text-slate-400"
              />
            </form>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
              >
                <X size={12} /> مسح
              </button>
            )}

            {/* Auto-refresh */}
            <button
              onClick={() => setAutoRef((v) => !v)}
              className={cnLib(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-colors',
                autoRef
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
              )}
            >
              <Wifi size={12} />
              {autoRef ? 'تحديث تلقائي' : 'تلقائي'}
            </button>

            {/* Manual refresh */}
            <button
              onClick={() => loadAll(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
            >
              {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              تحديث
            </button>

            {/* CSV export */}
            <button
              onClick={handleExportCsv}
              disabled={!visits.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <Download size={13} />
              CSV
            </button>
          </>
        }
      />

      {/* ── Loading skeleton ── */}
      {loading ? (
        <Panel><LoadingBlock /></Panel>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard icon={Eye} label="إجمالي الزيارات" value={fmt(stats?.total_visits)} tone="purple" sub={`آخر ${days} يوم`} />
            <KpiCard icon={Users} label="زوار فريدون" value={fmt(stats?.unique_visitors)} tone="indigo" />
            <KpiCard icon={Clock} label="زيارات اليوم" value={fmt(stats?.today_visits)} tone="cyan" />
            <KpiCard icon={Activity} label="الآن (5 دقائق)" value={fmt(stats?.live_visits)} tone="green" live />
            <KpiCard icon={Layers} label="صفحات مختلفة" value={fmt(stats?.pages_count)} tone="amber" />
          </div>

          {/* ── Daily chart ── */}
          <Panel className="p-6">
            <div className="flex items-center justify-between gap-3 mb-6">
              <h3 className="text-slate-900 font-black text-lg">
                الزيارات اليومية
                <span className="text-slate-400 text-sm font-bold mr-2">({days} يوم)</span>
              </h3>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-3 h-3 rounded bg-cyan-500" /> كل الزيارات
                </span>
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-3 h-3 rounded bg-purple-500" /> زوار فريدون
                </span>
              </div>
            </div>

            {(stats?.by_day || []).length === 0 ? (
              <div className="text-slate-400 font-bold py-16 text-center">لا توجد بيانات</div>
            ) : (
              <div className="w-full min-h-[260px] flex items-end gap-1 pt-4 overflow-x-auto">
                {(stats?.by_day || []).map((item) => {
                  const vH  = Math.max(4, (Number(item.visits          || 0) / maxDayVisits) * 200);
                  const uvH = Math.max(4, (Number(item.unique_visitors || 0) / maxDayVisits) * 200);
                  return (
                    <div key={item.date} className="flex-1 min-w-[28px] flex flex-col items-center gap-2 group cursor-default">
                      {/* tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-lg whitespace-nowrap">
                        {fmt(item.visits)} زيارة · {fmt(item.unique_visitors)} فريد
                      </div>
                      <div className="w-full flex items-end justify-center gap-[2px] h-[200px]">
                        <div
                          className="w-1/2 bg-gradient-to-t from-cyan-500/40 to-cyan-500 rounded-t-md transition-all"
                          style={{ height: `${vH}px` }}
                        />
                        <div
                          className="w-1/2 bg-gradient-to-t from-purple-500/40 to-purple-500 rounded-t-md transition-all"
                          style={{ height: `${uvH}px` }}
                        />
                      </div>
                      <div className="text-[9px] font-bold text-slate-400">{String(item.date).slice(5)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* ── Device breakdown + Top Pages/Referrers ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Device */}
            <Panel className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-slate-900 font-black text-lg">الأجهزة</h3>
                <span className="text-slate-400 text-xs font-black">{fmt(deviceTotal)} زيارة</span>
              </div>
              {(stats?.by_device || []).length === 0 ? (
                <div className="text-slate-400 font-bold py-10 text-center">لا توجد بيانات</div>
              ) : (
                <div className="space-y-5">
                  {(stats?.by_device || []).map((item) => {
                    const Icon  = DEVICE_ICONS[item.device_type as DeviceKey] ?? Monitor;
                    const info  = deviceInfo(item.device_type);
                    const share = deviceTotal > 0 ? Math.round((Number(item.visits || 0) / deviceTotal) * 100) : 0;
                    return (
                      <div key={item.device_type}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg" style={{ background: info.bg, color: info.color }}>
                              <Icon size={16} />
                            </span>
                            <span className="text-slate-800 font-black text-sm">{item.label || info.label}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-slate-900 font-black text-sm">{fmt(item.visits)}</span>
                            <span className="text-slate-400 text-xs font-bold">{share}%</span>
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${share}%`, background: info.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            {/* Pages / Referrers tabs */}
            <Panel className="lg:col-span-2 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('pages')}
                    className={cnLib(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-colors',
                      activeTab === 'pages'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:text-slate-900'
                    )}
                  >
                    <Globe size={12} /> أكثر الصفحات
                  </button>
                  <button
                    onClick={() => setActiveTab('referrers')}
                    className={cnLib(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-colors',
                      activeTab === 'referrers'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:text-slate-900'
                    )}
                  >
                    <Link2 size={12} /> مصادر الزيارات
                  </button>
                </div>
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  {activeTab === 'pages' ? 'TOP PAGES' : 'REFERRERS'}
                </span>
              </div>

              {activeTab === 'pages' ? (
                (stats?.top_pages || []).length === 0 ? (
                  <div className="text-slate-400 font-bold py-10 text-center">لا توجد بيانات</div>
                ) : (
                  <div className="space-y-3">
                    {(stats?.top_pages || []).slice(0, 12).map((item, i) => (
                      <div key={`${item.path}-${i}`} className="space-y-1 group">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-slate-400 font-black text-[10px] w-4 shrink-0">
                              {i + 1}
                            </span>
                            <span
                              className="text-slate-700 font-bold text-xs truncate"
                              title={item.path}
                            >
                              {item.path || '/'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-cyan-600 font-black text-xs">{fmt(item.visits)}</span>
                            <span className="text-slate-400 text-[10px] font-bold">
                              {maxPageVisits > 0 ? Math.round((Number(item.visits) / maxPageVisits) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500/40 to-cyan-500 rounded-full transition-all"
                            style={{ width: `${Math.max(2, (Number(item.visits) / maxPageVisits) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                (stats?.top_referrers || []).length === 0 ? (
                  <div className="text-slate-400 font-bold py-10 text-center">لا توجد بيانات</div>
                ) : (
                  <div className="space-y-3">
                    {(stats?.top_referrers || []).map((item, i) => (
                      <div key={`${item.referrer}-${i}`} className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-slate-400 font-black text-[10px] w-4 shrink-0">{i + 1}</span>
                            <span className="text-slate-700 font-bold text-xs truncate" title={item.referrer}>
                              {referrerHost(item.referrer)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-purple-600 font-black text-xs">{fmt(item.visits)}</span>
                            <span className="text-slate-400 text-[10px]">
                              {maxRefVisits > 0 ? Math.round((Number(item.visits) / maxRefVisits) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500/40 to-purple-500 rounded-full transition-all"
                            style={{ width: `${Math.max(2, (Number(item.visits) / maxRefVisits) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </Panel>
          </div>

          {/* ── Visit log table ── */}
          <Panel className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h3 className="text-slate-900 font-black text-lg">سجل الزيارات</h3>
                {total > 0 && (
                  <p className="text-slate-400 text-xs font-bold mt-0.5">
                    {fmt(total)} زيارة · صفحة {page} من {Math.ceil(total / PAGE_SIZE)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-xl bg-slate-100 text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
                <span className="text-slate-600 font-black text-xs px-2">
                  {page} / {total > 0 ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1}
                </span>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={!hasMore}
                  className="p-2 rounded-xl bg-slate-100 text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>

            {visits.length === 0 ? (
              <div className="text-slate-400 font-bold py-12 text-center flex flex-col items-center gap-3">
                <Eye size={32} className="opacity-40" />
                لا توجد زيارات مسجلة في هذه الفترة
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                      <th className="pb-3 px-3">الصفحة</th>
                      <th className="pb-3 px-3">الجهاز</th>
                      <th className="pb-3 px-3">المصدر</th>
                      <th className="pb-3 px-3">IP</th>
                      <th className="pb-3 px-3">الزائر</th>
                      <th className="pb-3 px-3">الوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((v) => {
                      const info = deviceInfo(v.device_type);
                      const Icon = DEVICE_ICONS[v.device_type] ?? Monitor;
                      return (
                        <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="text-slate-800 font-bold text-xs max-w-[200px] truncate" title={v.path}>
                              {v.path || '/'}
                            </div>
                            {v.shop_id && (
                              <div className="text-slate-400 text-[10px] font-bold mt-0.5">
                                متجر #{v.shop_id.slice(0, 6)}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black"
                              style={{ background: info.bg, color: info.color }}
                            >
                              <Icon size={12} />
                              {info.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="text-slate-600 font-bold text-xs">
                              {referrerHost(v.referrer)}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="text-slate-500 font-mono text-[10px]" dir="ltr">
                              {v.ip_address || '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="text-slate-400 font-mono text-[10px]" dir="ltr">
                              {v.visitor_id ? v.visitor_id.slice(0, 8) + '…' : '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="text-slate-500 font-bold text-[10px] whitespace-nowrap">
                              {fmtDateTime(v.created_at)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                <span className="text-slate-500 text-xs font-bold">
                  عرض {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} من {fmt(total)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-slate-100 text-slate-700 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                  >
                    <ChevronRight size={13} /> السابق
                  </button>
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={!hasMore}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-slate-100 text-slate-700 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                  >
                    التالي <ChevronLeft size={13} />
                  </button>
                </div>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
