'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ScrollText, RefreshCw } from 'lucide-react';
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
  timeAgo,
  Badge,
  BTN_GHOST,
} from '@/components/admin/ui';
import { NotWired } from '@/components/admin/finance/Shared';
import { cn } from '@/lib/cn';
import { fetchAuditLog, type AuditEntry } from '@/lib/api/adminFinance';

/**
 * سجل العمليات الحساسة — مين عدّل رقم مالي إمتى.
 * موجودة كدليل عند أي خلاف، مش كصفحة تصفح.
 */
export default function AdminAuditLogPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        setRows(await fetchAuditLog(100));
      } catch {
        toast({ title: 'فشل تحميل السجل', variant: 'destructive' });
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

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ScrollText}
        title="سجل العمليات"
        subtitle="كل عملية حساسة: مين عملها وإمتى وبكم"
        tone="indigo"
        actions={
          <button onClick={() => load(true)} disabled={refreshing} className={BTN_GHOST}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> تحديث
          </button>
        }
      />

      {!rows ? (
        <NotWired what="سجل العمليات الحساسة" />
      ) : rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="السجل فارغ" subtitle="لا توجد عمليات مسجّلة بعد." />
      ) : (
        <Panel>
          <AdminTable
            minW="760px"
            head={
              <>
                <th className={TH}>المستخدم</th>
                <th className={TH}>العملية</th>
                <th className={TH}>العنصر</th>
                <th className={TH}>المبلغ</th>
                <th className={TH}>الوقت</th>
              </>
            }
          >
            {rows.map((e) => (
              <tr key={e.id} className={TR}>
                <td className={cn(TD, 'font-bold text-slate-900')}>{e.actor}</td>
                <td className={TD}>
                  <Badge tone="indigo">{e.action}</Badge>
                </td>
                <td className={cn(TD, 'text-slate-500')}>{e.entity}</td>
                <td className={cn(TD, 'font-black tabular-nums')}>
                  {e.amount == null ? '—' : formatEGP(e.amount)}
                </td>
                <td className={cn(TD, 'text-slate-400')}>{timeAgo(e.createdAt)}</td>
              </tr>
            ))}
          </AdminTable>
        </Panel>
      )}
    </div>
  );
}
