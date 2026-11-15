'use client';

import { useQuery } from '@tanstack/react-query';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart,
  Eye,
  Users,
  DollarSign,
  Star,
  RefreshCw,
  Download,
  Bell,
  Plus,
  Megaphone,
  Calendar,
  LogIn,
  AlertTriangle,
  ChevronLeft,
  Wallet,
  Boxes,
  BarChart3,
  History,
  CalendarDays,
  CalendarCheck,
  EyeOff,
  SlidersHorizontal,
  PieChart as PieIcon,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth, apiRequest } from '@/lib/auth';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { chartColors } from '@/lib/ui/tokens';
import { HIDE_UNPUBLISHED } from '@/config/sidebar';
import {
  type AnalyticsOverview,
  type AppNotification,
  type Booking,
  type LoginSession,
  type Metric,
  type Order,
  type PeriodKey,
  type SalesReport,
  type Shop,
} from './_overview/types';
import {
  analyticsHref,
  bookingStatusMeta,
  DEFAULT_SHORTCUTS,
  fmtCompact,
  fmtDate,
  fmtEGP,
  fmtNum,
  fmtShortId,
  greeting,
  isoDate,
  LOCALE,
  PERIODS,
  pctDelta,
  previousWindow,
  statusMeta,
  timeAgo,
  todayLong,
  UUID_RE,
} from './_overview/helpers';
import {
  Card,
  DeltaInline,
  Empty,
  MotionCard,
  PerformanceAreaChart,
  SectionHead,
  SectionHideButton,
  Skeleton,
  Sparkline,
  StatusDonut,
} from './_overview/ui';
import { useOverviewSections } from './_overview/useSections';
import { OVERVIEW_SECTIONS } from './_overview/prefs';

