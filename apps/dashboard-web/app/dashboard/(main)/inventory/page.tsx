'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import {
  Package, Boxes, Coins, AlertTriangle, ArrowDownToLine, Info, RefreshCw,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import Link from 'next/link';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  INV_PAGE_FONT,
  SectionTabs,
  useInvSectionTab,
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvPagination,
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';
import AllItemsView from '@/components/inventory/views/AllItemsView';
import MovementsView from '@/components/inventory/views/MovementsView';
import AlertsView from '@/components/inventory/views/AlertsView';
import DamagedView from '@/components/inventory/views/DamagedView';
import ValuationView from '@/components/inventory/views/ValuationView';

type Product = {
  id: string; name: string; price: number;
  stock?: number; quantity?: number; cost?: number; costPrice?: number;
  category?: string | { name?: string; id?: string };
  imageUrl?: string; image_url?: string;
  updatedAt?: string; updated_at?: string;
  minStock?: number; unit?: string;
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');

const SECTION_TABS = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'items', label: 'كل الأصناف' },
  { id: 'alerts', label: 'تنبيهات النفاد' },
  { id: 'movements', label: 'حركة المخزون' },
  { id: 'damaged', label: 'التالف' },
  { id: 'valuation', label: 'تقييم المخزون' },
];

function InventoryOverview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'all' | 'low' | 'out' | 'recent'>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const stockOf = useCallback((p: Product) => Number(p.stock ?? p.quantity ?? 0), []);
  const costOf = useCallback((p: Product) => Number(p.cost ?? p.costPrice ?? 0) || Number(p.price ?? 0), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setError('لم يتم العثور على المتجر'); setLoading(false); return; }
      const prodRes = await apiRequest(`/products/manage/by-shop/${sid}?limit=500`).catch(() => []);
      const list = Array.isArray(prodRes) ? prodRes : prodRes?.products || prodRes?.data || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل بيانات المخزون');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const totalItems = products.length;
  const totalQuantity = products.reduce((s, p) => s + stockOf(p), 0);
  const stockValue = products.reduce((s, p) => s + costOf(p) * stockOf(p), 0);
  const lowStockProducts = products.filter((p) => stockOf(p) <= Number(p.minStock ?? 5) && stockOf(p) > 0);
  const outOfStock = products.filter((p) => stockOf(p) === 0);

  const catName = (p: Product) => {
    const c = p.category;
    if (!c) return 'غير مصنف';
    return typeof c === 'string' ? c : c?.name || 'غير مصنف';
  };

  const recent = [...products]
    .sort((a, b) => (Date.parse(b.updatedAt || b.updated_at || '') || 0) - (Date.parse(a.updatedAt || a.updated_at || '') || 0))
    .slice(0, 8);

  const TABS = [
    { id: 'all', label: 'كل الأصناف', count: totalItems },
    { id: 'low', label: 'منخفض', count: lowStockProducts.length },
    { id: 'out', label: 'نافد', count: outOfStock.length },
    { id: 'recent', label: 'آخر التحديثات', count: recent.length },
  ] as const;

  const base =
    tab === 'all' ? products : tab === 'low' ? lowStockProducts : tab === 'out' ? outOfStock : recent;

  const visible = base.filter((p) => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || catName(p).toLowerCase().includes(q);
  });

  const paginated = visible.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(visible.length / itemsPerPage);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      {error && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 mb-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[12px] font-bold">
          {error}
          <button onClick={() => setError('')} className="p-1 rounded hover:bg-red-100">✕</button>
        </div>
      )}

      <InvToolbar
        hint={
          <>
            {fmt(totalItems)} صنف • {fmt(totalQuantity)} قطعة • قيمة التكلفة ج.م {fmt(stockValue)}
            {lowStockProducts.length + outOfStock.length > 0 && (
              <span className="text-amber-600">
                {' '}
                — {fmt(lowStockProducts.length + outOfStock.length)} منخفض / نافد
              </span>
            )}
          </>
        }
      >
        <InvToolButton onClick={refresh}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          تحديث
        </InvToolButton>
        <Link
          href="/dashboard/inventory?tab=alerts"
          className="h-9 px-4 rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-colors border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          <AlertTriangle size={14} />
          التنبيهات
        </Link>
      </InvToolbar>

      <div className="mt-3">
        <InvControlsCard
          tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: t.count }))}
          activeTab={tab}
          onTabChange={(id) => {
            setTab(id as typeof tab);
            setCurrentPage(1);
          }}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="دوّر باسم الصنف أو الفئة…"
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : visible.length === 0 ? (
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
                const st = stockOf(p);
                const low = st > 0 && st <= Number(p.minStock ?? 5);
                const out = st === 0;
                const pimg = p.imageUrl || p.image_url;
                return (
                  <InvRow key={p.id}>
                    <Link
                      href={`/dashboard/inventory/products?id=${p.id}`}
                      className="col-span-4 flex items-center gap-2.5 min-w-0 hover:text-teal-600"
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300 shrink-0">
                        {pimg ? <img src={pimg} alt={p.name} className="w-full h-full object-cover" /> : <Package size={14} />}
                      </div>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">{p.name}</span>
                    </Link>
                    <div className="col-span-2 pr-4 text-slate-500 text-xs sm:text-sm truncate">{catName(p)}</div>
                    <div className="col-span-2 pr-4 font-semibold text-slate-900 text-xs sm:text-sm">
                      {fmt(st)}{p.unit ? ` ${p.unit}` : ''}
                    </div>
                    <div className="col-span-2 pr-4 font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1">
                      <Coins size={13} className="text-emerald-400" />
                      ج.م {fmt(costOf(p) * st)}
                    </div>
                    <div className="col-span-2 flex">
                      {out ? (
                        <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">نافد</span>
                      ) : low ? (
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">منخفض</span>
                      ) : (
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">متاح</span>
                      )}
                    </div>
                  </InvRow>
                );
              })}
            </InvTableCard>

            <InvPagination
              page={currentPage}
              totalPages={totalPages}
              total={visible.length}
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

