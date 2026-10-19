'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, ArrowLeftRight, Percent } from 'lucide-react';
import { useToast } from '@/components/settings/ToastProvider';
import { PageHeader, LoadingBlock, TabBar, BTN_GHOST } from '@/components/admin/ui';
import { OverviewTab, RevenueTab } from '@/components/admin/finance/TabsA';
import { ExpensesTab, SettlementsTab, TaxTab } from '@/components/admin/finance/TabsB';
import {
  fetchFinanceOverview,
  fetchRevenueRows,
  fetchExpenseRows,
  fetchSettlements,
  fetchTaxSummary,
  type FinanceOverview,
  type RevenueRow,
  type ExpenseRow,
  type SettlementRow,
  type TaxSummary,
} from '@/lib/api/adminFinance';

type TabId = 'overview' | 'revenue' | 'expenses' | 'settlements' | 'tax';

/**
 * صفحة واحدة تجمع كل مالية المنصة في 5 تبويبات.
 * مفيش تنقل ولا تكرار — كل قسم مال بيظهر هنا.
 */
export default function AdminFinancePage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [revenue, setRevenue] = useState<RevenueRow[] | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[] | null>(null);
  const [settlements, setSettlements] = useState<SettlementRow[] | null>(null);
  const [tax, setTax] = useState<TaxSummary | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const [o, r, e, s, t] = await Promise.all([
          fetchFinanceOverview(),
          fetchRevenueRows(),
          fetchExpenseRows(),
          fetchSettlements(),
          fetchTaxSummary(),
        ]);
        setOverview(o);
        setRevenue(r);
        setExpenses(e);
        setSettlements(s);
        setTax(t);
      } catch {
        toast({ title: 'فشل تحميل البيانات المالية', variant: 'destructive' });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingBlock />;

  const tabs = [
    { id: 'overview' as TabId, label: 'نظرة عامة', icon: Wallet },
    { id: 'revenue' as TabId, label: 'الإيرادات', icon: TrendingUp },
    { id: 'expenses' as TabId, label: 'المصاريف', icon: TrendingDown },
    { id: 'settlements' as TabId, label: 'التسويات', icon: ArrowLeftRight },
    { id: 'tax' as TabId, label: 'الضريبة', icon: Percent },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wallet}
        title="مالية المنصة"
        subtitle="الإيرادات والمصاريف والتسويات والضريبة — في مكان واحد"
        tone="green"
        actions={
          <button onClick={() => load(true)} disabled={refreshing} className={BTN_GHOST}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> تحديث
          </button>
        }
      />

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' && <OverviewTab data={overview} />}
      {tab === 'revenue' && <RevenueTab rows={revenue} />}
      {tab === 'expenses' && <ExpensesTab rows={expenses} />}
      {tab === 'settlements' && <SettlementsTab rows={settlements} />}
      {tab === 'tax' && <TaxTab data={tax} />}
    </div>
  );
}
