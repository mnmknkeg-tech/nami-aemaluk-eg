'use client';

/**
 * تبويبا المستحقات والمدفوعات داخل صفحة الموردين — تجميع مالي لكل مورد
 * من أوامر الشراء (القيمة/المدفوع/الرصيد المستحق).
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingDown, CheckCircle2, RefreshCw, Download, Truck, Banknote } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvStatusPill,
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type SupplierBalance = {
  supplierName: string;
  orders: number;
  total: number;
  paid: number;
  due: number;
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');

function SupplierBalancesBase({ mode }: { mode: 'payables' | 'payments' }) {
  const [rows, setRows] = useState<SupplierBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterDue, setFilterDue] = useState('all');

  const isPayables = mode === 'payables';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/purchase-orders/shop/${sid}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      const map = new Map<string, SupplierBalance>();
      data.forEach((o: any) => {
        const name = o.supplierName || o.supplier_name || '---';
        const total = Number(o.totalAmount || o.total_amount || 0);
        const paid = Number(o.paidAmount || o.paid_amount || 0);
        const e = map.get(name) || { supplierName: name, orders: 0, total: 0, paid: 0, due: 0 };
        e.orders += 1;
        e.total += total;
        e.paid += paid;
        e.due += Math.max(total - paid, 0);
        map.set(name, e);
      });
      setRows(Array.from(map.values()));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = rows.filter((r) =>
      r.supplierName.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    if (isPayables && filterDue === 'due') result = result.filter((r) => r.due > 0);
    if (isPayables && filterDue === 'clear') result = result.filter((r) => r.due <= 0);
    return [...result].sort((a, b) => (isPayables ? b.due - a.due : b.paid - a.paid));
  }, [rows, debouncedSearch, filterDue, isPayables]);

  const totals = useMemo(
    () => ({
      total: rows.reduce((s, r) => s + r.total, 0),
      paid: rows.reduce((s, r) => s + r.paid, 0),
      due: rows.reduce((s, r) => s + r.due, 0),
    }),
    [rows]
  );

  const exportCSV = useCallback(() => {
    const headers = ['Supplier', 'Orders', 'Total', 'Paid', 'Due'];
    const body = filtered.map((r) => [
      r.supplierName,
      r.orders,
      Math.round(r.total),
      Math.round(r.paid),
      Math.round(r.due),
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        {
          filename: isPayables ? 'supplier-payables.csv' : 'supplier-payments.csv',
          headers,
          rows: [...body],
        },
        'csv'
      );
      downloadBlob(blob, isPayables ? 'supplier-payables.csv' : 'supplier-payments.csv');
    });
  }, [filtered, isPayables]);

  const headline = isPayables
    ? {
        label: 'إجمالي المستحقات للموردين',
        value: `ج.م ${fmt(totals.due)}`,
        icon: TrendingDown,
        color: 'text-rose-600',
        bg: 'bg-rose-50',
      }
    : {
        label: 'إجمالي المدفوعات للموردين',
        value: `ج.م ${fmt(totals.paid)}`,
        icon: Banknote,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      };

  const secondary = isPayables
    ? { label: 'إجمالي المشتريات', value: `ج.م ${fmt(totals.total)}` }
    : { label: 'إجمالي المشتريات', value: `ج.م ${fmt(totals.total)}` };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar hint={`${rows.length} مورد`}>
        <InvToolButton onClick={() => load()}>
          <RefreshCw size={14} />
          تحديث
        </InvToolButton>
        <InvToolButton onClick={exportCSV}>
          <Download size={14} />
          تصدير CSV
        </InvToolButton>
      </InvToolbar>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${headline.bg} ${headline.color}`}
            >
              <headline.icon size={16} />
            </span>
            <span className="text-xs font-bold text-slate-500">{headline.label}</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            {headline.value}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-50 text-sky-600">
              <CheckCircle2 size={16} />
            </span>
            <span className="text-xs font-bold text-slate-500">{secondary.label}</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            {secondary.value}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <InvControlsCard
          tabs={
            isPayables
              ? [
                  { id: 'all', label: 'كل الموردين', count: rows.length },
                  { id: 'due', label: 'عليه مستحق', count: rows.filter((r) => r.due > 0).length },
                  { id: 'clear', label: 'خالص', count: rows.filter((r) => r.due <= 0).length },
                ]
              : undefined
          }
          activeTab={filterDue}
          onTabChange={(id) => setFilterDue(id)}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث باسم المورد…"
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : filtered.length === 0 ? (
          <InvEmpty
            icon={Truck}
            title={
              isPayables ? 'لا توجد مستحقات — كل المشتريات مسددة' : 'لا توجد مدفوعات للموردين بعد'
            }
          />
        ) : (
          <InvTableCard
            columns={[
              { label: 'المورد', className: 'col-span-3' },
              { label: 'الأوامر', className: 'col-span-2' },
              { label: 'إجمالي المشتريات', className: 'col-span-2' },
              { label: isPayables ? 'المدفوع' : 'المدفوعات', className: 'col-span-2' },
              { label: 'الرصيد المستحق', className: 'col-span-3' },
            ]}
          >
            {filtered.map((r) => (
              <InvRow key={r.supplierName}>
                <div className="col-span-3 min-w-0">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {r.supplierName}
                  </div>
                </div>
                <div className="col-span-2 pr-4 font-semibold text-slate-600 text-xs sm:text-sm">
                  {fmt(r.orders)}
                </div>
                <div className="col-span-2 pr-4 font-bold text-slate-900 text-xs sm:text-sm">
                  ج.م {fmt(r.total)}
                </div>
                <div className="col-span-2 pr-4 font-semibold text-emerald-600 text-xs sm:text-sm">
                  ج.م {fmt(r.paid)}
                </div>
                <div className="col-span-3 pr-4">
                  <InvStatusPill tone={r.due > 0 ? 'red' : 'emerald'}>
                    {r.due > 0 ? `مستحق ج.م ${fmt(r.due)}` : 'خالص'}
                  </InvStatusPill>
                </div>
              </InvRow>
            ))}
          </InvTableCard>
        )}
      </div>
    </div>
  );
}

export function PayablesView() {
  return <SupplierBalancesBase mode="payables" />;
}

export function PaymentsView() {
  return <SupplierBalancesBase mode="payments" />;
}
