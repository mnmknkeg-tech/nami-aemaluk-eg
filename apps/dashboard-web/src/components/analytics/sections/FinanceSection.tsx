'use client';

/**
 * تاب «المالية» — تحليلات الإيرادات والمصروفات وصافي الربح والتدفق النقدي.
 * كل الأرقام من بيانات حقيقية فقط:
 * - تقارير المالية (revenue/profit/cashflow) ← /finance/reports/*
 * - المصروفات ← /finance/expenses/shop/:sid (تُفلتر بالفترة محليًا)
 * - الطلبات ← /orders/me?from&to (إيراد الفترة والفترة السابقة للمقارنة)
 * - المعاملات ← /finance/transactions/shop/:sid (حركة الخزائن داخل الفترة)
 * لا أرقام وهمية — أي مصدر فارغ يظهر بحالة فراغ عربية.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Droplets } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import {
  type PeriodKey,
  periodRange,
  prevPeriodRange,
  periodLabel,
  inPeriod,
  buildBuckets,
  fillBuckets,
  fmt,
  egp,
  KpiCard,
  ChartCard,
  SectionSkeleton,
  EmptyCard,
  ChartEmpty,
  DualAreaChart,
  ProfitBars,
  Donut,
  downloadCSV,
} from './financeShared';

export type FinanceSectionProps = {
  period: PeriodKey;
  /** يتغير عند الضغط على «تحديث» — إعادة جلب مع تغيّره */
  refreshKey?: number;
  /** تسجيل زر تصدير CSV في شريط أدوات الصفحة */
  registerExport?: (fn: (() => void) | null) => void;
};

type RevenueSummary = {
  total_revenue?: number;
  today_revenue?: number;
  month_revenue?: number;
  avg_order?: number;
};
type ProfitSummary = {
  net_profit?: number;
  profit?: number;
  revenue?: number;
  gross_profit?: number;
  margin?: number;
};
type CashflowSummary = { inflows?: number; outflows?: number; net_cashflow?: number };
type ExpenseRow = {
  id?: string;
  category?: string;
  amount?: number;
  date?: string;
  description?: string;
};
type OrderRow = {
  total?: number;
  total_amount?: number;
  grand_total?: number;
  created_at?: string;
  createdAt?: string;
  date?: string;
};
type TxRow = { type?: string; amount?: number; date?: string };

const orderTotalOf = (o: any) => Number(o?.total || o?.total_amount || o?.grand_total || 0);
const orderDateOf = (o: any) => String(o?.created_at || o?.createdAt || o?.date || '');
const txAmountOf = (t: any) => Number(t?.amount || 0);
const sumOf = (rows: any[], f: (x: any) => number) => rows.reduce((s, x) => s + f(x), 0);

/** استخراج موحّد للاستجابات — نفس نمط صفحة التقارير */
const settledData = (r: PromiseSettledResult<any>): any =>
  r.status === 'fulfilled' ? (r.value?.data !== undefined ? r.value.data : r.value) : null;
const settledList = (r: PromiseSettledResult<any>): any[] => {
  const v = settledData(r);
  return Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];
};

