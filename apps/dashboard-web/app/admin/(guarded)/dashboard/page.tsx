'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Users, Store, ShoppingCart, DollarSign, Eye, RefreshCw, Wallet } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { fetchFinanceOverview, type FinanceOverview } from '@/lib/api/adminFinance';
import {
  PageHeader,
  Panel,
  LoadingBlock,
  formatEGP,
  timeAgo,
  BTN_GHOST,
  TONE_ICON,
  TONE_TEXT,
} from '@/components/admin/ui';
import { cn } from '@/lib/cn';

type Stats = {
  totalRevenue?: number;
  totalUsers?: number;
  totalShops?: number;
  totalOrders?: number;
  totalVisits?: number;
};

type ChartPoint = { name: string; revenue: number; orders: number };
type ActivityItem = { id: string; title: string; createdAt: string; color: string };

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  // سطر مالي مختصر على الصفحة الرئيسية — يوجّهني لصفحة المالية لوحدها.
  const [fin, setFin] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [s, ts, acts, f] = await Promise.all([
        apiRequest('/analytics/system').catch(() => null),
        apiRequest('/analytics/system/timeseries?days=7').catch(() => null),
        apiRequest('/analytics/system/activity?limit=10').catch(() => null),
        fetchFinanceOverview(),
      ]);
      setFin(f);

      setStats(
        s
          ? {
              totalRevenue: s.total_revenue ?? s.totalRevenue ?? 0,
              totalUsers: s.total_users ?? s.totalUsers ?? 0,
              totalShops: s.total_shops ?? s.totalShops ?? 0,
              totalOrders: s.total_orders ?? s.totalOrders ?? 0,
              totalVisits: s.total_visits ?? s.totalVisits ?? 0,
            }
          : {}
      );

      const mapped: ChartPoint[] = (Array.isArray(ts) ? ts : []).map((row: any) => {
        const date = String(row?.date || '').trim();
        const d = date ? new Date(date) : new Date();
        return {
          name: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
          revenue: Math.round(Number(row?.revenue || 0)),
          orders: Number(row?.orders || 0),
        };
      });
      setChartData(mapped);

      const actMapped: ActivityItem[] = (Array.isArray(acts) ? acts : []).map((a: any) => ({
        id: String(a?.id || ''),
        title: String(a?.title || ''),
        createdAt: a?.createdAt,
        color: String(a?.color || '#0891b2'),
      }));
      setActivity(actMapped);
    } catch {
      // ignore
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !stats) {
    return <LoadingBlock />;
  }

  const hasRevenue = chartData.some((p) => p.revenue > 0);
  const maxRevenue = Math.max(...chartData.map((p) => p.revenue), 1);

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Eye}
        title="لوحة التحكم"
        subtitle="نظرة شاملة على المنصة"
        tone="cyan"
        actions={
          <button onClick={() => loadData()} disabled={refreshing} className={BTN_GHOST}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> تحديث البيانات
          </button>
        }
      />

      {/* Quick Stats — كل بطاقة تفتح الصفحة بتاعتها */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard
          label="إجمالي المبيعات"
          value={formatEGP(stats?.totalRevenue)}
          icon={DollarSign}
          tone="cyan"
          href="/admin/orders"
        />
        <StatCard
          label="المستخدمون"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          tone="purple"
          href="/admin/users"
        />
        <StatCard
          label="المتاجر النشطة"
          value={stats?.totalShops ?? 0}
          icon={Store}
          tone="sky"
          href="/admin/shops"
        />
        <StatCard
          label="الطلبات"
          value={stats?.totalOrders ?? 0}
          icon={ShoppingCart}
          tone="amber"
          href="/admin/orders"
        />
        <StatCard
          label="إجمالي الزيارات"
          value={stats?.totalVisits ?? 0}
          icon={Eye}
          tone="indigo"
          href="/admin/visitors"
        />
      </div>

      {fin && (
        <Link
          href="/admin/finance"
          className="flex items-center justify-between gap-4 flex-wrap bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 hover:bg-emerald-100 transition-colors"
        >
          <span className="flex items-center gap-2 text-emerald-800 font-black text-sm">
            <Wallet size={16} /> مالية المنصة
          </span>
          <span className="flex items-center gap-5 text-xs font-bold text-emerald-900 flex-wrap">
            <span>
              إيراد الشهر <b>{formatEGP(fin.monthRevenue)}</b>
            </span>
            <span>
              صافي الربح <b>{formatEGP(fin.monthRevenue - fin.monthExpenses)}</b>
            </span>
            {fin.overdueSubscriptions > 0 && (
              <span className="text-red-600">
                اشتراكات متأخرة <b>{fin.overdueSubscriptions}</b>
              </span>
            )}
            <span className="text-emerald-700 underline underline-offset-4">التفاصيل ←</span>
          </span>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Revenue Chart */}
        <Panel className="lg:col-span-2 p-6 md:p-8 flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-lg font-black text-slate-900">الإيرادات (7 أيام)</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              System
            </span>
          </div>

          <div className="flex-1">
            {!hasRevenue ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold text-sm">
                لا توجد بيانات إيرادات للأيام السبعة الماضية
              </div>
            ) : (
              <div className="h-full flex items-end gap-2 md:gap-3 pb-4">
                {chartData.map((point, i) => {
                  const height = maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                    >
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500/30 to-cyan-500 transition-all hover:from-cyan-500/50"
                        style={{ height: `${Math.max(height, 2)}%`, minHeight: '4px' }}
                        title={`${point.revenue} EGP`}
                      />
                      <span className="text-[9px] md:text-[10px] font-bold text-slate-400">
                        {point.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        {/* Recent Activity */}
        <Panel className="p-6 md:p-8">
          <h3 className="text-lg font-black text-slate-900 mb-6">آخر العمليات</h3>
          <div className="space-y-4 md:space-y-5">
            {activity.length > 0 ? (
              activity
                .slice(0, 6)
                .map((a) => (
                  <ActivityRow
                    key={a.id}
                    title={a.title}
                    time={timeAgo(a.createdAt)}
                    color={a.color}
                  />
                ))
            ) : (
              <div className="text-slate-400 font-bold text-sm">لا توجد عمليات حديثة</div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: any;
  icon: React.ComponentType<{ size?: number }>;
  tone: 'cyan' | 'purple' | 'sky' | 'amber' | 'indigo';
  href?: string;
}) => {
  const body = (
    <>
      <div
        className={cn(
          'w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center mb-4',
          TONE_ICON[tone]
        )}
      >
        <Icon size={20} />
      </div>
      <p className="text-slate-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest mb-1">
        {label}
      </p>
      <p
        className={cn(
          'text-lg md:text-2xl font-black tracking-tight tabular-nums',
          TONE_TEXT[tone]
        )}
      >
        {value}
      </p>
    </>
  );
  const classes =
    'bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm text-right block';
  if (!href) return <div className={classes}>{body}</div>;
  return (
    <Link
      href={href}
      prefetch
      className={cn(classes, 'hover:shadow-md hover:border-slate-300 transition-all')}
    >
      {body}
    </Link>
  );
};

const ActivityRow = ({ title, time, color }: { title: string; time: string; color: string }) => (
  <div className="flex items-center gap-3 md:gap-4 flex-row-reverse border-b border-slate-100 pb-3 md:pb-4 last:border-0">
    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
    <div className="flex-1 text-right min-w-0">
      <p className="text-slate-800 font-bold text-sm leading-none mb-1 truncate">{title}</p>
      <p className="text-slate-400 text-[9px] md:text-[10px]">{time}</p>
    </div>
  </div>
);
