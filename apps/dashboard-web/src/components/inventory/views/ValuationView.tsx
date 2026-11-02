'use client';

/**
 * تبويب تقييم المخزون داخل صفحة المخزون — قيمة المخزون بالتكلفة وسعر البيع والربح المتوقع
 * موزعة على الفئات. التكلفة تدخل لاحقًا في تكلفة المبيعات والقوائم المالية.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calculator, RefreshCw, Download, TrendingUp, Package } from 'lucide-react';
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

type ValuationRow = {
  category: string;
  itemCount: number;
  totalQty: number;
  costValue: number;
  retailValue: number;
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');

export default function ValuationView() {
  const [rows, setRows] = useState<ValuationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [sortBy, setSortBy] = useState('costValue');
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
      const data = await apiRequest(`/products/manage/by-shop/${sid}?limit=500`);
      const list = Array.isArray(data) ? data : data?.products || data?.data || [];
      const map = new Map<string, ValuationRow>();
      list.forEach((p: any) => {
        const cat = p.category?.name || p.categoryName || 'غير مصنف';
        const qty = Number(p.stock ?? p.quantity ?? 0);
        const cost = Number(p.cost ?? p.costPrice ?? 0) || Number(p.price ?? 0);
        const retail = Number(p.price ?? 0);
        const e = map.get(cat) || {
          category: cat,
          itemCount: 0,
          totalQty: 0,
          costValue: 0,
          retailValue: 0,
        };
        e.itemCount += 1;
        e.totalQty += qty;
        e.costValue += cost * qty;
        e.retailValue += retail * qty;
        map.set(cat, e);
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
    let result = rows.filter((r) => r.category.includes(debouncedSearch));
    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'category'
          ? a.category
          : sortBy === 'totalQty'
            ? a.totalQty
            : sortBy === 'retailValue'
              ? a.retailValue
              : a.costValue;
      const bVal =
        sortBy === 'category'
          ? b.category
          : sortBy === 'totalQty'
            ? b.totalQty
            : sortBy === 'retailValue'
              ? b.retailValue
              : b.costValue;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return result;
  }, [rows, debouncedSearch, sortBy, sortOrder]);

  const totals = useMemo(
    () => ({
      itemCount: rows.reduce((s, r) => s + r.itemCount, 0),
      totalQty: rows.reduce((s, r) => s + r.totalQty, 0),
      costValue: rows.reduce((s, r) => s + r.costValue, 0),
      retailValue: rows.reduce((s, r) => s + r.retailValue, 0),
    }),
    [rows]
  );

  const expectedProfit = totals.retailValue - totals.costValue;

  const exportCSV = useCallback(() => {
    const headers = ['Category', 'Items', 'Qty', 'Cost Value', 'Retail Value', 'Expected Profit'];
    const body = filtered.map((r) => [
      r.category,
      r.itemCount,
      r.totalQty,
      Math.round(r.costValue),
      Math.round(r.retailValue),
      Math.round(r.retailValue - r.costValue),
    ]);
    const totalRow = [
      'الإجمالي',
      totals.itemCount,
      totals.totalQty,
      Math.round(totals.costValue),
      Math.round(totals.retailValue),
      Math.round(expectedProfit),
    ];
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: 'inventory-valuation.csv', headers, rows: [...body, totalRow] },
        'csv'
      );
      downloadBlob(blob, 'inventory-valuation.csv');
    });
  }, [filtered, totals, expectedProfit]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar
        hint={
          <>
            {fmt(rows.length)} فئة • {fmt(totals.itemCount)} صنف • {fmt(totals.totalQty)} قطعة —
            بالتكلفة ج.م {fmt(totals.costValue)} • بسعر البيع ج.م {fmt(totals.retailValue)} •{' '}
            <span className="text-emerald-600">ربح متوقع ج.م {fmt(expectedProfit)}</span>
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
          searchPlaceholder="دوّر باسم الفئة…"
          filters={
            <>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="costValue">قيمة التكلفة</option>
                <option value="retailValue">قيمة البيع</option>
                <option value="totalQty">الكمية</option>
                <option value="category">الفئة</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
              >
                <TrendingUp size={15} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
              </button>
            </>
          }
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : filtered.length === 0 ? (
          <InvEmpty icon={Calculator} title="لا توجد بيانات لتقييم المخزون" />
        ) : (
          <InvTableCard
            columns={[
              { label: 'الفئة', className: 'col-span-3' },
              { label: 'الأصناف', className: 'col-span-2' },
              { label: 'الكمية', className: 'col-span-2' },
              { label: 'قيمة التكلفة', className: 'col-span-2' },
              { label: 'قيمة البيع', className: 'col-span-2' },
              { label: 'الربح المتوقع', className: 'col-span-1' },
            ]}
          >
            {filtered.map((r) => (
              <InvRow key={r.category}>
                <div className="col-span-3 min-w-0">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate flex items-center gap-1.5">
                    <Package size={13} className="text-slate-300" />
                    {r.category}
                  </div>
                </div>
                <div className="col-span-2 pr-4 font-semibold text-slate-600 text-xs sm:text-sm">
                  {fmt(r.itemCount)}
                </div>
                <div className="col-span-2 pr-4 font-semibold text-slate-600 text-xs sm:text-sm">
                  {fmt(r.totalQty)}
                </div>
                <div className="col-span-2 pr-4 font-bold text-slate-900 text-xs sm:text-sm">
                  ج.م {fmt(r.costValue)}
                </div>
                <div className="col-span-2 pr-4 font-bold text-sky-600 text-xs sm:text-sm">
                  ج.م {fmt(r.retailValue)}
                </div>
                <div className="col-span-1 pr-4 font-bold text-emerald-600 text-xs sm:text-sm">
                  ج.م {fmt(r.retailValue - r.costValue)}
                </div>
              </InvRow>
            ))}
            <div className="grid grid-cols-12 px-4 py-3 items-center bg-slate-50 border-t-2 border-slate-200">
              <div className="col-span-3 text-right text-xs font-black text-slate-900">
                الإجمالي
              </div>
              <div className="col-span-2 pr-4 text-right text-xs font-black text-slate-900">
                {fmt(totals.itemCount)}
              </div>
              <div className="col-span-2 pr-4 text-right text-xs font-black text-slate-900">
                {fmt(totals.totalQty)}
              </div>
              <div className="col-span-2 pr-4 text-right text-xs font-black text-slate-900">
                ج.م {fmt(totals.costValue)}
              </div>
              <div className="col-span-2 pr-4 text-right text-xs font-black text-sky-700">
                ج.م {fmt(totals.retailValue)}
              </div>
              <div className="col-span-1 pr-4 text-right text-xs font-black text-emerald-700">
                ج.م {fmt(expectedProfit)}
              </div>
            </div>
          </InvTableCard>
        )}
      </div>
    </div>
  );
}
