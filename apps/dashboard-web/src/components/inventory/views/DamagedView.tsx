'use client';

/**
 * تبويب التالف داخل صفحة المخزون — تسجيل الأصناف التالفة يخصمها من الرصيد المتاح.
 * ملاحظة: سجل التالف التفصيلي يحتاج دعمًا من الـAPI (حقل damagedQty لكل منتج).
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, PackageX, AlertTriangle, Download } from 'lucide-react';
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

type Product = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  category: string;
};

export default function DamagedView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterStock, setFilterStock] = useState('all');
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
      const data = await apiRequest(`/products/manage/by-shop/${sid}?limit=500`);
      const list = Array.isArray(data) ? data : data?.products || data?.data || [];
      setProducts(
        list.map((p: any) => ({
          id: String(p.id),
          name: p.name || p.title || '---',
          sku: p.sku || '---',
          stock: Number(p.stock ?? p.quantity ?? 0),
          price: Number(p.price ?? 0),
          category: p.category?.name || p.categoryName || 'غير مصنف',
        }))
      );
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = products.filter(
      (p) =>
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    if (filterStock === 'in') result = result.filter((p) => p.stock > 0);
    return result;
  }, [products, debouncedSearch, filterStock]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const exportCSV = useCallback(() => {
    const headers = ['Product', 'SKU', 'Category', 'Stock', 'Price'];
    const rows = filtered.map((p) => [p.name, p.sku, p.category, p.stock, p.price]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: 'damaged-stock.csv', headers, rows: [...rows] },
        'csv'
      );
      downloadBlob(blob, 'damaged-stock.csv');
    });
  }, [filtered]);

  const registerDamage = useCallback(async (p: Product) => {
    if (p.stock <= 0) {
      alert('لا يوجد رصيد لهذا الصنف');
      return;
    }
    const input = prompt(`كمية التالف من "${p.name}" (الرصيد الحالي: ${p.stock})`, '1');
    const qty = Number(input);
    if (!input || !Number.isFinite(qty) || qty <= 0) return;
    if (qty > p.stock) {
      alert('الكمية أكبر من الرصيد المتاح');
      return;
    }
    if (!confirm(`سيخصم ${qty} قطعة من رصيد "${p.name}" كتالف. متابعة؟`)) return;
    try {
      await apiRequest(`/products/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock: p.stock - qty }),
      });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, stock: x.stock - qty } : x)));
    } catch (err: any) {
      alert(err?.message || 'فشل تسجيل التالف');
    }
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar hint="تسجيل صنف تالف يخصمه فورًا من الرصيد المتاح">
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
            { id: 'all', label: 'كل الأصناف', count: products.length },
            { id: 'in', label: 'لديه رصيد', count: products.filter((p) => p.stock > 0).length },
          ]}
          activeTab={filterStock}
          onTabChange={(id) => {
            setFilterStock(id);
            setCurrentPage(1);
          }}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث بالاسم أو SKU…"
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : filtered.length === 0 ? (
          <InvEmpty icon={PackageX} title="لا توجد أصناف" />
        ) : (
          <>
            <InvTableCard
              columns={[
                { label: 'الصنف', className: 'col-span-4' },
                { label: 'الفئة', className: 'col-span-2' },
                { label: 'الرصيد المتاح', className: 'col-span-2' },
                { label: 'الحالة', className: 'col-span-2' },
                { label: 'إجراءات', className: 'col-span-2' },
              ]}
            >
              {paginated.map((p) => (
                <InvRow key={p.id} muted={p.stock === 0}>
                  <div className="col-span-4 min-w-0">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {p.name}
                    </div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                      {p.sku}
                    </div>
                  </div>
                  <div className="col-span-2 pr-4 text-slate-600 text-xs sm:text-sm truncate">
                    {p.category}
                  </div>
                  <div className="col-span-2 pr-4 font-bold text-slate-900 text-xs sm:text-sm">
                    {p.stock.toLocaleString('en-US')}
                  </div>
                  <div className="col-span-2">
                    <InvStatusPill tone={p.stock > 0 ? 'emerald' : 'slate'}>
                      {p.stock > 0 ? 'متاح للتسجيل' : 'بدون رصيد'}
                    </InvStatusPill>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => registerDamage(p)}
                      disabled={p.stock === 0}
                      title="تسجيل كمية تالفة"
                      className="h-8 px-3 rounded-full text-[11px] font-bold flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50"
                    >
                      <AlertTriangle size={13} />
                      تسجيل تالف
                    </button>
                  </div>
                </InvRow>
              ))}
            </InvTableCard>

            <InvPagination
              page={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              perPage={itemsPerPage}
              onPage={setCurrentPage}
              label="صنف"
            />
          </>
        )}
      </div>
    </div>
  );
}
