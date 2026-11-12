'use client';

import { useQuery } from '@tanstack/react-query';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Users,
  Activity,
  ChevronLeft,
  ChartPie,
  Boxes,
  Landmark,
  Download,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { INV_PAGE_FONT } from '@/components/inventory/InventoryShell';

/* ============================================================
 * Formatting & Helpers
 * ============================================================ */

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmt2 = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type PeriodKey = 'this_month' | 'last_month' | 'quarter' | 'this_year' | '7d' | '30d' | 'all';

function periodRange(p: PeriodKey): { from: string; to: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = (dt: Date) => dt.toISOString().split('T')[0];
  switch (p) {
    case '7d': {
      const past = new Date(now.getTime() - 7 * 86400000);
      return { from: d(past), to: d(now), label: 'آخر 7 أيام' };
    }
    case '30d': {
      const past = new Date(now.getTime() - 30 * 86400000);
      return { from: d(past), to: d(now), label: 'آخر 30 يوم' };
    }
    case 'this_month':
      return { from: d(new Date(y, m, 1)), to: d(new Date(y, m + 1, 0)), label: 'هذا الشهر' };
    case 'last_month':
      return { from: d(new Date(y, m - 1, 1)), to: d(new Date(y, m, 0)), label: 'الشهر الماضي' };
    case 'quarter': {
      const q = Math.floor(m / 3) * 3;
      return { from: d(new Date(y, q, 1)), to: d(new Date(y, q + 3, 0)), label: 'هذا الربع' };
    }
    case 'this_year':
      return { from: d(new Date(y, 0, 1)), to: d(new Date(y, 11, 31)), label: 'هذه السنة' };
    default:
      return { from: '', to: d(now), label: 'كل الفترات' };
  }
}

function prevRange(p: PeriodKey): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = (dt: Date) => dt.toISOString().split('T')[0];
  switch (p) {
    case '7d': {
      const end = new Date(now.getTime() - 7 * 86400000);
      const start = new Date(now.getTime() - 14 * 86400000);
      return { from: d(start), to: d(end) };
    }
    case '30d': {
      const end = new Date(now.getTime() - 30 * 86400000);
      const start = new Date(now.getTime() - 60 * 86400000);
      return { from: d(start), to: d(end) };
    }
    case 'this_month':
      return { from: d(new Date(y, m - 1, 1)), to: d(new Date(y, m, 0)) };
    case 'last_month': {
      const pm = m - 2 < 0 ? 10 : m - 2;
      return { from: d(new Date(y, pm, 1)), to: d(new Date(y, pm + 1, 0)) };
    }
    case 'quarter': {
      const q = Math.floor(m / 3) * 3;
      const pq = q - 3 < 0 ? 9 : q - 3;
      const py = q - 3 < 0 ? y - 1 : y;
      return { from: d(new Date(py, pq, 1)), to: d(new Date(py, pq + 3, 0)) };
    }
    case 'this_year':
      return { from: d(new Date(y - 1, 0, 1)), to: d(new Date(y - 1, 11, 31)) };
    default:
      return { from: '', to: '' };
  }
}

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '30d', label: 'آخر 30 يوم' },
  { key: '7d', label: 'آخر 7 أيام' },
  { key: 'this_month', label: 'هذا الشهر' },
  { key: 'last_month', label: 'الشهر الماضي' },
  { key: 'quarter', label: 'هذا الربع' },
  { key: 'this_year', label: 'هذه السنة' },
  { key: 'all', label: 'الكل' },
];

function downloadCSV(name: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
}

