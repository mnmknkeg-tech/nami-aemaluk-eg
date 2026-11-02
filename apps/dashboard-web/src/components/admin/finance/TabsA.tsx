'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Receipt,
  Building2,
  Percent,
  AlertTriangle,
  ArrowLeftRight,
} from 'lucide-react';
import {
  Panel,
  EmptyState,
  AdminTable,
  TH,
  TD,
  TR,
  formatEGP,
  fmtDate,
  Badge,
  type Tone,
} from '@/components/admin/ui';
import { cn } from '@/lib/cn';
import { Kpi, NotWired } from './Shared';
import type {
  FinanceOverview,
  RevenueRow,
  ExpenseRow,
  SettlementRow,
  TaxSummary,
} from '@/lib/api/adminFinance';

/* ── نظرة عامة ───────────────────────────────────────────── */

export function OverviewTab({ data }: { data: FinanceOverview | null }) {
  if (!data) return <NotWired what="ملخص الأرقام" />;

  const max = Math.max(...data.series.map((p) => Math.max(p.revenue, p.expenses)), 1);
  const net = data.monthRevenue - data.monthExpenses;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Kpi
          label="إيراد الشهر"
          value={formatEGP(data.monthRevenue)}
          icon={TrendingUp}
          tone="green"
        />
        <Kpi
          label="مصاريف الشهر"
          value={formatEGP(data.monthExpenses)}
          icon={TrendingDown}
          tone="red"
        />
        <Kpi
          label="صافي الربح"
          value={formatEGP(net)}
          icon={Percent}
          tone={net >= 0 ? 'green' : 'red'}
        />
        <Kpi
          label="اشتراكات متأخرة"
          value={data.overdueSubscriptions}
          icon={AlertTriangle}
          tone={data.overdueSubscriptions > 0 ? 'amber' : 'slate'}
        />
      </div>

      <Panel className="p-6 md:p-8">
        <h3 className="text-base font-black text-slate-900 mb-6">الإيراد مقابل المصروف (12 شهر)</h3>
        {data.series.length === 0 ? (
          <div className="py-10 text-center text-slate-400 font-bold text-sm">لا توجد بيانات</div>
        ) : (
          <>
            <div className="flex items-end gap-2 md:gap-4 h-64">
              {data.series.map((p) => (
                <div
                  key={p.month}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                >
                  <div className="flex items-end gap-1 w-full justify-center h-full">
                    <div
                      className="flex-1 max-w-5 rounded-t bg-emerald-400"
                      style={{ height: `${Math.max((p.revenue / max) * 100, 1)}%` }}
                      title={`إيراد ${formatEGP(p.revenue)}`}
                    />
                    <div
                      className="flex-1 max-w-5 rounded-t bg-red-300"
                      style={{ height: `${Math.max((p.expenses / max) * 100, 1)}%` }}
                      title={`مصروف ${formatEGP(p.expenses)}`}
                    />
                  </div>
                  <span className="text-[9px] md:text-[10px] font-bold text-slate-400 shrink-0">
                    {p.month}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <i className="w-3 h-3 rounded bg-emerald-400" /> إيراد
              </span>
              <span className="flex items-center gap-1.5">
                <i className="w-3 h-3 rounded bg-red-300" /> مصروف
              </span>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

/* ── الإيرادات ───────────────────────────────────────────── */

const REVENUE_TONE: Record<RevenueRow['status'], { tone: Tone; label: string }> = {
  active: { tone: 'green', label: 'نشط' },
  overdue: { tone: 'red', label: 'متأخر' },
  trial: { tone: 'sky', label: 'تجريبي' },
  canceled: { tone: 'slate', label: 'ملغي' },
};

export function RevenueTab({ rows }: { rows: RevenueRow[] | null }) {
  if (!rows) return <NotWired what="إيراد الاشتراكات" />;
  if (rows.length === 0) {
    return (
      <EmptyState icon={PiggyBank} title="لا توجد اشتراكات" subtitle="لم تُسجّل أي اشتراكات بعد." />
    );
  }

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const overdue = rows.filter((r) => r.status === 'overdue');

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <Panel className="p-4 border-amber-200 bg-amber-50">
          <p className="text-amber-800 font-black text-sm">
            {overdue.length} اشتراك متأخر — بإجمالي{' '}
            {formatEGP(overdue.reduce((s, r) => s + r.amount, 0))}
          </p>
        </Panel>
      )}
      <Panel>
        <AdminTable
          minW="720px"
          head={
            <>
              <th className={TH}>المتجر</th>
              <th className={TH}>الباقة</th>
              <th className={TH}>المبلغ</th>
              <th className={TH}>التجديد</th>
              <th className={TH}>الحالة</th>
            </>
          }
        >
          {rows.map((r) => {
            const st = REVENUE_TONE[r.status] || REVENUE_TONE.active;
            return (
              <tr key={r.id} className={TR}>
                <td className={cn(TD, 'font-bold text-slate-900')}>{r.shopName}</td>
                <td className={TD}>
                  <Badge tone="cyan">{r.plan}</Badge>
                </td>
                <td className={cn(TD, 'font-black tabular-nums text-emerald-600')}>
                  {formatEGP(r.amount)}
                </td>
                <td className={cn(TD, 'text-slate-500')}>{fmtDate(r.renewsAt)}</td>
                <td className={TD}>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </td>
              </tr>
            );
          })}
        </AdminTable>
        <div className="p-4 border-t border-slate-100 flex justify-between font-black">
          <span className="text-slate-500">الإجمالي</span>
          <span className="text-emerald-600 tabular-nums">{formatEGP(total)}</span>
        </div>
      </Panel>
    </div>
  );
}