export default function DashboardOverview() {
  const router = useRouter();
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>('30');
  const [metric, setMetric] = useState<Metric>('revenue');
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [shop, setShop] = useState<Shop | null>(null);
  const [current, setCurrent] = useState<AnalyticsOverview | null>(null);
  const [previous, setPrevious] = useState<AnalyticsOverview | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [recentTab, setRecentTab] = useState<'all' | 'orders' | 'bookings'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // آخر ما اطّلع عليه — زيارات حقيقية متتبّعة من الـ layout
  const visited = useRecentlyViewed();
  const recentItems = showAllRecent ? visited : visited.slice(0, 6);
  const {
    bookingModuleEnabled,
    moduleAutoHidden,
    customizeOpen,
    setCustomizeOpen,
    isSectionHidden,
    hideSection,
    toggleSection,
    showAllSections,
  } = useOverviewSections(shop);

  const load = useCallback(
    async (p: PeriodKey) => {
      setRefreshing(true);
      setError(null);
      try {
        let shopData: Shop | null = null;
        try {
          shopData = await apiRequest('/shops/me');
        } catch {
          /* keep null */
        }
        setShop(shopData);
        const shopId = shopData?.id || user?.shopId;
        if (!shopId) throw new Error('لا يوجد متجر مرتبط بهذا الحساب');

        const periodDef = PERIODS.find((x) => x.key === p)!;
        const prev = previousWindow(p);

        const paramsB = new URLSearchParams({ limit: '50' });
        const paramsR = new URLSearchParams({ limit: '50' });
        if (UUID_RE.test(String(shopId))) paramsR.set('shopId', String(shopId));

        const [
          curRes,
          prevRes,
          salesRes,
          ordersRes,
          notifUserRes,
          notifShopRes,
          sessRes,
          bookWebRes,
          bookIntRes,
        ] = await Promise.allSettled([
          apiRequest(`/analytics/shop/${shopId}/overview?time_range=${periodDef.timeRange}`),
          apiRequest(
            `/analytics/shop/${shopId}/overview?time_range=custom&start_date=${prev.start_date}&end_date=${prev.end_date}`
          ),
          apiRequest(`/analytics/shop/${shopId}/sales-report?time_range=last_30_days`),
          apiRequest('/orders?page=1&limit=50'),
          apiRequest('/notifications/me?limit=5'),
          apiRequest(`/notifications/shop/${shopId}?limit=5`),
          apiRequest('/audit/sessions/me?limit=8'),
          apiRequest(`/bookings?${paramsB.toString()}`),
          apiRequest(`/reservations?${paramsR.toString()}`),
        ]);

        if (curRes.status === 'fulfilled') setCurrent(curRes.value);
        if (prevRes.status === 'fulfilled') setPrevious(prevRes.value);
        if (salesRes.status === 'fulfilled') setSalesReport(salesRes.value);
        setOrders(
          ordersRes.status === 'fulfilled'
            ? Array.isArray(ordersRes.value)
              ? ordersRes.value
              : ordersRes.value?.data || []
            : []
        );

        // دمج حجوزات الموقع والنظام الداخلي
        const pickList = (v: any): any[] => {
          const d = v?.data !== undefined ? v.data : v;
          if (Array.isArray(d)) return d;
          return d?.reservations || d?.bookings || d?.items || [];
        };
        const webList = bookWebRes.status === 'fulfilled' ? pickList(bookWebRes.value) : [];
        const intList = bookIntRes.status === 'fulfilled' ? pickList(bookIntRes.value) : [];
        const normBStatus = (s: any): string => {
          const v = String(s || '').toUpperCase();
          if (v === 'CONFIRMED' || v === 'COMPLETED' || v === 'CANCELLED' || v === 'EXPIRED')
            return v;
          return 'PENDING';
        };
        const unifiedBookings: Booking[] = [
          ...webList.map((b: any): Booking => ({
            id: `web-${b.id}`,
            source: 'website',
            status: normBStatus(b.status),
            itemName: b.itemName || b.serviceName || 'حجز من الموقع',
            customerName: b.customerName || 'عميل',
            customerPhone: b.customerPhone || '',
            when:
              b.startAt ||
              (b.bookingDate && b.bookingTime
                ? `${b.bookingDate}T${b.bookingTime}`
                : b.createdAt) ||
              '',
            price: Number(b.totalAmount || b.itemPrice || 0),
            participants: Number(b.participants || 0),
            notes: b.notes || '',
            raw: b,
          })),
          ...intList.map((r: any): Booking => ({
            id: `int-${r.id}`,
            source: 'internal',
            status: normBStatus(r.status),
            itemName: r.itemName || 'حجز داخلي',
            customerName: r.customerName || 'عميل',
            customerPhone: r.customerPhone || '',
            when: r.startTime || r.reservationDate || r.createdAt || '',
            price: Number(r.itemPrice || 0),
            participants: Number(r.guests || r.participants || 0),
            notes: r.notes || '',
            raw: r,
          })),
        ];
        setBookings(unifiedBookings);

        {
          // merge user + shop channel notifications, newest first
          // (admin-only types like NEW_SHOP are excluded from the merchant view)
          const ADMIN_TYPES = new Set([
            'NEW_SHOP',
            'ADMIN_ALERT',
            'MERCHANT_REVIEW',
            'PLATFORM_REPORT',
          ]);
          const isAdminOnly = (n: any) => {
            if (ADMIN_TYPES.has(String(n?.type || '').toUpperCase())) return true;
            return (
              String(n?.metadata?.audience ?? n?.meta?.audience ?? '').toLowerCase() === 'admin'
            );
          };
          const pick = (v: any) => (Array.isArray(v) ? v : v?.data || []);
          const merged: AppNotification[] = [];
          const seen = new Set<string>();
          for (const res of [notifUserRes, notifShopRes]) {
            if (res.status !== 'fulfilled') continue;
            for (const n of pick(res.value)) {
              if (!n?.id || seen.has(n.id) || isAdminOnly(n)) continue;
              seen.add(n.id);
              merged.push(n);
            }
          }
          merged.sort(
            (a, b) =>
              new Date(b.created_at || b.createdAt || 0).getTime() -
              new Date(a.created_at || a.createdAt || 0).getTime()
          );
          setNotifications(merged);
        }
        setSessions(
          sessRes.status === 'fulfilled'
            ? Array.isArray(sessRes.value)
              ? sessRes.value
              : sessRes.value?.data || []
            : []
        );
        setLastUpdated(new Date());
      } catch (e: any) {
        setError(e?.message || 'تعذر تحميل البيانات');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.shopId]
  );

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'overview', period, user?.shopId],
    queryFn: () => load(period),
    staleTime: 60_000,
  });

  const statByLabel = useMemo(() => {
    const map: Record<string, number> = {};
    (current?.stats || []).forEach((s) => {
      map[s.label] = parseFloat(s.value) || 0;
    });
    return map;
  }, [current]);
  const prevByLabel = useMemo(() => {
    const map: Record<string, number> = {};
    (previous?.stats || []).forEach((s) => {
      map[s.label] = parseFloat(s.value) || 0;
    });
    return map;
  }, [previous]);

  const trend = useMemo(() => salesReport?.trend || [], [salesReport]);
  const trendPoints = useMemo(() => {
    if (period === '7') return trend.slice(-7);
    return trend; // 30-day daily trend; 90/365 not available daily from backend
  }, [trend, period]);

  const pendingCount = useMemo(
    () => orders.filter((o) => String(o.status).toUpperCase() === 'PENDING').length,
    [orders]
  );

  const pendingBookingsCount = useMemo(
    () => bookings.filter((b) => b.status === 'PENDING').length,
    [bookings]
  );

  const completedBookingsRevenue = useMemo(
    () => bookings.filter((b) => b.status === 'COMPLETED').reduce((s, b) => s + (b.price || 0), 0),
    [bookings]
  );

  const todayBookings = useMemo(() => {
    const now = new Date();
    return bookings.filter((b) => {
      if (!b.when) return false;
      const d = new Date(b.when);
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });
  }, [bookings]);

  const kpis = useMemo(
    () => [
      {
        key: 'Revenue',
        label: 'الإيرادات الإجمالية',
        value: fmtEGP((statByLabel.Revenue || 0) + completedBookingsRevenue),
        delta: pctDelta(statByLabel.Revenue || 0, prevByLabel.Revenue || 0),
        spark: trend.map((t) => t.revenue),
        icon: <DollarSign size={14} />,
        href: analyticsHref('/dashboard/analytics/performance?tab=sales', '/dashboard/sales'),
        sub:
          completedBookingsRevenue > 0
            ? `تشمل ${fmtEGP(completedBookingsRevenue)} حجوزات`
            : undefined,
      },
      {
        key: 'Orders',
        label: 'الطلبات',
        value: fmtNum(statByLabel.Orders || 0),
        delta: pctDelta(statByLabel.Orders || 0, prevByLabel.Orders || 0),
        spark: trend.map((t) => t.orders),
        icon: <ShoppingCart size={14} />,
        href: '/dashboard/sales',
        sub: pendingCount > 0 ? `${pendingCount} قيد الانتظار` : undefined,
      },
      ...(bookingModuleEnabled
        ? [
            {
              key: 'Bookings',
              label: 'الحجوزات والمواعيد',
              value: fmtNum(bookings.length),
              delta: null,
              spark: [] as number[],
              icon: <CalendarDays size={14} />,
              href: '/dashboard/bookings',
              sub:
                todayBookings.length > 0
                  ? `${todayBookings.length} اليوم`
                  : pendingBookingsCount > 0
                    ? `${pendingBookingsCount} بانتظار التأكيد`
                    : undefined,
            },
          ]
        : []),
      {
        key: 'Customers',
        label: 'العملاء',
        value: fmtNum(statByLabel.Customers || 0),
        delta: pctDelta(statByLabel.Customers || 0, prevByLabel.Customers || 0),
        spark: [] as number[],
        icon: <Users size={14} />,
        href: analyticsHref('/dashboard/analytics/customers?tab=insights', '/dashboard/customers'),
      },
      {
        key: 'Views',
        label: 'زوار المتجر',
        value: fmtNum(statByLabel.Views || 0),
        delta: null,
        spark: [] as number[],
        icon: <Eye size={14} />,
        href: analyticsHref('/dashboard/analytics/customers?tab=conversions', '/dashboard/website'),
      },
    ],
    [
      statByLabel,
      prevByLabel,
      trend,
      completedBookingsRevenue,
      bookings.length,
      todayBookings.length,
      pendingBookingsCount,
      pendingCount,
    ]
  );

  const exportCsv = () => {
    const rows: string[] = [];
    rows.push('المؤشر,القيمة');
    kpis.forEach((k) => rows.push(`${k.label},"${k.value}"`));
    rows.push('');
    rows.push('التاريخ,الإيرادات,الطلبات');
    trend.forEach((t) => rows.push(`${t.date},${t.revenue},${t.orders}`));
    rows.push('');
    rows.push('المنتج,الكمية,الإيراد');
    (current?.top_products || []).forEach((p) =>
      rows.push(`"${p.name}",${p.sales},${p.revenue.toFixed(2)}`)
    );
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${isoDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isActive = shop
    ? (shop.isActive ?? String(shop.status || '').toLowerCase() === 'active')
    : true;
  const chartData = useMemo(
    () =>
      trendPoints.map((t) => ({
        x: fmtDate(t.date),
        y: metric === 'revenue' ? t.revenue : t.orders,
      })),
    [trendPoints, metric]
  );
  const trendTotal = useMemo(
    () => trendPoints.reduce((s, t) => s + (metric === 'revenue' ? t.revenue : t.orders), 0),
    [trendPoints, metric]
  );

  // توزيع حالات الطلبات — من بيانات الطلبات الحقيقية
  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o) => {
      const s = String(o.status || '').toUpperCase();
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    const known = [
      'DELIVERED',
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'CANCELLED',
      'REFUNDED',
    ];
    const out: { name: string; value: number; color: string }[] = [];
    known.forEach((k) => {
      const v = counts.get(k);
      if (v) out.push({ name: statusMeta(k).label, value: v, color: statusMeta(k).color });
    });
    counts.forEach((v, k) => {
      if (!known.includes(k)) out.push({ name: statusMeta(k).label, value: v, color: '#94A3B8' });
    });
    return out;
  }, [orders]);

  const combinedActivities = useMemo(() => {
    const list: Array<{
      id: string;
      rawId?: string;
      kind: 'order' | 'booking';
      title: string;
      customer: string;
      phone?: string;
      statusLabel: string;
      statusChip: string;
      dateIso?: string;
      amount: number;
      href: string;
    }> = [];

    if (recentTab === 'all' || recentTab === 'orders') {
      orders.forEach((o) => {
        const sm = statusMeta(o.status);
        list.push({
          id: `order-${o.id}`,
          rawId: o.id,
          kind: 'order',
          title: fmtShortId(o.id),
          customer: o.customerName || o.customerPhone || 'عميل متجر',
          phone: o.customerPhone,
          statusLabel: sm.label,
          statusChip: sm.chip,
          dateIso: o.createdAt,
          amount: o.total || 0,
          href: '/dashboard/sales',
        });
      });
    }

    if (recentTab === 'all' || recentTab === 'bookings') {
      bookings.forEach((b) => {
        const bm = bookingStatusMeta(b.status);
        list.push({
          id: `booking-${b.id}`,
          rawId: b.id,
          kind: 'booking',
          title: b.itemName || 'حجز موعد',
          customer: b.customerName || 'عميل حجز',
          phone: b.customerPhone,
          statusLabel: bm.label,
          statusChip: bm.chip,
          dateIso: b.when,
          amount: b.price || 0,
          href: '/dashboard/bookings',
        });
      });
    }

    return list.sort(
      (a, b) => new Date(b.dateIso || 0).getTime() - new Date(a.dateIso || 0).getTime()
    );
  }, [orders, bookings, recentTab]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1500px] mx-auto">
      {/* ===== Header — هوية الصفحة ===== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5 flex-wrap">
            {greeting()}، {user?.name || shop?.name || 'صاحب المتجر'}.
            {shop && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 border align-middle ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}
                />
                {isActive ? 'فعّال' : 'موقوف'}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            {shop?.name && <span className="text-slate-500 font-semibold">{shop.name}</span>}
            {shop?.name && <span className="text-slate-300"> • </span>}
            إليك ما يحدث في متجرك — {todayLong()}
            {lastUpdated && (
              <span className="text-slate-300">
                {' '}
                • آخر تحديث{' '}
                {lastUpdated.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {refreshing && <span className="text-indigo-600 font-bold"> • جارٍ التحديث…</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors tabular-nums ${period === p.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => dashboardQuery.refetch()}
            disabled={dashboardQuery.isFetching}
            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
            title="تحديث"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Download size={13} />
            تصدير
          </button>
          {/* تخصيص النظرة العامة — إظهار/إخفاء كل قسم */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCustomizeOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3.5 py-2 bg-white border rounded-lg text-xs font-bold transition-colors ${
                customizeOpen
                  ? 'border-slate-900 text-slate-900'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal size={13} />
              تخصيص
            </button>
            {customizeOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setCustomizeOpen(false)} />
                <div className="absolute left-0 top-11 z-40 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl p-3">
                  <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b border-slate-100">
                    <span className="text-xs font-extrabold text-slate-800">
                      تخصيص أقسام النظرة العامة
                    </span>
                    <button
                      type="button"
                      onClick={showAllSections}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      إظهار الكل
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto py-1">
                    {OVERVIEW_SECTIONS.map((s) => {
                      const moduleOff = moduleAutoHidden.includes(s.id);
                      const hidden = isSectionHidden(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSection(s.id)}
                          className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 text-right transition-colors"
                        >
                          <span className="min-w-0">
                            <span
                              className={`block text-[11px] font-bold ${hidden ? 'text-slate-400' : 'text-slate-700'}`}
                            >
                              {s.label}
                            </span>
                            {moduleOff && (
                              <span className="block text-[9px] font-semibold text-amber-600 leading-3 mt-0.5">
                                مربوط بموديول موقوف — أظهره رغم ذلك أو فعّل الموديول من الإعدادات
                              </span>
                            )}
                          </span>
                          <span
                            className={`w-7 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                              hidden
                                ? 'bg-slate-100 text-slate-400'
                                : 'bg-indigo-50 text-indigo-600'
                            }`}
                          >
                            {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* ===== آخر ما اطّلع عليه (Recent shortcuts) ===== */}
      {!isSectionHidden('recent') && (
        <Card className="p-0 overflow-hidden relative">
          <SectionHideButton onClick={() => hideSection('recent')} />
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History size={15} className="text-slate-500" />
              <h2 className="text-sm font-bold text-slate-800">آخر ما اطّلع عليه</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAllRecent((v) => !v)}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-700 transition-colors"
            >
              {showAllRecent ? 'إخفاء' : 'استعراض الكل'}
            </button>
          </div>
          <div className="px-5 py-3 flex flex-wrap items-center">
            {(recentItems.length === 0 ? DEFAULT_SHORTCUTS : recentItems).map((it, idx, arr) => (
              <Link
                key={it.href}
                href={it.href}
                className={`group flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors rounded-lg ${idx !== arr.length - 1 ? 'border-l border-slate-100' : ''}`}
              >
                <Star
                  size={13}
                  className="text-slate-300 group-hover:text-amber-400 transition-colors shrink-0"
                />
                <span className="truncate">{it.labelAr}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* ===== Alerts ===== */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-800">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          {error}
        </div>
      )}
      {!error && shop && !isActive && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-800">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          متجرك موقوف حاليًا ولن يستقبل طلبات جديدة حتى تفعّله من الإعدادات.
        </div>
      )}
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={() => router.push('/dashboard/sales')}
          className="w-full flex items-center gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition-colors text-right"
        >
          <AlertTriangle size={14} className="text-blue-500 shrink-0" />
          <span className="flex-1">
            لديك {fmtNum(pendingCount)} طلبًا قيد الانتظار بحاجة إلى مراجعة وتأكيد.
          </span>
          <ChevronLeft size={14} className="text-blue-400" />
        </button>
      )}
      {bookingModuleEnabled && pendingBookingsCount > 0 && (
        <button
          type="button"
          onClick={() => router.push('/dashboard/bookings')}
          className="w-full flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors text-right"
        >
          <CalendarCheck size={14} className="text-amber-500 shrink-0" />
          <span className="flex-1">
            لديك {fmtNum(pendingBookingsCount)} حجز بانتظار المراجعة والتأكيد.
          </span>
          <ChevronLeft size={14} className="text-amber-400" />
        </button>
      )}

      {/* ===== أداء المتجر — بعرض الصفحة كاملاً تحت آخر ما اطّلع عليه ===== */}
      {!isSectionHidden('performance') && (
        <MotionCard className="w-full p-0 overflow-hidden relative" delay={0.1}>
          <SectionHideButton onClick={() => hideSection('performance')} />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <BarChart3 size={15} />
              </span>
              <div>
                <h3 className="text-[14px] font-extrabold text-slate-900 leading-5">أداء المتجر</h3>
                <p className="text-[11px] font-medium text-slate-400 leading-4">
                  آخر {fmtNum(trendPoints.length)} يوم
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg p-0.5">
                {(
                  [
                    { key: 'revenue', label: 'الإيرادات' },
                    { key: 'orders', label: 'الطلبات' },
                  ] as { key: Metric; label: string }[]
                ).map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${metric === m.key ? 'bg-white text-slate-900 border border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <span className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">
                {metric === 'revenue' ? fmtEGP(trendTotal) : fmtNum(trendTotal)}
              </span>
            </div>
          </div>

          <div className="px-3 pb-3 pt-1">
            {loading ? (
              <Skeleton className="h-64 m-2" />
            ) : (
              <PerformanceAreaChart
                data={chartData}
                color={metric === 'revenue' ? chartColors.revenue : chartColors.orders}
                formatY={fmtCompact}
                formatTip={(n) => (metric === 'revenue' ? fmtEGP(n) : `${fmtNum(n)} طلب`)}
              />
            )}
          </div>
        </MotionCard>
      )}

      {/* ===== KPIs — المربعات والمؤشرات الرئيسية تحت أداء المتجر مباشرة ===== */}
      {kpis.some((k: any) => !isSectionHidden(`kpi:${k.key}`)) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {kpis
            .filter((k: any) => !isSectionHidden(`kpi:${k.key}`))
            .map((k: any, i) => (
              <MotionCard
                key={k.key}
                delay={0.05 + i * 0.04}
                className="p-4 sm:p-5 flex flex-col justify-between relative"
              >
                <SectionHideButton onClick={() => hideSection(`kpi:${k.key}`)} />
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold text-slate-400">{k.label}</p>
                    <DeltaInline delta={k.delta} />
                  </div>
                  {loading ? (
                    <Skeleton className="h-7 w-24 mt-2" />
                  ) : (
                    <div className="flex items-end justify-between gap-2 mt-1.5">
                      <div className="min-w-0">
                        <span className="text-[18px] sm:text-[21px] font-extrabold text-slate-900 tabular-nums leading-7 truncate block">
                          {k.value}
                        </span>
                        {k.sub && (
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">
                            {k.sub}
                          </p>
                        )}
                      </div>
                      {k.spark && k.spark.length > 0 && (
                        <Sparkline
                          values={k.spark}
                          color={['#4F46E5', '#7C3AED', '#EC4899', '#2563EB', '#059669'][i]}
                        />
                      )}
                    </div>
                  )}
                </div>
                {!loading && k.href && (
                  <button
                    type="button"
                    onClick={() => router.push(k.href)}
                    className="mt-2.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5 self-start"
                  >
                    عرض المزيد
                    <ChevronLeft size={10} />
                  </button>
                )}
              </MotionCard>
            ))}
        </div>
      )}

      {/* ===== Orders + Notifications ===== */}
      <div
        className={`grid grid-cols-1 gap-4 ${isSectionHidden('activity') ? '' : 'xl:grid-cols-3'}`}
      >
        {!isSectionHidden('activity') && (
          <MotionCard className="xl:col-span-2 p-0 relative" delay={0.2}>
            <SectionHideButton onClick={() => hideSection('activity')} />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <History size={15} />
                </span>
                <div>
                  <h3 className="text-[14px] font-extrabold text-slate-900 leading-5">
                    أحدث الطلبات والحجوزات
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400">
                    سجل مدمج لعمليات البيع ومواعيد الحجز
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setRecentTab('all')}
                    className={`px-2.5 py-1 rounded-md transition-all ${recentTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    الكل ({orders.length + (bookingModuleEnabled ? bookings.length : 0)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecentTab('orders')}
                    className={`px-2.5 py-1 rounded-md transition-all ${recentTab === 'orders' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    الطلبات ({orders.length})
                  </button>
                  {bookingModuleEnabled && (
                    <button
                      type="button"
                      onClick={() => setRecentTab('bookings')}
                      className={`px-2.5 py-1 rounded-md transition-all ${recentTab === 'bookings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      الحجوزات ({bookings.length})
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      recentTab === 'bookings' ? '/dashboard/bookings' : '/dashboard/sales'
                    )
                  }
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5 shrink-0 mr-1"
                >
                  {recentTab === 'bookings' ? 'مواعيد الحجوزات' : 'كل الطلبات'}{' '}
                  <ChevronLeft size={12} />
                </button>
              </div>
            </div>
            {loading ? (
              <div className="p-5 space-y-2">
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
              </div>
            ) : combinedActivities.length === 0 ? (
              <Empty
                icon={<ShoppingCart size={20} />}
                title="لا توجد عمليات بعد"
                desc="ستظهر هنا طلبات الشراء الجديدة فور وصولها."
                actionLabel="عرض الطلبات"
                onAction={() => router.push('/dashboard/sales')}
                secondaryLabel="طلب من الكاشير"
                onSecondary={() => router.push('/dashboard/pos')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-[10px] font-semibold text-slate-400 pb-2 pr-5">
                        النوع / المعرف
                      </th>
                      <th className="text-[10px] font-semibold text-slate-400 pb-2">العميل</th>
                      <th className="text-[10px] font-semibold text-slate-400 pb-2">الحالة</th>
                      <th className="text-[10px] font-semibold text-slate-400 pb-2">
                        التاريخ / الموعد
                      </th>
                      <th className="text-[10px] font-semibold text-slate-400 pb-2 pl-5 text-left">
                        الإجمالي
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedActivities.slice(0, 8).map((it) => (
                      <tr
                        key={it.id}
                        onClick={() => router.push(it.href)}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 pr-5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded ${it.kind === 'order' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}
                            >
                              {it.kind === 'order' ? (
                                <ShoppingCart size={10} />
                              ) : (
                                <CalendarCheck size={10} />
                              )}
                              {it.kind === 'order' ? 'طلب' : 'حجز'}
                            </span>
                            <span className="text-xs font-bold text-slate-800 truncate max-w-[160px]">
                              {it.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-xs text-slate-600">
                          <div>{it.customer}</div>
                          {it.phone && (
                            <div className="text-[10px] text-slate-400" dir="ltr">
                              {it.phone}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${it.statusChip}`}
                          >
                            {it.statusLabel}
                          </span>
                        </td>
                        <td className="py-2.5 text-[11px] text-slate-400 whitespace-nowrap">
                          {timeAgo(it.dateIso)}
                        </td>
                        <td className="py-2.5 pl-5 text-xs font-bold text-slate-900 text-left tabular-nums">
                          {fmtEGP(it.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </MotionCard>
        )}

        <div className="space-y-4">
          {/* Shop stats — التقييم والمتابع */}
          {!isSectionHidden('shopStats') && (
            <MotionCard className="p-4 relative" delay={0.2}>
              <SectionHideButton onClick={() => hideSection('shopStats')} />
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center py-1">
                  <div className="flex items-center justify-center gap-1.5 text-amber-500 mb-1">
                    <Star size={14} fill="currentColor" />
                    <span className="text-lg font-extrabold text-slate-900 tabular-nums">
                      {(shop?.rating || 0).toFixed(1)}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold">التقييم</span>
                </div>
                <div className="text-center py-1 border-r border-slate-100">
                  <span className="text-lg font-extrabold text-slate-900 tabular-nums">
                    {fmtNum(shop?.followers || 0)}
                  </span>
                  <div className="text-[11px] text-slate-400 font-semibold mt-1">متابع</div>
                </div>
              </div>
            </MotionCard>
          )}

          {/* Quick actions — إجراءات سريعة */}
          {!isSectionHidden('quickActions') && (
            <MotionCard className="p-2 relative" delay={0.22}>
              <SectionHideButton onClick={() => hideSection('quickActions')} />
              {[
                {
                  label: 'إضافة منتج جديد',
                  desc: 'وسّع كتالوج متجرك',
                  icon: <Plus size={15} />,
                  href: '/dashboard/inventory/products',
                },
                {
                  label: 'طلب جديد',
                  desc: 'سجّل بيع من الكاشير',
                  icon: <ShoppingCart size={15} />,
                  href: '/dashboard/pos',
                },
                ...(bookingModuleEnabled
                  ? [
                      {
                        label: 'حجز جديد',
                        desc: 'احجز موعدًا لعميل',
                        icon: <Calendar size={15} />,
                        href: '/dashboard/bookings',
                      },
                    ]
                  : []),
                {
                  label: 'حملة إعلانية',
                  desc: 'أطلق عرضًا لعملائك',
                  icon: <Megaphone size={15} />,
                  href: '/dashboard/marketing',
                },
                // Market-launch switch: التقرير المالي لوكال فقط.
                ...(HIDE_UNPUBLISHED
                  ? []
                  : [
                      {
                        label: 'تقرير مالي',
                        desc: 'راجع أرباحك ومصروفاتك',
                        icon: <Wallet size={15} />,
                        href: '/dashboard/finance',
                      },
                    ]),
                {
                  label: 'إعدادات المتجر',
                  desc: 'بيانات المتجر والرؤية',
                  icon: <SettingsIcon size={15} />,
                  href: '/dashboard/settings',
                },
              ].map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => router.push(a.href)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-right"
                >
                  <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    {a.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-800">{a.label}</span>
                    <span className="block text-[10px] text-slate-400">{a.desc}</span>
                  </span>
                  <ChevronLeft size={13} className="text-slate-300 shrink-0" />
                </button>
              ))}
            </MotionCard>
          )}

          {/* آخر الإشعارات */}
          {!isSectionHidden('notifications') && (
            <MotionCard className="p-0 relative" delay={0.25}>
              <SectionHideButton onClick={() => hideSection('notifications')} />
              <SectionHead
                title="آخر الإشعارات"
                icon={<Bell size={14} />}
                actionLabel="الكل"
                onAction={() => router.push('/dashboard/notifications')}
              />
              {loading ? (
                <div className="p-5 space-y-2">
                  <Skeleton className="h-9" />
                  <Skeleton className="h-9" />
                  <Skeleton className="h-9" />
                </div>
              ) : notifications.length === 0 ? (
                <Empty icon={<Bell size={20} />} title="لا توجد إشعارات" />
              ) : (
                <div className="px-3 py-2 divide-y divide-slate-50">
                  {notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className="py-2.5 px-2 rounded-lg hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800 leading-5">
                          {n.title || 'إشعار'}
                        </p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                          {timeAgo(n.created_at || n.createdAt)}
                        </span>
                      </div>
                      {n.content && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-5">
                          {n.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </MotionCard>
          )}

          {/* آخر جلسات الدخول */}
          {!isSectionHidden('sessions') && (
            <MotionCard className="p-0 relative" delay={0.3}>
              <SectionHideButton onClick={() => hideSection('sessions')} />
              <SectionHead
                title="آخر جلسات الدخول"
                icon={<LogIn size={14} />}
                sub={`${fmtNum(sessions.length)} جلسة`}
              />
              {loading ? (
                <div className="p-5 space-y-2">
                  <Skeleton className="h-9" />
                  <Skeleton className="h-9" />
                  <Skeleton className="h-9" />
                </div>
              ) : sessions.length === 0 ? (
                <Empty
                  icon={<LogIn size={20} />}
                  title="لا توجد سجلات دخول"
                  desc="سجلات الدخول لحسابك تظهر هنا لأمانك."
                />
              ) : (
                <div className="px-5 py-3 divide-y divide-slate-50">
                  {sessions.slice(0, 5).map((e, i) => {
                    const email = e.UserEmail || e.userEmail || '—';
                    const loginAt = e.LoginAt || e.loginAt;
                    const logoutAt = e.LogoutAt || e.logoutAt;
                    const online = !logoutAt;
                    return (
                      <div key={e.ID || e.id || i} className="flex items-center gap-2.5 py-2.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-semibold text-slate-700 truncate">
                            {email}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {fmtDate(loginAt, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </span>
                        {online ? (
                          <span className="text-[10px] font-bold text-emerald-600 shrink-0">
                            متصل الآن
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {fmtDate(logoutAt, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </MotionCard>
          )}
        </div>
      </div>

      {/* ===== توزيع الطلبات + الأكثر مبيعًا ===== */}
      {(!isSectionHidden('distribution') || !isSectionHidden('topProducts')) && (
        <div
          className={`grid grid-cols-1 gap-4 ${!isSectionHidden('distribution') && !isSectionHidden('topProducts') ? 'xl:grid-cols-3' : ''}`}
        >
          {!isSectionHidden('distribution') && (
            <MotionCard className="p-0 relative" delay={0.3}>
              <SectionHideButton onClick={() => hideSection('distribution')} />
              <SectionHead title="توزيع الطلبات" icon={<PieIcon size={14} />} sub="حسب الحالة" />
              {loading ? (
                <div className="p-5">
                  <Skeleton className="h-40" />
                </div>
              ) : (
                <>
                  <div className="px-4 pt-3">
                    <StatusDonut data={statusDistribution} total={orders.length} />
                  </div>
                  {statusDistribution.length === 0 && (
                    <p className="text-[11px] font-medium text-slate-400 text-center pb-4 -mt-1">
                      بمجرد وصول أول طلب هتتوزع حالاته هنا تلقائيًا.
                    </p>
                  )}
                  {statusDistribution.length > 0 && (
                    <div className="px-5 pb-4 pt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {statusDistribution.slice(0, 6).map((d) => (
                        <div
                          key={d.name}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: d.color }}
                          />
                          <span className="truncate">{d.name}</span>
                          <span className="ml-auto font-extrabold text-slate-800 tabular-nums">
                            {fmtNum(d.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </MotionCard>
          )}

          {!isSectionHidden('topProducts') && (
            <MotionCard
              className={`p-0 relative ${!isSectionHidden('distribution') ? 'xl:col-span-2' : ''}`}
              delay={0.35}
            >
              <SectionHideButton onClick={() => hideSection('topProducts')} />
              <SectionHead
                title="الأكثر مبيعًا"
                icon={<Boxes size={14} />}
                actionLabel="إدارة المنتجات"
                onAction={() => router.push('/dashboard/inventory/products')}
              />
              {loading ? (
                <div className="p-5 space-y-2">
                  <Skeleton className="h-9" />
                  <Skeleton className="h-9" />
                  <Skeleton className="h-9" />
                </div>
              ) : (current?.top_products || []).length === 0 ? (
                <Empty
                  icon={<Boxes size={20} />}
                  title="لا توجد مبيعات منتجات بعد"
                  desc="أضف منتجاتك الأولى وشاركها مع عملائك — أكثر المنتجات مبيعًا ستظهر هنا."
                  actionLabel="إضافة منتج"
                  onAction={() => router.push('/dashboard/inventory/products')}
                />
              ) : (
                <div className="px-5 py-3 space-y-1">
                  {(current?.top_products || []).slice(0, 5).map((p, i) => {
                    const maxRev = Math.max(
                      ...(current?.top_products || []).map((x) => x.revenue || 0),
                      1
                    );
                    return (
                      <div key={i} className="py-2 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-extrabold tabular-nums shrink-0 ${i === 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}
                          >
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {p.name || 'منتج'}
                            </p>
                            <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(4, Math.round(((p.revenue || 0) / maxRev) * 100))}%`,
                                  background: i === 0 ? '#4F46E5' : '#A5B4FC',
                                }}
                              />
                            </div>
                          </div>
                          <div className="text-left shrink-0">
                            <span className="block text-xs font-extrabold text-slate-900 tabular-nums">
                              {fmtEGP(p.revenue)}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-semibold tabular-nums">
                              {fmtNum(p.sales)} مبيعة
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </MotionCard>
          )}
        </div>
      )}
    </div>
  );
}