export default function FinanceSection({
  period,
  refreshKey,
  registerExport,
}: FinanceSectionProps) {
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [profit, setProfit] = useState<ProfitSummary | null>(null);
  const [cash, setCash] = useState<CashflowSummary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [ordersCur, setOrdersCur] = useState<OrderRow[]>([]);
  const [ordersPrev, setOrdersPrev] = useState<OrderRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const shop = await apiRequest('/shops/me');
        const sid = shop?.id;
        if (!sid || cancelled) return;
        const cur = periodRange(period);
        const prev = prevPeriodRange(period);
        const q = (f: string, t: string) => {
          const ps = new URLSearchParams();
          if (f) ps.set('from', f);
          if (t) ps.set('to', t);
          return ps.toString();
        };
        const ordQ = (f: string, t: string) =>
          `/orders/me?limit=200&from=${encodeURIComponent(`${f}T00:00:00Z`)}&to=${encodeURIComponent(`${t}T23:59:59Z`)}`;

        const [revRes, profitRes, cashRes, expRes, txRes, ordCurRes, ordPrevRes] =
          await Promise.allSettled([
            apiRequest(`/finance/reports/revenue/shop/${sid}?${q(cur.from, cur.to)}`).catch(
              () => null
            ),
            apiRequest(`/finance/reports/profit/shop/${sid}?${q(cur.from, cur.to)}`).catch(
              () => null
            ),
            apiRequest(`/finance/reports/cashflow/shop/${sid}?${q(cur.from, cur.to)}`).catch(
              () => null
            ),
            apiRequest(`/finance/expenses/shop/${sid}`).catch(() => null),
            apiRequest(`/finance/transactions/shop/${sid}`).catch(() => null),
            apiRequest(ordQ(cur.from, cur.to)).catch(() => null),
            apiRequest(ordQ(prev.from, prev.to)).catch(() => null),
          ]);
        if (cancelled) return;
        setRevenue(settledData(revRes));
        setProfit(settledData(profitRes));
        setCash(settledData(cashRes));
        setExpenses(settledList(expRes));
        setTxs(settledList(txRes));
        setOrdersCur(settledList(ordCurRes));
        setOrdersPrev(settledList(ordPrevRes));
      } catch {
        if (!cancelled) {
          setRevenue(null);
          setProfit(null);
          setCash(null);
          setExpenses([]);
          setTxs([]);
          setOrdersCur([]);
          setOrdersPrev([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, refreshKey]);

  /* ===== حسابات الفترة الحالية والسابقة — من بيانات حقيقية فقط ===== */
  const cur = useMemo(() => periodRange(period), [period]);
  const prev = useMemo(() => prevPeriodRange(period), [period]);

  const periodExpenses = useMemo(
    () => expenses.filter((e) => inPeriod(e?.date, cur)),
    [expenses, cur]
  );
  const expensesSum = useMemo(
    () => sumOf(periodExpenses, (e) => Number(e?.amount || 0)),
    [periodExpenses]
  );
  const prevExpensesSum = useMemo(
    () =>
      sumOf(
        expenses.filter((e) => inPeriod(e?.date, prev)),
        (e) => Number(e?.amount || 0)
      ),
    [expenses, prev]
  );

  const revCur = useMemo(() => sumOf(ordersCur, orderTotalOf), [ordersCur]);
  const revPrev = useMemo(() => sumOf(ordersPrev, orderTotalOf), [ordersPrev]);
  const revenueTrend = revPrev > 0 ? ((revCur - revPrev) / revPrev) * 100 : null;

  const expensesTrend =
    prevExpensesSum > 0 ? ((expensesSum - prevExpensesSum) / prevExpensesSum) * 100 : null;

  const totalRevenue = Number(revenue?.total_revenue ?? 0) || revCur;
  const netProfit = Number(profit?.net_profit ?? profit?.profit ?? revCur - expensesSum);
  const margin = revCur > 0 ? (netProfit / revCur) * 100 : null;

  const txIn = useMemo(
    () =>
      sumOf(
        txs.filter((t) => t?.type === 'income' && inPeriod(t?.date, cur)),
        txAmountOf
      ),
    [txs, cur]
  );
  const txOut = useMemo(
    () =>
      sumOf(
        txs.filter((t) => t?.type === 'expense' && inPeriod(t?.date, cur)),
        txAmountOf
      ),
    [txs, cur]
  );
  const prevCashNet = useMemo(() => {
    const inn = sumOf(
      txs.filter((t) => t?.type === 'income' && inPeriod(t?.date, prev)),
      txAmountOf
    );
    const out = sumOf(
      txs.filter((t) => t?.type === 'expense' && inPeriod(t?.date, prev)),
      txAmountOf
    );
    return inn - out;
  }, [txs, prev]);
  const cashNet = txIn || txOut ? txIn - txOut : Number(cash?.net_cashflow ?? 0);
  const cashTrend = prevCashNet > 0 ? ((cashNet - prevCashNet) / prevCashNet) * 100 : null;

  /* ===== سلاسل زمنية — حاويات حقيقية من الفترة ===== */
  const bucketData = useMemo(() => {
    const bs = buildBuckets(period, cur);
    fillBuckets(ordersCur, bs, period, 'revenue', orderDateOf, orderTotalOf);
    fillBuckets(
      periodExpenses,
      bs,
      period,
      'expenses',
      (e) => String(e?.date || ''),
      (e) => Number(e?.amount || 0)
    );
    return bs;
  }, [period, cur, ordersCur, periodExpenses]);
  const areaData = useMemo(
    () =>
      bucketData.map((b) => ({
        label: b.label,
        a: Number(b.revenue || 0),
        b: Number(b.expenses || 0),
      })),
    [bucketData]
  );
  const profitData = useMemo(
    () =>
      bucketData.map((b) => ({
        label: b.label,
        profit: Number(b.revenue || 0) - Number(b.expenses || 0),
      })),
    [bucketData]
  );
  const hasFlowSeries = areaData.some((d) => d.a !== 0 || d.b !== 0);
  const hasProfitSeries = profitData.some((d) => d.profit !== 0);

  /* ===== المصروفات حسب التصنيف ===== */
  const expByCategory = useMemo(() => {
    const m = new Map<string, number>();
    periodExpenses.forEach((e) => {
      const c = String(e?.category || 'غير مصنف');
      m.set(c, (m.get(c) || 0) + Number(e?.amount || 0));
    });
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [periodExpenses]);

  const hasAnyData =
    totalRevenue > 0 ||
    expensesSum > 0 ||
    expenses.length > 0 ||
    revCur > 0 ||
    txIn > 0 ||
    txOut > 0 ||
    Number(cash?.net_cashflow ?? 0) !== 0 ||
    ordersCur.length > 0;

  /* ===== تصدير CSV — يُسجَّل في شريط أدوات الصفحة ===== */
  useEffect(() => {
    if (!registerExport) return;
    if (loading || !hasAnyData) {
      registerExport(null);
      return () => registerExport(null);
    }
    const fn = () => {
      const rows: (string | number)[][] = [];
      rows.push(['إجمالي الإيرادات', 'تراكمي', totalRevenue]);
      rows.push(['إيراد الفترة', periodLabel(period), revCur]);
      rows.push(['المصروفات', periodLabel(period), expensesSum]);
      rows.push(['صافي الربح', periodLabel(period), netProfit]);
      rows.push(['التدفق النقدي', periodLabel(period), cashNet]);
      bucketData.forEach((b) =>
        rows.push([
          'سلسلة الفترة',
          b.label,
          Number(b.revenue || 0),
          Number(b.expenses || 0),
          Number(b.revenue || 0) - Number(b.expenses || 0),
        ])
      );
      expByCategory.forEach((d) => rows.push(['مصروفات حسب التصنيف', d.name, d.value]));
      downloadCSV(
        'finance-analytics.csv',
        ['البند', 'التفصيل', 'الإيراد (ج.م)', 'المصروف (ج.م)', 'الصافي (ج.م)'],
        rows
      );
    };
    registerExport(fn);
    return () => registerExport(null);
  }, [
    registerExport,
    loading,
    hasAnyData,
    totalRevenue,
    revCur,
    expensesSum,
    netProfit,
    cashNet,
    bucketData,
    expByCategory,
    period,
  ]);

  if (loading) return <SectionSkeleton />;

  if (!hasAnyData) {
    return (
      <EmptyCard
        title="لا توجد بيانات"
        hint="لا توجد حركة مالية مسجَّلة في هذه الفترة — جرّب اختيار فترة زمنية أطول من الفلتر بالأعلى"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== كروت المؤشرات ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={TrendingUp}
          iconClass="text-emerald-500"
          label="إجمالي الإيرادات"
          value={egp(totalRevenue)}
          valueClass="text-emerald-700"
          trendPct={revenueTrend ?? undefined}
          sub={revCur > 0 ? `إيراد ${periodLabel(period)}: ${egp(revCur)}` : undefined}
        />
        <KpiCard
          icon={TrendingDown}
          iconClass="text-rose-500"
          label="المصروفات"
          value={egp(expensesSum)}
          valueClass="text-rose-700"
          sub={
            <>
              <span>
                {periodExpenses.length} بند في {periodLabel(period)}
              </span>
              {expensesTrend !== null && (
                <span className={expensesTrend >= 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  {' — '}
                  {expensesTrend >= 0 ? '↑' : '↓'} {Math.abs(expensesTrend).toFixed(1)}% عن الفترة
                  السابقة
                </span>
              )}
            </>
          }
        />
        <KpiCard
          icon={Wallet}
          iconClass="text-slate-500"
          label="صافي الربح"
          value={egp(netProfit)}
          valueClass={netProfit >= 0 ? 'text-slate-900' : 'text-rose-700'}
          sub={margin !== null ? `هامش الربح ${margin.toFixed(1)}%` : undefined}
        />
        <KpiCard
          icon={Droplets}
          iconClass="text-cyan-500"
          label="التدفق النقدي"
          value={egp(cashNet)}
          valueClass={cashNet >= 0 ? 'text-cyan-700' : 'text-rose-700'}
          trendPct={cashTrend ?? undefined}
          sub={txIn > 0 || txOut > 0 ? `داخل ${egp(txIn)} • خارج ${egp(txOut)}` : undefined}
        />
      </div>

      {/* ===== الإيرادات مقابل المصروفات + المصروفات حسب التصنيف ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard title="الإيرادات مقابل المصروفات" sub={periodLabel(period)}>
            {hasFlowSeries ? (
              <DualAreaChart
                data={areaData}
                aName="الإيرادات"
                bName="المصروفات"
                aColor="#00E5FF"
                bColor="#F43F5E"
                gid="fin-rev-exp"
              />
            ) : (
              <ChartEmpty hint="لا حركة إيراد أو مصروف في هذه الفترة" />
            )}
          </ChartCard>
        </div>
        <ChartCard title="المصروفات حسب التصنيف" sub={`ج.م ${fmt(expensesSum)}`}>
          {expByCategory.length === 0 ? (
            <ChartEmpty hint="المصروفات تظهر بعد تسجيل أول مصروف" />
          ) : (
            <Donut
              data={expByCategory}
              centerValue={fmt(expensesSum)}
              centerLabel="إجمالي المصروفات"
            />
          )}
        </ChartCard>
      </div>

      {/* ===== صافي الربح لكل فترة ===== */}
      <ChartCard title="صافي الربح حسب الفترة" sub={periodLabel(period)}>
        {hasProfitSeries ? (
          <ProfitBars data={profitData} />
        ) : (
          <ChartEmpty hint="الربح يظهر بعد تسجيل إيرادات أو مصروفات" />
        )}
      </ChartCard>
    </div>
  );
}
