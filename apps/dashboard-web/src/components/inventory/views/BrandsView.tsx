'use client';

/**
 * تبويب العلامات التجارية داخل صفحة المنتجات — تُجمَّع من حقل brand في المنتجات.
 * العلامة التجارية وظيفة تابعة لتنظيم المنتجات، مش صفحة مستقلة.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Award, Download, ArrowUpDown, Package, Coins, Tags } from 'lucide-react';
import Link from 'next/link';
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

type BrandRow = {
  id: string;
  name: string;
  productCount: number;
  totalStock: number;
  stockValue: number;
};

export default function BrandsView() {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [sortBy, setSortBy] = useState('productCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadBrands = useCallback(async () => {
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
      const map = new Map<string, BrandRow>();
      list.forEach((p: any) => {
        const brand = String(p?.brand || '').trim();
        if (!brand) return;
        const stock = Number(p.stock ?? p.quantity ?? 0);
        const price = Number(p.price ?? 0);
        const e = map.get(brand) || {
          id: brand,
          name: brand,
          productCount: 0,
          totalStock: 0,
          stockValue: 0,
        };
        e.productCount += 1;
        e.totalStock += stock;
        e.stockValue += stock * price;
        map.set(brand, e);
      });
      setBrands(Array.from(map.values()));
    } catch {
      setBrands([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const filtered = useMemo(() => {
    let result = brands.filter((b) => b.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'name'
          ? a.name
          : sortBy === 'stockValue'
            ? a.stockValue
            : sortBy === 'totalStock'
              ? a.totalStock
              : a.productCount;
      const bVal =
        sortBy === 'name'
          ? b.name
          : sortBy === 'stockValue'
            ? b.stockValue
            : sortBy === 'totalStock'
              ? b.totalStock
              : b.productCount;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return result;
  }, [brands, debouncedSearch, sortBy, sortOrder]);

  const exportCSV = useCallback(() => {
    const headers = ['Brand', 'Products', 'Total Stock', 'Stock Value'];
    const rows = filtered.map((b) => [b.name, b.productCount, b.totalStock, b.stockValue]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'brands.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'brands.csv');
    });
  }, [filtered]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar
        hint={`${brands.length} علامة تجارية • ${filtered.reduce((s, b) => s + b.productCount, 0)} منتج مرتبط`}
      >
        <InvToolButton onClick={exportCSV}>
          <Download size={14} />
          تصدير CSV
        </InvToolButton>
      </InvToolbar>

      <div className="mt-3">
        <InvControlsCard
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="دوّر باسم العلامة التجارية…"
          filters={
            <>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="productCount">عدد المنتجات</option>
                <option value="totalStock">إجمالي الكمية</option>
                <option value="stockValue">قيمة المخزون</option>
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
          <InvEmpty icon={Award} title="لا توجد علامات تجارية — أضف علامة تجارية من بيانات المنتج">
            <Link
              href="/dashboard/inventory/products?tab=products"
              className="text-[12px] font-bold text-teal-600 hover:underline"
            >
              الانتقال إلى المنتجات
            </Link>
          </InvEmpty>
        ) : (
          <InvTableCard
            columns={[
              { label: 'العلامة التجارية', className: 'col-span-4' },
              { label: 'المنتجات', className: 'col-span-2' },
              { label: 'إجمالي الكمية', className: 'col-span-3' },
              { label: 'قيمة المخزون', className: 'col-span-3' },
            ]}
          >
            {filtered.map((b) => (
              <InvRow key={b.id}>
                <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Tags size={16} />
                  </span>
                  <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {b.name}
                  </span>
                </div>
                <div className="col-span-2 pr-4 font-semibold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <Package size={13} className="text-slate-400" />
                  {b.productCount.toLocaleString('en-US')}
                </div>
                <div className="col-span-3 pr-4 font-semibold text-slate-600 text-xs sm:text-sm">
                  {b.totalStock.toLocaleString('en-US')} قطعة
                </div>
                <div className="col-span-3 pr-4 font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <Coins size={13} className="text-emerald-500" />
                  ج.م {b.stockValue.toLocaleString('en-US')}
                </div>
              </InvRow>
            ))}
          </InvTableCard>
        )}
      </div>
    </div>
  );
}