function InventoryPageContent() {
  const [activeTab, setTab] = useInvSectionTab(SECTION_TABS.map(t => t.id), 'overview');

  const subtitle: Record<string, string> = {
    overview: 'نظرة عامة على الأصناف والكميات والقيمة وحالة المخزون في كل المخازن',
    items: 'كل الأصناف وأرصدتها وقيمتها وحالتها — دخول تفاصيل أي صنف بضغطة',
    alerts: 'منخفض المخزون والنافد والقريب من النفاد + حدود التنبيه وإعادة الطلب',
    movements: 'دخول وخروج وتحويل وشراء وتعديل — سجل حركة المخزون',
    damaged: 'تسجيل الأصناف التالفة وخصمها من الرصيد المتاح',
    valuation: 'قيمة المخزون بالتكلفة وسعر البيع والربح المتوقع حسب الفئة',
  };

  return (
    <div className="min-h-full bg-[#F4F5F7] text-slate-900" style={INV_PAGE_FONT}>
      {/* الهيدر */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">المخزون</h1>
              <Info size={15} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle[activeTab]}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/inventory/purchase-orders" className="h-9 px-3 rounded-full text-[11px] font-bold flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-700 transition-all">
              <ArrowDownToLine size={13} />
              دخول / منح
            </Link>
          </div>
        </div>
      </div>

      {/* تبويبات القسم — الوظيفة التابعة = تبويب داخل الصفحة */}
      <SectionTabs tabs={SECTION_TABS} active={activeTab} onChange={setTab} />

      {activeTab === 'overview' && <InventoryOverview />}
      {activeTab === 'items' && <AllItemsView />}
      {activeTab === 'alerts' && <AlertsView />}
      {activeTab === 'movements' && <MovementsView />}
      {activeTab === 'damaged' && <DamagedView />}
      {activeTab === 'valuation' && <ValuationView />}
    </div>
  );
}

export default function InventoryOverviewPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>}>
      <InventoryPageContent />
    </Suspense>
  );
}
