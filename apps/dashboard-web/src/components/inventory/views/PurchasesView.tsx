'use client';

/**
 * تبويب المشتريات داخل صفحة الموردين — كل أوامر الشراء من منظور مالي:
 * القيمة والمدفوع والمتبقي لكل أمر.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingCart, RefreshCw, Download } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvStatusPill,
  InvPagination,
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type PO = {
  id: string;
  orderNumber: string;
  supplierName: string;
  status: string;
  orderDate: string;
  itemCount: number;
  totalAmount: number;
  paidAmount: number;
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');

export default function PurchasesView() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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
      setOrders(
        data.map((o: any) => ({
          id: String(o.id),
          orderNumber: o.orderNumber || o.order_number || '---',
          supplierName: o.supplierName || o.supplier_name || '---',
          status: o.status || 'draft',
          orderDate: o.orderDate || o.order_date || o.createdAt || new Date().toISOString(),
          itemCount: Number(o.itemCount || o.items_count || 0),
          totalAmount: Number(o.totalAmount || o.total_amount || 0),
          paidAmount: Number(o.paidAmount || o.paid_amount || 0),
        }))
      );
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        o.supplierName.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    if (filterStatus === 'unpaid') result = result.filter((o) => o.totalAmount - o.paidAmount > 0);
    else if (filterStatus === 'paid')
      result = result.filter((o) => o.totalAmount - o.paidAmount <= 0);
    else if (filterStatus !== 'all') result = result.filter((o) => o.status === filterStatus);
    return [...result].sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );
  }, [orders, debouncedSearch, filterStatus]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const totals = useMemo(
    () => ({
      value: orders.reduce((s, o) => s + o.totalAmount, 0),
      paid: orders.reduce((s, o) => s + o.paidAmount, 0),
      due: orders.reduce((s, o) => s + Math.max(o.totalAmount - o.paidAmount, 0), 0),
    }),
    [orders]
  );

  const exportCSV = useCallback(() => {
    const headers = ['Order', 'Supplier', 'Status', 'Date', 'Items', 'Total', 'Paid', 'Due'];
    const rows = filtered.map((o) => [
      o.orderNumber,
      o.supplierName,
      o.status,
      o.orderDate,
      o.itemCount,
      o.totalAmount,
      o.paidAmount,
      o.totalAmount - o.paidAmount,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'purchases.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'purchases.csv');
    });
  }, [filtered]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar
        hint={
          <>
            {fmt(orders.length)} أمر شراء • إجمالي ج.م {fmt(totals.value)} • مدفوع ج.م{' '}
            {fmt(totals.paid)}
            {totals.due > 0 && <span className="text-red-500"> — مستحق ج.م {fmt(totals.due)}</span>}
          </>
        }
      >
        <InvToolButton onClick={() => load()}>
          <RefreshCw size={14} />
          تحديث
        </InvToolButton>
        <InvToolButton onClick={exportCSV}>
          <Download size={14} />
          تصدير CSV
        </InvToolButton>
      </InvToolbar>

      <div className="mt-3">
        <InvControlsCard
          tabs={[
            { id: 'all', label: 'الكل', count: orders.length },
            {
              id: 'unpaid',
              label: 'عليه مستحق',
              count: orders.filter((o) => o.totalAmount - o.paidAmount > 0).length,
            },
            {
              id: 'paid',
              label: 'مسدد بالكامل',
              count: orders.filter((o) => o.totalAmount - o.paidAmount <= 0).length,
            },
          ]}
          activeTab={filterStatus}
          onTabChange={(id) => {
            setFilterStatus(id);
            setCurrentPage(1);
          }}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث برقم الأمر أو المورد…"
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : filtered.length === 0 ? (
          <InvEmpty
            icon={ShoppingCart}
            title="لا توجد مشتريات — ابدأ بإنشاء أمر شراء من تبويب أوامر الشراء"
          />
        ) : (
          <>
            <InvTableCard
              columns={[
                { label: 'الأمر', className: 'col-span-2' },
                { label: 'المورد', className: 'col-span-3' },
                { label: 'التاريخ', className: 'col-span-2' },
                { label: 'القيمة', className: 'col-span-2' },
                { label: 'المدفوع', className: 'col-span-2' },
                { label: 'المتبقي', className: 'col-span-1' },
              ]}
            >
              {paginated.map((o) => {
                const due = o.totalAmount - o.paidAmount;
                return (
                  <InvRow key={o.id}>
                    <div className="col-span-2 min-w-0">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {o.orderNumber}
                      </div>
                    </div>
                    <div className="col-span-3 pr-4 text-slate-600 text-xs sm:text-sm truncate">
                      {o.supplierName}
                    </div>
                    <div className="col-span-2 pr-4 text-slate-600 text-xs sm:text-sm">
                      {new Date(o.orderDate).toLocaleDateString('ar-EG')}
                    </div>
                    <div className="col-span-2 pr-4 font-bold text-slate-900 text-xs sm:text-sm">
                      ج.م {fmt(o.totalAmount)}
                    </div>
                    <div className="col-span-2 pr-4 font-semibold text-emerald-600 text-xs sm:text-sm">
                      ج.م {fmt(o.paidAmount)}
                    </div>
                    <div className="col-span-1 pr-4">
                      <InvStatusPill tone={due > 0 ? 'red' : 'emerald'}>
                        {due > 0 ? `ج.م ${fmt(due)}` : 'مسدد'}
                      </InvStatusPill>
                    </div>
                  </InvRow>
                );
              })}
            </InvTableCard>

            <InvPagination
              page={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              perPage={itemsPerPage}
              onPage={setCurrentPage}
              label="أمر"
            />
          </>
        )}
      </div>
    </div>
  );
}
