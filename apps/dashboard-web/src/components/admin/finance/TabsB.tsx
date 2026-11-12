'use client';

import React from 'react';
import { Receipt, Building2, Percent } from 'lucide-react';
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
import type { ExpenseRow, SettlementRow, TaxSummary } from '@/lib/api/adminFinance';

/* ── المصاريف ────────────────────────────────────────────── */

export function ExpensesTab({ rows }: { rows: ExpenseRow[] | null }) {
  if (!rows) return <NotWired what="المصاريف التشغيلية" />;
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="لا توجد مصاريف مسجّلة"
        subtitle="سجّل أول مصروف لتتبّع صافي الربح."
      />
    );
  }

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const byCategory = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + r.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(byCategory)
          .slice(0, 4)
          .map(([cat, sum]) => (
            <Kpi key={cat} label={cat} value={formatEGP(sum)} icon={Receipt} tone="red" />
          ))}
      </div>
      <Panel>
        <AdminTable
          minW="720px"
          head={
            <>
              <th className={TH}>البيان</th>
              <th className={TH}>التصنيف</th>
              <th className={TH}>المبلغ</th>
              <th className={TH}>التاريخ</th>
              <th className={TH}>متكرر</th>
            </>
          }
        >
          {rows.map((e) => (
            <tr key={e.id} className={TR}>
              <td className={cn(TD, 'font-bold text-slate-900')}>{e.label}</td>
              <td className={TD}>
                <Badge tone="amber">{e.category}</Badge>
              </td>
              <td className={cn(TD, 'font-black tabular-nums text-red-600')}>
                {formatEGP(e.amount)}
              </td>
              <td className={cn(TD, 'text-slate-500')}>{fmtDate(e.spentAt)}</td>
              <td className={TD}>
                {e.recurring ? (
                  <Badge tone="purple">شهري</Badge>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
        <div className="p-4 border-t border-slate-100 flex justify-between font-black">
          <span className="text-slate-500">إجمالي المصاريف</span>
          <span className="text-red-600 tabular-nums">{formatEGP(total)}</span>
        </div>
      </Panel>
    </div>
  );
}

/* ── التسويات ────────────────────────────────────────────── */

const SETTLE_TONE: Record<SettlementRow['status'], { tone: Tone; label: string }> = {
  pending: { tone: 'amber', label: 'معلّق' },
  transferred: { tone: 'green', label: 'تم التحويل' },
  disputed: { tone: 'red', label: 'متنازع عليه' },
};

export function SettlementsTab({ rows }: { rows: SettlementRow[] | null }) {
  if (!rows) return <NotWired what="تسويات المتاجر" />;
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="لا توجد تسويات"
        subtitle="ستظهر هنا مستحقات المتاجر بعد أول دورة."
      />
    );
  }

  const payable = rows.reduce((s, r) => s + r.netPayout, 0);
  const commission = rows.reduce((s, r) => s + r.commission, 0);

  return (
    <Panel>
      <AdminTable
        minW="820px"
        head={
          <>
            <th className={TH}>المتجر</th>
            <th className={TH}>إجمالي المبيعات</th>
            <th className={TH}>عمولة المنصة</th>
            <th className={TH}>الصافي للمتجر</th>
            <th className={TH}>الحالة</th>
          </>
        }
      >
        {rows.map((s) => {
          const st = SETTLE_TONE[s.status] || SETTLE_TONE.pending;
          return (
            <tr key={s.id} className={TR}>
              <td className={cn(TD, 'font-bold text-slate-900')}>{s.shopName}</td>
              <td className={cn(TD, 'tabular-nums text-slate-600')}>{formatEGP(s.grossSales)}</td>
              <td className={cn(TD, 'font-black tabular-nums text-emerald-600')}>
                {formatEGP(s.commission)}
              </td>
              <td className={cn(TD, 'font-black tabular-nums')}>{formatEGP(s.netPayout)}</td>
              <td className={TD}>
                <Badge tone={st.tone}>{st.label}</Badge>
              </td>
            </tr>
          );
        })}
      </AdminTable>
      <div className="p-4 border-t border-slate-100 flex flex-wrap gap-6 justify-between font-black text-sm">
        <span className="text-slate-500">
          عمولة المنصة <b className="text-emerald-600">{formatEGP(commission)}</b>
        </span>
        <span className="text-slate-500">
          المستحق للمتاجر <b className="text-amber-600">{formatEGP(payable)}</b>
        </span>
      </div>
    </Panel>
  );
}

/* ── الضريبة ─────────────────────────────────────────────── */

export function TaxTab({ data }: { data: TaxSummary | null }) {
  if (!data) return <NotWired what="ملخص ضريبة القيمة المضافة" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="مبيعات (مدخلات)"
          value={formatEGP(data.outputVat)}
          icon={Percent}
          tone="slate"
        />
        <Kpi
          label="مشتريات (مخرجات)"
          value={formatEGP(data.inputVat)}
          icon={Receipt}
          tone="slate"
        />
        <Kpi label="الوعاء الضريبي" value={formatEGP(data.netVatBase)} icon={Receipt} tone="cyan" />
        <Kpi
          label="الضريبة المستحقة"
          value={formatEGP(data.vatPayable)}
          icon={Percent}
          tone="amber"
        />
      </div>
      <Panel className="p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-slate-500 font-bold">
            الفترة <b className="text-slate-900">{data.periodLabel}</b> — النسبة {data.vatRate}%
          </span>
          <span className="text-slate-500 font-bold">
            تاريخ الاستحقاق <b className="text-slate-900">{fmtDate(data.dueAt)}</b>
          </span>
          <Badge tone={data.paid ? 'green' : 'amber'}>
            {data.paid ? 'مُسدَّدة' : 'غير مُسدَّدة'}
          </Badge>
        </div>
      </Panel>
    </div>
  );
}