/** شريط تقدم أفقي نظيف للإحصائيات والتوزيعات */
function MiniBar({
  label,
  value,
  max,
  color = 'bg-slate-900',
  suffix = '',
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.min((Math.abs(value) / max) * 100, 100) : 0;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-slate-700 text-xs sm:text-sm truncate">{label}</span>
        <span
          className="font-mono tabular-nums font-black text-slate-900 text-xs sm:text-sm whitespace-nowrap"
          dir="ltr"
        >
          {fmt2(value)}
          {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ============================================================
 * Hub Pages Links (Clean List)
 * ============================================================ */

type HubPage = {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  href: string;
  soon?: boolean;
};

const ANALYTICS_PAGES: HubPage[] = [
  {
    id: 'kpi',
    label: 'المؤشرات الرئيسية',
    desc: 'أهم الأرقام التي تقيس صحة متجرك ونشاطك',
    icon: Activity,
    href: '/dashboard/analytics/insights?tab=kpi',
  },
  {
    id: 'charts',
    label: 'الرسوم البيانية المتقدمة',
    desc: 'الاتجاهات والمنحنيات المقارنة في شكل مرئي',
    icon: ChartPie,
    href: '/dashboard/analytics/insights?tab=charts',
  },
  {
    id: 'salesPerformance',
    label: 'أداء المبيعات والمنتجات',
    desc: 'المنتجات الأكثر مبيعاً وفترات الذروة',
    icon: TrendingUp,
    href: '/dashboard/analytics/performance?tab=sales',
  },
  {
    id: 'inventoryReports',
    label: 'تقارير المخزون والعمليات',
    desc: 'تنبيهات انخفاض المخزون والأصناف الراكدة',
    icon: Boxes,
    href: '/dashboard/analytics/operations?tab=operations?tab=inventory',
  },
  {
    id: 'customerInsights',
    label: 'تحليلات ونمو العملاء',
    desc: 'سلوك العملاء: الجدد، المتكررون، والقيمة الدائمة',
    icon: Users,
    href: '/dashboard/analytics/customers?tab=insights',
  },
  {
    id: 'financeAnalytics',
    label: 'التقارير المالية والمدفوعات',
    desc: 'التدفق النقدي، طرق التحصيل، والمصروفات',
    icon: Landmark,
    href: '/dashboard/analytics/finance?tab=finance',
  },
];

/* ============================================================
 * Main Unified Analytics & Reports Page
 * ============================================================ */

export default function AnalyticsUnifiedPage() {
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'sales' | 'profits' | 'purchases' | 'aging' | 'cash' | 'inventory' | 'taxes'
  >('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States
  const [analytics, setAnalytics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [reportsData, setReportsData] = useState<any>({});

  const curRange = useMemo(() => periodRange(period), [period]);

  const loadAll = useCallback(async (p: PeriodKey) => {
    setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setError('لم يتم العثور على المتجر');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const cur = periodRange(p);
      const prev = prevRange(p);
      const q = (f: string, t: string) => {
        const ps = new URLSearchParams();
        if (f) ps.set('from', f);
        if (t) ps.set('to', t);
        return ps.toString();
      };

      const [
        analyticsRes,
        customerRes,
        ordersRes,
        revRes,
        prevRevRes,
        expRes,
        profitRes,
        cashRes,
        prevCashRes,
        accInvRes,
        walletsRes,
        transRes,
        agingRes,
        taxRatesRes,
        taxReturnsRes,
        productsRes,
        suppliersRes,
      ] = await Promise.allSettled([
        apiRequest(`/analytics/shop/${sid}`).catch(() => null),
        apiRequest(`/analytics/shop/${sid}/customer-insights`).catch(() => null),
        apiRequest('/orders/me').catch(() => ({ orders: [] })),
        apiRequest(`/finance/reports/revenue/shop/${sid}?${q(cur.from, cur.to)}`).catch(() => null),
        prev.from
          ? apiRequest(`/finance/reports/revenue/shop/${sid}?${q(prev.from, prev.to)}`).catch(
              () => null
            )
          : Promise.resolve(null),
        apiRequest(`/finance/expenses/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/finance/reports/profit/shop/${sid}?${q(cur.from, cur.to)}`).catch(() => null),
        apiRequest(`/finance/reports/cashflow/shop/${sid}?${q(cur.from, cur.to)}`).catch(
          () => null
        ),
        prev.from
          ? apiRequest(`/finance/reports/cashflow/shop/${sid}?${q(prev.from, prev.to)}`).catch(
              () => null
            )
          : Promise.resolve(null),
        apiRequest(`/accounting/invoices/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/finance/wallets/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/finance/transactions/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/accounting/aging/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/accounting/tax-rates/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/accounting/tax-returns/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/products/manage/by-shop/${sid}?limit=200`).catch(() => ({ data: [] })),
        apiRequest(`/suppliers/shop/${sid}`).catch(() => ({ data: [] })),
      ]);

      const get = (r: PromiseSettledResult<any>, fallback: any = null) =>
        r.status === 'fulfilled'
          ? r.value?.data !== undefined
            ? r.value.data
            : r.value
          : fallback;
      const list = (r: PromiseSettledResult<any>) => {
        const v = get(r);
        return Array.isArray(v)
          ? v
          : Array.isArray(v?.orders)
            ? v.orders
            : Array.isArray(v?.data)
              ? v.data
              : [];
      };

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        setAnalytics(analyticsRes.value);
      }
      if (customerRes.status === 'fulfilled' && customerRes.value) {
        setCustomerStats(customerRes.value);
      }
      const allOrders = list(ordersRes);
      setOrders(allOrders);

      setReportsData({
        revenue: get(revRes),
        prevRevenue: get(prevRevRes),
        expenses: list(expRes),
        profit: get(profitRes),
        cash: get(cashRes),
        prevCash: get(prevCashRes),
        orders: allOrders,
        accInvoices: list(accInvRes),
        wallets: list(walletsRes),
        transactions: list(transRes),
        aging: list(agingRes),
        taxRates: list(taxRatesRes),
        taxReturns: list(taxReturnsRes),
        products: list(productsRes),
        suppliers: list(suppliersRes),
        range: cur,
      });
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل بيانات التحليلات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const analyticsQuery = useQuery({
    queryKey: ['dashboard', 'analytics', period],
    queryFn: () => loadAll(period),
    staleTime: 60_000,
  });

  const inPeriod = useCallback((d: string, range?: { from: string; to: string }) => {
    if (!range) return true;
    const day = String(d || '').split('T')[0];
    if (range.from && day < range.from) return false;
    if (range.to && day > range.to) return false;
    return true;
  }, []);

  // Filtered orders in period
  const filteredOrders = useMemo(() => {
    return orders.filter((o: any) => inPeriod(o.createdAt || o.created_at || o.date, curRange));
  }, [orders, inPeriod, curRange]);

  // Order stats
  const orderStats = useMemo(() => {
    const list = filteredOrders.length > 0 ? filteredOrders : orders;
    const total = list.length;
    const revenue = list.reduce((s, o) => s + Number(o.total || o.total_amount || 0), 0);
    const delivered = list.filter((o) => String(o.status).toUpperCase() === 'DELIVERED').length;
    const cancelled = list.filter((o) => String(o.status).toUpperCase() === 'CANCELLED').length;
    const avgOrder = total > 0 ? revenue / total : 0;
    return { total, revenue, delivered, cancelled, avgOrder };
  }, [filteredOrders, orders]);

  // Daily chart data
  const chartData = useMemo(() => {
    const chart = analytics?.chartData;
    if (Array.isArray(chart) && chart.length > 0) return chart;
    const targetOrders = filteredOrders.length > 0 ? filteredOrders : orders;
    if (targetOrders.length === 0) return [];
    const byDate: Record<string, number> = {};
    targetOrders.forEach((o) => {
      const d = new Date(o.createdAt || o.created_at || Date.now());
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      byDate[key] = (byDate[key] || 0) + Number(o.total || o.total_amount || 0);
    });
    return Object.entries(byDate)
      .sort((a, b) => {
        const [am, ad] = a[0].split('/').map(Number);
        const [bm, bd] = b[0].split('/').map(Number);
        return am === bm ? ad - bd : am - bm;
      })
      .slice(-14)
      .map(([name, sales]) => ({ name, sales }));
  }, [analytics, filteredOrders, orders]);

  const maxChart = Math.max(...chartData.map((d: any) => Number(d.sales || 0)), 1);

  // Financial KPIs
  const kpis = useMemo(() => {
    const revenue =
      Number(reportsData.revenue?.total_revenue ?? reportsData.revenue?.net_profit ?? 0) ||
      orderStats.revenue;
    const prevRevenue = Number(reportsData.prevRevenue?.total_revenue ?? 0);
    const expenses = (reportsData.expenses || [])
      .filter((e: any) => inPeriod(e.date, curRange))
      .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const netProfit = Number(
      reportsData.profit?.net_profit ?? reportsData.profit?.profit ?? revenue - expenses
    );
    const revGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    return { revenue, prevRevenue, expenses, netProfit, revGrowth, profitMargin };
  }, [reportsData, inPeriod, curRange, orderStats.revenue]);

  // Breakdown sections
  const sections = useMemo(() => {
    // Payment method breakdown
    const byPayment = new Map<string, number>();
    filteredOrders.forEach((o) => {
      const pm = String(o.payment_method || o.paymentMethod || 'الدفع عند الاستلام');
      byPayment.set(pm, (byPayment.get(pm) || 0) + Number(o.total || o.total_amount || 0));
    });

    // Purchases
    const accInv: any[] = reportsData.accInvoices || [];
    const purchases = accInv.filter(
      (i: any) => String(i.invoice_type || i.invoiceType) === 'purchase'
    );
    const purchasesTotal = purchases.reduce(
      (s, i) => s + Number(i.total_amount || i.total || 0),
      0
    );
    const purchasesPaid = purchases.reduce(
      (s, i) => s + Number(i.paid_amount || i.paidAmount || i.paid || 0),
      0
    );
    const bySupplier = new Map<string, number>();
    purchases.forEach((i) => {
      const n = i.entity_name || i.entityName || '—';
      bySupplier.set(n, (bySupplier.get(n) || 0) + Number(i.total_amount || i.total || 0));
    });

    // Expenses by category
    const expenses: any[] = (reportsData.expenses || []).filter((e: any) =>
      inPeriod(e.date, curRange)
    );
    const expByCategory = new Map<string, number>();
    expenses.forEach((e) => {
      const c = e.category || 'عام وإداري';
      expByCategory.set(c, (expByCategory.get(c) || 0) + Number(e.amount || 0));
    });

    // Aging debts
    const aging: any[] = reportsData.aging || [];
    const customerDues = aging.filter(
      (a: any) => String(a.entity_type || a.entityType || 'customer') === 'customer'
    );
    const vendorDues = aging.filter((a: any) => String(a.entity_type || a.entityType) === 'vendor');
    const totalCustomerDue = (customerDues.length ? customerDues : aging).reduce(
      (s, a) => s + Number(a.total_outstanding ?? a.total ?? a.outstanding ?? 0),
      0
    );
    const totalVendorDue = (vendorDues.length ? vendorDues : []).reduce(
      (s, a) => s + Number(a.total_outstanding ?? a.total ?? a.outstanding ?? 0),
      0
    );

    // Wallets
    const wallets: any[] = reportsData.wallets || [];
    const totalLiquidity = wallets.reduce((s, w) => s + Number(w.balance || 0), 0);

    // Products & Stock
    const products: any[] = reportsData.products || [];
    const lowStock = products.filter(
      (p) => Number(p.stock || p.quantity || 0) <= 5 && Number(p.stock || p.quantity || 0) > 0
    ).length;
    const outStock = products.filter((p) => Number(p.stock || p.quantity || 0) <= 0).length;
    const stockValue = products.reduce(
      (s, p) =>
        s + Number(p.costPrice || p.cost || p.price || 0) * Number(p.stock || p.quantity || 0),
      0
    );

    return {
      byPayment,
      purchasesTotal,
      purchasesPaid,
      bySupplier,
      expByCategory,
      totalCustomerDue,
      totalVendorDue,
      wallets,
      totalLiquidity,
      products,
      lowStock,
      outStock,
      stockValue,
      suppliers: reportsData.suppliers || [],
    };
  }, [filteredOrders, reportsData, inPeriod, curRange]);

  const handleExportCSV = () => {
    downloadCSV(
      `analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`,
      ['المؤشر', 'القيمة'],
      [
        ['إجمالي الطلبات', orderStats.total],
        ['إجمالي الإيرادات', kpis.revenue.toFixed(2)],
        ['صافي الربح', kpis.netProfit.toFixed(2)],
        ['المصروفات', kpis.expenses.toFixed(2)],
        ['متوسط قيمة الطلب', orderStats.avgOrder.toFixed(2)],
        ['الطلبات المكتملة', orderStats.delivered],
        ['الطلبات الملغاة', orderStats.cancelled],
        ['إجمالي السيولة النقدية', sections.totalLiquidity.toFixed(2)],
        ['مديونيات العملاء المستحقة', sections.totalCustomerDue.toFixed(2)],
        ['مستحقات الموردين', sections.totalVendorDue.toFixed(2)],
        ['قيمة المخزون الإجمالية', sections.stockValue.toFixed(2)],
      ]
    );
  };

  return (
    <div className="min-h-full text-slate-900 space-y-6" style={INV_PAGE_FONT} dir="rtl">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              التحليلات والتقارير
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {curRange.label}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-400">
            لوحة موحدة لكل مؤشرات الأداء والتقارير المالية والتشغيلية المباشرة
          </p>
        </div>

        {/* Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all cursor-pointer"
            title="فترة التحليلات"
          >
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => analyticsQuery.refetch()}
            disabled={analyticsQuery.isFetching}
            className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            title="تصدير تقرير CSV"
          >
            <Download size={14} />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm font-bold text-right">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[45vh] bg-white rounded-2xl border border-slate-200/80 p-12">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-400">جاري تجميع كافة التقارير والبيانات...</p>
        </div>
      ) : (
        <>
          {/* ============================================================
           * Clean Minimalist Stat Cards (NO annoying square icon badges!)
           * ============================================================ */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            {/* Card 1: إجمالي الطلبات */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs text-right transition-all hover:border-slate-300">
              <span className="text-slate-400 font-bold text-xs block mb-1">إجمالي الطلبات</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                {orderStats.total}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">
                {orderStats.delivered} مكتمل · {orderStats.cancelled} ملغي
              </div>
            </div>

            {/* Card 2: إجمالي الإيرادات */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs text-right transition-all hover:border-slate-300">
              <span className="text-slate-400 font-bold text-xs block mb-1">إجمالي الإيرادات</span>
              <div
                className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums"
                dir="ltr"
              >
                ج.م {fmt(kpis.revenue)}
              </div>
              <div className="text-[11px] font-semibold mt-1 text-slate-500">
                {kpis.revGrowth !== 0 ? (
                  <span className={kpis.revGrowth > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {kpis.revGrowth > 0 ? '↑ ' : '↓ '}
                    {Math.abs(kpis.revGrowth).toFixed(1)}% مقارنة
                  </span>
                ) : (
                  'مبيعات الفترة'
                )}
              </div>
            </div>

            {/* Card 3: صافي الأرباح */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs text-right transition-all hover:border-slate-300">
              <span className="text-slate-400 font-bold text-xs block mb-1">صافي الأرباح</span>
              <div
                className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${
                  kpis.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
                dir="ltr"
              >
                ج.م {fmt(kpis.netProfit)}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">
                هامش: {kpis.profitMargin.toFixed(1)}%
              </div>
            </div>

            {/* Card 4: متوسط الطلب */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs text-right transition-all hover:border-slate-300">
              <span className="text-slate-400 font-bold text-xs block mb-1">متوسط الطلب</span>
              <div
                className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums"
                dir="ltr"
              >
                ج.م {fmt(Math.round(orderStats.avgOrder))}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">لكل عملية بيع</div>
            </div>

            {/* Card 5: المصروفات */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs text-right transition-all hover:border-slate-300">
              <span className="text-slate-400 font-bold text-xs block mb-1">المصروفات</span>
              <div
                className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight tabular-nums"
                dir="ltr"
              >
                ج.م {fmt(kpis.expenses)}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">مصاريف التشغيل</div>
            </div>

            {/* Card 6: العملاء */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs text-right transition-all hover:border-slate-300">
              <span className="text-slate-400 font-bold text-xs block mb-1">العملاء</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                {customerStats?.totalCustomers || analytics?.totalCustomers || 0}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">قاعدة العملاء</div>
            </div>
          </div>

          {/* ============================================================
           * Navigation Tabs (All Reports Under One Roof)
           * ============================================================ */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Tab navigation pills */}
            <div className="flex items-center gap-1.5 p-2 border-b border-slate-100 overflow-x-auto no-scrollbar">
              {[
                { id: 'overview', label: 'نظرة عامة ورسوم' },
                { id: 'sales', label: 'المبيعات والطلبات' },
                { id: 'profits', label: 'الأرباح والمصروفات' },
                { id: 'purchases', label: 'المشتريات والموردين' },
                { id: 'aging', label: 'الديون والمستحقات' },
                { id: 'cash', label: 'الخزائن والسيولة' },
                { id: 'inventory', label: 'المنتجات والمخزون' },
                { id: 'taxes', label: 'الضرائب' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-5 sm:p-6">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Daily Sales Chart */}
                  <div className="rounded-xl border border-slate-100 p-5 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Activity size={16} className="text-slate-500" />
                        <h2 className="font-black text-slate-900 text-sm">مبيعات يومية</h2>
                      </div>
                      <span className="text-xs font-bold text-slate-400">
                        إجمالي الفترة: ج.م {fmt(orderStats.revenue)}
                      </span>
                    </div>

                    {chartData.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 font-bold text-sm">
                        لا توجد حركة مبيعات مسجلة في هذه الفترة
                      </div>
                    ) : (
                      <div className="flex items-end gap-2 sm:gap-3 h-44 sm:h-52 pt-4">
                        {chartData.map((d: any, i: number) => (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                          >
                            <div
                              className="w-full max-w-[40px] rounded-t-lg bg-slate-900 transition-all hover:bg-cyan-500 cursor-pointer"
                              style={{
                                height: `${Math.max((Number(d.sales || 0) / maxChart) * 100, 4)}%`,
                              }}
                              title={`${d.name}: ج.م ${Number(d.sales || 0).toLocaleString()}`}
                            />
                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                              {d.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Secondary stats row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-slate-50/60 rounded-xl border border-slate-100 p-4 text-right">
                      <span className="text-xs font-bold text-slate-400 block mb-1">
                        نسبة إكمال الطلبات
                      </span>
                      <div className="text-xl font-black text-slate-900">
                        {orderStats.total > 0
                          ? Math.round((orderStats.delivered / orderStats.total) * 100)
                          : 0}
                        %
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold mt-1">
                        {orderStats.delivered} من أصل {orderStats.total} طلب
                      </p>
                    </div>

                    <div className="bg-slate-50/60 rounded-xl border border-slate-100 p-4 text-right">
                      <span className="text-xs font-bold text-slate-400 block mb-1">
                        نسبة الإلغاء
                      </span>
                      <div className="text-xl font-black text-slate-900">
                        {orderStats.total > 0
                          ? Math.round((orderStats.cancelled / orderStats.total) * 100)
                          : 0}
                        %
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold mt-1">
                        {orderStats.cancelled} طلبات ملغاة
                      </p>
                    </div>

                    <div className="bg-slate-50/60 rounded-xl border border-slate-100 p-4 text-right">
                      <span className="text-xs font-bold text-slate-400 block mb-1">
                        إجمالي الزوار
                      </span>
                      <div className="text-xl font-black text-slate-900">
                        {analytics?.visitors || 0}
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold mt-1">
                        زيارات المتجر والموقع
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SALES & ORDERS */}
              {activeTab === 'sales' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">إجمالي المبيعات</span>
                      <div className="text-lg font-black text-slate-900 mt-1">
                        ج.م {fmt2(orderStats.revenue)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">الطلبات المسجلة</span>
                      <div className="text-lg font-black text-slate-900 mt-1">
                        {orderStats.total} طلب
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">متوسط السلة</span>
                      <div className="text-lg font-black text-slate-900 mt-1">
                        ج.م {fmt2(orderStats.avgOrder)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-slate-800 mb-3">
                      توزيع المبيعات حسب طريقة الدفع
                    </h3>
                    {sections.byPayment.size === 0 ? (
                      <p className="text-slate-400 text-xs font-bold py-4">
                        لا توجد طلبات في هذه الفترة
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {[...sections.byPayment.entries()].map(([method, total]) => (
                          <MiniBar
                            key={method}
                            label={method}
                            value={total}
                            max={Math.max(1, ...sections.byPayment.values())}
                            color="bg-slate-900"
                            suffix=" ج.م"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PROFITS & EXPENSES */}
              {activeTab === 'profits' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">الإيرادات</span>
                      <div className="text-lg font-black text-emerald-700 mt-1">
                        ج.م {fmt2(kpis.revenue)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">المصروفات</span>
                      <div className="text-lg font-black text-rose-700 mt-1">
                        ج.م {fmt2(kpis.expenses)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">صافي الربح</span>
                      <div className="text-lg font-black text-slate-900 mt-1">
                        ج.م {fmt2(kpis.netProfit)}
                      </div>
                    </div>
                    <div className="bg-slate-900 rounded-xl p-4 text-center text-white">
                      <span className="text-xs font-bold text-slate-300">هامش الربح</span>
                      <div className="text-lg font-black mt-1">{kpis.profitMargin.toFixed(1)}%</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-slate-800 mb-3">
                      تفصيل المصروفات حسب التصنيف
                    </h3>
                    {sections.expByCategory.size === 0 ? (
                      <p className="text-slate-400 text-xs font-bold py-4">
                        لا توجد بنود مصروفات مسجلة في الفترة
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {[...sections.expByCategory.entries()].map(([cat, amount]) => (
                          <MiniBar
                            key={cat}
                            label={cat}
                            value={amount}
                            max={Math.max(1, ...sections.expByCategory.values())}
                            color="bg-rose-500"
                            suffix=" ج.م"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: PURCHASES & SUPPLIERS */}
              {activeTab === 'purchases' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">إجمالي المشتريات</span>
                      <div className="text-lg font-black text-slate-900 mt-1">
                        ج.م {fmt2(sections.purchasesTotal)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">المسدد للموردين</span>
                      <div className="text-lg font-black text-emerald-700 mt-1">
                        ج.م {fmt2(sections.purchasesPaid)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">المستحق للدفع</span>
                      <div className="text-lg font-black text-rose-700 mt-1">
                        ج.م {fmt2(Math.max(sections.purchasesTotal - sections.purchasesPaid, 0))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-slate-800 mb-3">
                      أعلى الموردين من حيث حجم التعامل
                    </h3>
                    {sections.bySupplier.size === 0 ? (
                      <p className="text-slate-400 text-xs font-bold py-4">
                        لا توجد فواتير مشتريات مسجلة في الفترة الحالية
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {[...sections.bySupplier.entries()].map(([supplier, amount]) => (
                          <MiniBar
                            key={supplier}
                            label={supplier}
                            value={amount}
                            max={Math.max(1, ...sections.bySupplier.values())}
                            color="bg-amber-500"
                            suffix=" ج.م"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: AGING & DEBTS */}
              {activeTab === 'aging' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">
                        مديونيات العملاء المستحقة
                      </span>
                      <div className="text-lg font-black text-rose-700 mt-1">
                        ج.م {fmt2(sections.totalCustomerDue)}
                      </div>
                      <Link
                        href="/dashboard/finance/receivables"
                        className="text-xs font-bold text-slate-700 hover:underline inline-block mt-2"
                      >
                        فتح سجل العملاء والمدينون ←
                      </Link>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">
                        مستحقات الموردين المؤجلة
                      </span>
                      <div className="text-lg font-black text-rose-700 mt-1">
                        ج.م {fmt2(sections.totalVendorDue)}
                      </div>
                      <Link
                        href="/dashboard/finance/payables"
                        className="text-xs font-bold text-slate-700 hover:underline inline-block mt-2"
                      >
                        فتح سجل الموردون والدائنون ←
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: CASH & WALLETS */}
              {activeTab === 'cash' && (
                <div className="space-y-5">
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <span className="text-xs font-bold text-slate-400">
                      إجمالي السيولة النقدية الحالية
                    </span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      ج.م {fmt2(sections.totalLiquidity)}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-slate-800 mb-3">
                      الأرصدة بالخزائن والمحافظ والبنوك
                    </h3>
                    {sections.wallets.length === 0 ? (
                      <p className="text-slate-400 text-xs font-bold py-4">
                        لم يتم تسجيل حسابات مالية بعد
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {sections.wallets.map((w: any) => (
                          <MiniBar
                            key={w.id || w.name}
                            label={w.name || 'حساب نقدية'}
                            value={Number(w.balance || 0)}
                            max={Math.max(
                              1,
                              ...sections.wallets.map((x: any) => Number(x.balance || 0))
                            )}
                            color="bg-teal-600"
                            suffix=" ج.م"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 7: INVENTORY & PRODUCTS */}
              {activeTab === 'inventory' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">إجمالي قيمة المخزون</span>
                      <div className="text-lg font-black text-slate-900 mt-1">
                        ج.م {fmt2(sections.stockValue)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">عدد الأصناف</span>
                      <div className="text-lg font-black text-slate-900 mt-1">
                        {sections.products.length} صنف
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">منخفض المخزون</span>
                      <div className="text-lg font-black text-amber-600 mt-1">
                        {sections.lowStock} صنف
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">نافد تماماً</span>
                      <div className="text-lg font-black text-rose-600 mt-1">
                        {sections.outStock} صنف
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Link
                      href="/dashboard/inventory"
                      className="text-xs font-black text-slate-800 hover:underline"
                    >
                      الانتقال إلى لوحة إدارة المخزون الكاملة ←
                    </Link>
                  </div>
                </div>
              )}

              {/* TAB 8: TAXES */}
              {activeTab === 'taxes' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">الضرائب النشطة</span>
                      <div className="text-lg font-black text-slate-900 mt-1">
                        {(reportsData.taxRates || []).length} معدلات
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">الإقرارات المقدمة</span>
                      <div className="text-lg font-black text-slate-900 mt-1">
                        {(reportsData.taxReturns || []).length} إقرار
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <span className="text-xs font-bold text-slate-400">تفاصيل المحاسبة</span>
                      <Link
                        href="/dashboard/finance/taxes"
                        className="text-xs font-black text-slate-800 hover:underline block mt-2"
                      >
                        سجل الضرائب والإقرارات ←
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================
           * Clean Sub-Analytics Pages Quick Links
           * ============================================================ */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-black text-slate-900 text-sm">صفحات التحليلات التخصصية</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ANALYTICS_PAGES.map((p) => (
                <Link
                  key={p.id}
                  href={p.href}
                  className="group bg-white border border-slate-200/80 rounded-xl p-4 text-right hover:border-slate-300 hover:shadow-xs transition-all flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-slate-950 transition-colors">
                      {p.label}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5 truncate">
                      {p.desc}
                    </p>
                  </div>
                  <ChevronLeft
                    size={16}
                    className="text-slate-300 group-hover:text-slate-600 transition-colors shrink-0 mr-2"
                  />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
