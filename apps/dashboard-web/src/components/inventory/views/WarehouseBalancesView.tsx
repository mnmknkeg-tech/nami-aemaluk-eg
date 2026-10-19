'use client';

/**
 * تبويب أرصدة كل مخزن داخل صفحة المخازن — الأصناف الموجودة والكميات والقيمة لكل مخزن.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Warehouse, RefreshCw, Download, ArrowUpDown } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type WarehouseBalance = {
  id: string;
  name: string;
  nameAr: string;
  location: string;
  productCount: number;
  stock: number;
  stockValue: number;
  capacity: number;
  status: string;
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');

export default function WarehouseBalancesView() {
  const [balances, setBalances] = useState<WarehouseBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [sortBy, setSortBy] = useState('stock');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/warehouses/shop/${sid}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      setBalances(
        data.map((w: any) => ({
          id: String(w.id),
          name: w.name || '---',
          nameAr: w.nameAr || w.name_ar || '---',
          location: w.location || w.address || '---',
          productCount: Number(w.productCount || w.products_count || 0),
          stock: Number(w.stock ?? w.used ?? w.currentStock ?? 0),
          stockValue: Number(w.stockValue || w.stock_value || 0),
          capacity: Number(w.capacity || 0),
          status: w.status || 'active',
        }))
      );
    } catch {
      setBalances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = balances.filter(
      (b) =>
        b.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        b.nameAr.includes(debouncedSearch) ||
        b.location.includes(debouncedSearch)
    );
    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'name' ? a.name : sortBy === 'productCount' ? a.productCount : a.stock;
      const bVal =
        sortBy === 'name' ? b.name : sortBy === 'productCount' ? b.productCount : b.stock;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return result;
  }, [balances, debouncedSearch, sortBy, sortOrder]);

  const totals = useMemo(
    () => ({
      stock: balances.reduce((s, b) => s + b.stock, 0),
      productCount: balances.reduce((s, b) => s + b.productCount, 0),
      stockValue: balances.reduce((s, b) => s + b.stockValue, 0),
    }),
    [balances]
  );

  const exportCSV = useCallback(() => {
    const headers = ['Warehouse', 'Location', 'Products', 'Stock', 'Stock Value', 'Capacity'];
    const rows = filtered.map((b) => [
      b.name,
      b.location,
      b.productCount,
      b.stock,
      b.stockValue,
      b.capacity,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: 'warehouse-balances.csv', headers, rows: [...rows] },
        'csv'
      );
      downloadBlob(blob, 'warehouse-balances.csv');
    });
  }, [filtered]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar
        hint={
          <>
            {fmt(balances.length)} مخزن • {fmt(totals.productCount)} صنف مخزن • {fmt(totals.stock)}{' '}
            قطعة — قيمة المخزون ج.م {fmt(totals.stockValue)}
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
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث بالمخزن أو الموقع…"
          filters={
            <>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="stock">الرصيد</option>
                <option value="productCount">عدد الأصناف</option>
                <option value="name">الاسم</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
              >
                <ArrowUpDown size={15} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
              </button>
            </>
          }
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : filtered.length === 0 ? (
          <InvEmpty icon={Warehouse} title="لا توجد مخازن بعد" />
        ) : (
          <InvTableCard
            columns={[
              { label: 'المخزن', className: 'col-span-3' },
              { label: 'الموقع', className: 'col-span-2' },
              { label: 'الأصناف', className: 'col-span-2' },
              { label: 'الرصيد', className: 'col-span-2' },
              { label: 'قيمة المخزون', className: 'col-span-2' },
              { label: 'الاستغلال', className: 'col-span-1' },
            ]}
          >
            {filtered.map((b) => {
              const usagePct = b.capacity > 0 ? (b.stock / b.capacity) * 100 : 0;
              return (
                <InvRow key={b.id}>
                  <div className="col-span-3 min-w-0">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {b.name}
                    </div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                      {b.nameAr}
                    </div>
                  </div>
                  <div className="col-span-2 pr-4 text-slate-600 text-xs sm:text-sm truncate">
                    {b.location}
                  </div>
                  <div className="col-span-2 pr-4 font-semibold text-slate-600 text-xs sm:text-sm">
                    {fmt(b.productCount)}
                  </div>
                  <div className="col-span-2 pr-4 font-bold text-slate-900 text-xs sm:text-sm">
                    {fmt(b.stock)} قطعة
                  </div>
                  <div className="col-span-2 pr-4 font-bold text-emerald-600 text-xs sm:text-sm">
                    ج.م {fmt(b.stockValue)}
                  </div>
                  <div className="col-span-1 pr-4">
                    <div className="font-bold text-slate-700 text-xs">
                      {b.capacity > 0 ? `${Math.round(usagePct)}%` : '—'}
                    </div>
                    {b.capacity > 0 && (
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${usagePct > 90 ? 'bg-red-500' : usagePct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(usagePct, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </InvRow>
              );
            })}
          </InvTableCard>
        )}
      </div>
    </div>
  );
}
