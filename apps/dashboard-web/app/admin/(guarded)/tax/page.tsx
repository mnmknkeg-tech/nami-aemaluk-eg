'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Percent, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/components/settings/ToastProvider';
import {
  PageHeader,
  Panel,
  LoadingBlock,
  EmptyState,
  AdminTable,
  TH,
  TD,
  TR,
  formatEGP,
  fmtDate,
  Badge,
  BTN_GHOST,
  type Tone,
} from '@/components/admin/ui';
import { NotWired } from '@/components/admin/finance/Shared';
import { cn } from '@/lib/cn';
import { fetchTaxObligations, type TaxObligation } from '@/lib/api/adminFinance';

const STATUS: Record<TaxObligation['status'], { tone: Tone; label: string; icon: any }> = {
  paid: { tone: 'green', label: 'مُسدَّدة', icon: CheckCircle2 },
  upcoming: { tone: 'amber', label: 'قادمة', icon: Clock },
  overdue: { tone: 'red', label: 'متأخرة', icon: AlertTriangle },
};

/**
 * الالتزامات الضريبية — صفحة منفصلة عن المالية عن قصد:
 * دي مهمة بتتعمل مرة في الشهر، فلازم تكون أولوية مستقلة مش تبويب
 * يخطر في-consumer كل يوم ويفرق معاه.
 */
export default function AdminTaxPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<TaxObligation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        setRows(await fetchTaxObligations());
      } catch {
        toast({ title: 'فشل تحميل الالتزامات الضريبية', variant: 'destructive' });
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

  const overdue = (rows || []).filter((r) => r.status === 'overdue');

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Percent}
        title="الالتزامات الضريبية"
        subtitle="مواعيد وواجبات ضريبية المنصة وحالة السداد"
        tone="amber"
        actions={
          <button onClick={() => load(true)} disabled={refreshing} className={BTN_GHOST}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> تحديث
          </button>
        }
      />

      {overdue.length > 0 && (
        <Panel className="p-4 border-red-200 bg-red-50">
          <p className="text-red-800 font-black text-sm">
            {overdue.length} التزام ضريبي متأخر — بأولوية السداد
          </p>
        </Panel>
      )}

      {!rows ? (
        <NotWired what="جدول الالتزامات الضريبية" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="لا توجد التزامات مستحقة"
          subtitle="لا توجد التزامات ضريبية مسجّلة حتى الآن."
        />
      ) : (
        <Panel>
          <AdminTable
            minW="720px"
            head={
              <>
                <th className={TH}>الالتزام</th>
                <th className={TH}>الفترة</th>
                <th className={TH}>المبلغ</th>
                <th className={TH}>تاريخ الاستحقاق</th>
                <th className={TH}>الحالة</th>
              </>
            }
          >
            {rows.map((o) => {
              const st = STATUS[o.status] || STATUS.upcoming;
              return (
                <tr key={o.id} className={TR}>
                  <td className={cn(TD, 'font-bold text-slate-900')}>{o.name}</td>
                  <td className={cn(TD, 'text-slate-500')}>{o.period}</td>
                  <td className={cn(TD, 'font-black tabular-nums text-amber-600')}>
                    {formatEGP(o.amount)}
                  </td>
                  <td className={cn(TD, 'text-slate-500')}>{fmtDate(o.dueAt)}</td>
                  <td className={TD}>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        </Panel>
      )}
    </div>
  );
}
