'use client';

/**
 * تبويب كل الأصناف داخل صفحة المخزون — قائمة كاملة بالأصناف وأرصدتها وقيمتها وحالتها.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, RefreshCw, Download, ArrowUpDown, Boxes, Coins, Link } from 'lucide-react';
import LinkDefault from 'next/link';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvPagination,
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  cost: number;
  category: string;
  unit?: string;
  imageUrl?: string;
  minStock: number;
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');

export default function AllItemsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [rows, setRows] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const raw = await apiRequest(`/products/manage/by-shop/${sid}?limit=500`);
      const list = Array.isArray(raw) ? raw : raw?.products || raw?.data || [];
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const products2 = useMemo(
    () =>
      rows.map((p: any): Product => {
        const stock = Number(p.stock ?? p.quantity ?? 0);
        const price = Number(p.price ?? 0);
        return {
          id: String(p.id),
          name: p.name || p.title || '---',
          price,
          stock,
          cost: Number(p.cost ?? p.costPrice ?? 0) || price,
          category:
            p.category?.name || (typeof p.category === 'string' ? p.category : '') || 'غير مصنف',
          unit: p.unit,
          imageUrl: p.imageUrl || p.image_url || '',
          minStock: Number(p.minStock ?? 5),
        };
      }),
    [rows]
  );

  const filtered = useMemo(() => {
    let result = products2.filter(
      (p) =>
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    if (filterStatus === 'low') result = result.filter((p) => p.stock > 0 && p.stock <= p.minStock);
    else if (filterStatus === 'out') result = result.filter((p) => p.stock === 0);
    else if (filterStatus === 'in') result = result.filter((p) => p.stock > p.minStock);
    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name, 'ar');
      else if (sortBy === 'stock') cmp = a.stock - b.stock;
      else if (sortBy === 'value') cmp = a.cost * a.stock - b.cost * b.stock;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [products2, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const exportCSV = useCallback(() => {
    const headers = ['Product', 'Category', 'Stock', 'Unit', 'Cost', 'Price', 'Stock Value'];
    const body = filtered.map((p) => [
      p.name,
      p.category,
      p.stock,
      p.unit || '',
      p.cost,
      p.price,
      p.cost * p.stock,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: 'inventory-items.csv', headers, rows: [...body] },
        'csv'
      );
      downloadBlob(blob, 'inventory-items.csv');
    });
  }, [filtered]);

  const countLow = products2.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const countOut = products2.filter((p) => p.stock === 0).length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar
        hint={`${products2.length} صنف • قيمة إجمالية ج.م ${fmt(products2.reduce((s, p) => s + p.cost * p.stock, 0))}`}
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
            { id: 'all', label: 'الكل', count: products2.length },
            { id: 'in', label: 'متاح', count: products2.length - countLow - countOut },
            { id: 'low', label: 'منخفض', count: countLow },
            { id: 'out', label: 'نافد', count: countOut },
          ]}
          activeTab={filterStatus}
          onTabChange={(id) => {
            setFilterStatus(id);
            setCurrentPage(1);
          }}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="دوّر باسم الصنف أو الفئة…"
          filters={
            <>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="newest">الترتيب الافتراضي</option>
                <option value="name">الاسم</option>
                <option value="stock">الكمية</option>
                <option value="value">القيمة</option>
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
          <InvEmpty icon={Boxes} title="لا توجد أصناف في هذا القسم" />
        ) : (
          <>
            <InvTableCard
              columns={[
                { label: 'الصنف', className: 'col-span-4' },
                { label: 'الفئة', className: 'col-span-2' },
                { label: 'الكمية', className: 'col-span-2' },
                { label: 'قيمة المخزون', className: 'col-span-2' },
                { label: 'الحالة', className: 'col-span-2' },
              ]}
            >
              {paginated.map((p) => {
                const low = p.stock > 0 && p.stock <= p.minStock;
                const out = p.stock === 0;
                return (
                  <InvRow key={p.id} onClick={() => undefined}>
                    <LinkDefault
                      href={`/dashboard/inventory/products?id=${p.id}`}
                      className="col-span-4 flex items-center gap-2.5 min-w-0 hover:text-teal-600"
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300 shrink-0">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package size={14} />
                        )}
                      </div>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {p.name}
                      </span>
                    </LinkDefault>
                    <div className="col-span-2 pr-4 text-slate-500 text-xs sm:text-sm truncate">
                      {p.category}
                    </div>
                    <div className="col-span-2 pr-4 font-semibold text-slate-900 text-xs sm:text-sm">
                      {fmt(p.stock)}
                      {p.unit ? ` ${p.unit}` : ''}
                    </div>
                    <div className="col-span-2 pr-4 font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1">
                      <Coins size={13} className="text-emerald-400" />
                      ج.م {fmt(p.cost * p.stock)}
                    </div>
                    <div className="col-span-2 flex">
                      {out ? (
                        <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          نافد
                        </span>
                      ) : low ? (
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          منخفض
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          متاح
                        </span>
                      )}
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
              label="صنف"
            />
          </>
        )}
      </div>
    </div>
  );
}
