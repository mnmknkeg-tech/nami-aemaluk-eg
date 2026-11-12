'use client';

/**
 * تبويب كشف الحساب داخل صفحة الموردين — اختيار مورد ثم عرض حركاته
 * (أوامر شراء + مدفوعات) مع الرصيد الجاري لكل حركة.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScrollText,
  RefreshCw,
  Download,
  Printer,
  Truck,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import {
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type Entry = {
  id: string;
  ref: string;
  kind: 'invoice' | 'payment';
  date: string;
  debit: number; // علينا (فاتورة شراء)
  credit: number; // دفعناه
  balance: number;
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');

export default function StatementView() {
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const [supRes, poRes] = await Promise.all([
        apiRequest(`/suppliers/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/purchase-orders/shop/${sid}`).catch(() => ({ data: [] })),
      ]);
      const supData = Array.isArray(supRes) ? supRes : supRes?.data || [];
      const poData = Array.isArray(poRes) ? poRes : poRes?.data || [];
      setSuppliers(
        supData.map((s: any) => ({ id: String(s.id), name: s.name || s.nameAr || '---' }))
      );
      setOrders(poData);
      if (supData.length > 0) setSelected(String(supData[0].id));
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedName = useMemo(
    () => suppliers.find((s) => s.id === selected)?.name || '',
    [suppliers, selected]
  );

  const entries = useMemo<Entry[]>(() => {
    if (!selectedName) return [];
    const mine = orders.filter(
      (o: any) =>
        (o.supplierName || o.supplier_name || o.supplierId || o.supplier_id) === selectedName ||
        String(o.supplierId || o.supplier_id || '') === selected
    );
    type Raw = {
      id: string;
      ref: string;
      kind: 'invoice' | 'payment';
      date: string;
      debit: number;
      credit: number;
    };
    const raw: Raw[] = [];
    mine.forEach((o: any) => {
      const ref = o.orderNumber || o.order_number || `PO-${String(o.id).slice(0, 6)}`;
      const date = o.orderDate || o.order_date || o.createdAt || new Date().toISOString();
      const total = Number(o.totalAmount || o.total_amount || 0);
      const paid = Number(o.paidAmount || o.paid_amount || 0);
      raw.push({ id: `inv-${o.id}`, ref, kind: 'invoice', date, debit: total, credit: 0 });
      if (paid > 0) {
        raw.push({
          id: `pay-${o.id}`,
          ref: `دفعة — ${ref}`,
          kind: 'payment',
          date,
          debit: 0,
          credit: paid,
        });
      }
    });
    raw.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let running = 0;
    return raw.map((r) => {
      running += r.debit - r.credit;
      return { ...r, balance: running };
    });
  }, [orders, selected, selectedName]);

  const totals = useMemo(
    () => ({
      debit: entries.reduce((s, e) => s + e.debit, 0),
      credit: entries.reduce((s, e) => s + e.credit, 0),
    }),
    [entries]
  );
  const balance = totals.debit - totals.credit;

  const exportCSV = useCallback(() => {
    if (!selectedName) return;
    const headers = ['Date', 'Ref', 'Type', 'Debit', 'Credit', 'Balance'];
    const body = entries.map((e) => [
      e.date,
      e.ref,
      e.kind === 'invoice' ? 'فاتورة' : 'دفعة',
      e.debit,
      e.credit,
      e.balance,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: `statement-${selectedName}.csv`, headers, rows: [...body] },
        'csv'
      );
      downloadBlob(blob, `statement-${selectedName}.csv`);
    });
  }, [entries, selectedName]);

  const printStatement = useCallback(() => {
    if (!selectedName) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    const rows = entries
      .map(
        (e) => `
      <tr>
        <td>${new Date(e.date).toLocaleDateString('ar-EG')}</td>
        <td>${e.ref}</td>
        <td>${e.kind === 'invoice' ? 'فاتورة شراء' : 'دفعة'}</td>
        <td>${e.debit ? e.debit.toLocaleString() : '-'}</td>
        <td>${e.credit ? e.credit.toLocaleString() : '-'}</td>
        <td><b>${e.balance.toLocaleString()}</b></td>
      </tr>`
      )
      .join('');
    printWindow.document.write(`
      <html dir="rtl"><head><title>كشف حساب — ${selectedName}</title></head>
      <body style="font-family:Arial,sans-serif;padding:24px">
        <h2 style="text-align:center">كشف حساب مورد</h2>
        <p style="text-align:center;font-weight:bold">${selectedName}</p>
        <table dir="rtl" border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;text-align:center">
          <tr style="background:#f1f5f9">
            <th>التاريخ</th><th>المرجع</th><th>النوع</th><th>مدين</th><th>دائن</th><th>الرصيد</th>
          </tr>
          ${rows}
        </table>
        <p style="text-align:left;margin-top:12px;font-weight:bold">الرصيد النهائي: ${balance.toLocaleString()} ج.م</p>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  }, [entries, selectedName, balance]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar hint={selectedName ? `كشف حساب: ${selectedName}` : 'اختر موردًا لعرض كشف حسابه'}>
        <InvToolButton onClick={() => load()}>
          <RefreshCw size={14} />
          تحديث
        </InvToolButton>
        <InvToolButton onClick={exportCSV} disabled={!selectedName}>
          <Download size={14} />
          تصدير CSV
        </InvToolButton>
        <InvToolButton primary onClick={printStatement} disabled={!selectedName}>
          <Printer size={14} />
          طباعة الكشف
        </InvToolButton>
      </InvToolbar>

      <div className="mt-3">
        <InvControlsCard
          search={selected}
          onSearchChange={setSelected}
          searchPlaceholder="اختر المورد من القائمة…"
          filters={
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none min-w-[200px]"
            >
              <option value="">— اختر المورد —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          }
        />
      </div>

      {selectedName && (
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-rose-500" />
              <span className="text-xs font-bold text-slate-500">إجمالي الفواتير</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900">
              ج.م {fmt(totals.debit)}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-xs font-bold text-slate-500">إجمالي المدفوعات</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900">
              ج.م {fmt(totals.credit)}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ScrollText size={16} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-500">الرصيد المستحق</span>
            </div>
            <div
              className={`text-lg sm:text-xl font-black ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
            >
              ج.م {fmt(balance)}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : !selectedName ? (
          <InvEmpty icon={Truck} title="اختر موردًا من القائمة لعرض كشف الحساب" />
        ) : entries.length === 0 ? (
          <InvEmpty icon={ScrollText} title="لا توجد حركات لهذا المورد بعد" />
        ) : (
          <InvTableCard
            columns={[
              { label: 'التاريخ', className: 'col-span-2' },
              { label: 'المرجع', className: 'col-span-3' },
              { label: 'النوع', className: 'col-span-2' },
              { label: 'مدين (فواتير)', className: 'col-span-2' },
              { label: 'دائن (مدفوعات)', className: 'col-span-2' },
              { label: 'الرصيد', className: 'col-span-1' },
            ]}
          >
            {entries.map((e) => (
              <InvRow key={e.id}>
                <div className="col-span-2 pr-4 text-slate-600 text-xs sm:text-sm whitespace-nowrap">
                  {new Date(e.date).toLocaleDateString('ar-EG')}
                </div>
                <div className="col-span-3 min-w-0">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {e.ref}
                  </div>
                </div>
                <div className="col-span-2 pr-4">
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${
                      e.kind === 'invoice'
                        ? 'text-rose-600 bg-rose-50 border-rose-200'
                        : 'text-emerald-600 bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    {e.kind === 'invoice' ? 'فاتورة شراء' : 'دفعة'}
                  </span>
                </div>
                <div className="col-span-2 pr-4 font-semibold text-rose-600 text-xs sm:text-sm">
                  {e.debit ? `ج.م ${fmt(e.debit)}` : '—'}
                </div>
                <div className="col-span-2 pr-4 font-semibold text-emerald-600 text-xs sm:text-sm">
                  {e.credit ? `ج.م ${fmt(e.credit)}` : '—'}
                </div>
                <div className="col-span-1 pr-4 font-bold text-slate-900 text-xs sm:text-sm">
                  {fmt(e.balance)}
                </div>
              </InvRow>
            ))}
          </InvTableCard>
        )}
      </div>
    </div>
  );
}
