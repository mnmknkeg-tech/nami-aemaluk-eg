'use client';

/**
 * تاب المخزون — مؤشرات حقيقية من /products/manage/by-shop + منتجات تحت
 * الحد الأدنى من /inventory/low-stock/shop/:id. الهيكل العام من الصفحة،
 * فالقسم نفسه بيعرض الكروت والرسوم والجدول بس.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { Boxes, AlertTriangle, PackageX, PackageSearch, Package, Wallet } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import {
  KpiCard,
  ChartCard,
  SectionSkeleton,
  ChartEmpty,
  Donut,
  downloadCSV,
  egp,
} from './financeShared';

type LowStockItem = {
  id: string;
  productName: string;
  category?: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  status: 'critical' | 'warning';
  lastRestockDate?: string;
};

const LOCALE = 'ar-EG-u-nu-latn';
const fmtNum = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 });

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
};

export default function InventorySection({
  refreshKey,
  registerExport,
  searchQuery = '',
}: {
  period: unknown;
  refreshKey: number;
  registerExport: (fn: (() => void) | null) => void;
  searchQuery?: string;
}) {
  const { shop } = useShop();
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const shopId = shop?.id;
      if (!shopId) return;
      setLoading(true);
      setError('');
      const [lowRes, prodRes] = await Promise.allSettled([
        apiRequest(`/inventory/low-stock/shop/${shopId}`),
        apiRequest(`/products/manage/by-shop/${shopId}?limit=200`),
      ]);
      if (!alive) return;
      const lowList =
        lowRes.status === 'fulfilled'
          ? Array.isArray(lowRes.value)
            ? lowRes.value
            : lowRes.value?.data || []
          : [];
      const prodList =
        prodRes.status === 'fulfilled'
          ? Array.isArray(prodRes.value)
            ? prodRes.value
            : prodRes.value?.data || []
          : [];
      setItems(lowList);
      setProducts(prodList);
      if (lowRes.status === 'rejected' && prodRes.status === 'rejected') {
        setError('تعذر تحميل بيانات المخزون');
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [shop?.id]);

  const stockValue = useMemo(
    () =>
      products.reduce(
        (s, p) =>
          s + Number(p.cost ?? p.costPrice ?? p.price ?? 0) * Number(p.stock ?? p.quantity ?? 0),
        0
      ),
    [products]
  );
  const lowStock = useMemo(
    () =>
      products.filter(
        (p) => Number(p.stock ?? 0) > 0 && Number(p.stock ?? 0) <= Number(p.minStock ?? 5)
      ).length,
    [products]
  );
  const outStock = useMemo(
    () => products.filter((p) => Number(p.stock ?? 0) === 0).length,
    [products]
  );
  const critical = items.filter((it) => it.status === 'critical').length;

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items.filter(
      (it) =>
        (it.productName || '').toLowerCase().includes(q) ||
        (it.category || '').toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  /** توزيع حالة المخزون — من بيانات المنتجات الحقيقية */
  const stockDonut = useMemo(() => {
    const ok = products.filter((p) => Number(p.stock ?? 0) > Number(p.minStock ?? 5)).length;
    const low = lowStock;
    const out = outStock;
    const data = [
      { name: 'مخزون سليم', value: ok },
      { name: 'منخفض', value: low },
      { name: 'نافد', value: out },
    ].filter((d) => d.value > 0);
    return data;
  }, [products, lowStock, outStock]);

  useEffect(() => {
    if (loading || items.length === 0) {
      registerExport(null);
      return;
    }
    registerExport(() =>
      downloadCSV(
        'inventory-low-stock.csv',
        [
          'Product',
          'Category',
          'Current Stock',
          'Min Stock',
          'Reorder Point',
          'Last Restock',
          'Status',
        ],
        filtered.map((it) => [
          it.productName || '—',
          it.category || '—',
          it.currentStock,
          it.minStock,
          it.reorderPoint,
          it.lastRestockDate || '-',
          it.status === 'critical' ? 'critical' : 'warning',
        ])
      )
    );
    return () => registerExport(null);
  }, [filtered, loading, registerExport]);

  if (loading) return <SectionSkeleton />;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Boxes}
          label="إجمالي المنتجات"
          value={fmtNum(products.length)}
          sub={`بقيمة مخزون ${egp(stockValue)}`}
        />
        <KpiCard
          icon={PackageX}
          label="تحت الحد الأدنى"
          value={fmtNum(lowStock)}
          valueClass="text-amber-600"
        />
        <KpiCard
          icon={AlertTriangle}
          label="خطر النفاد"
          value={fmtNum(critical)}
          valueClass="text-red-600"
        />
        <KpiCard
          icon={Wallet}
          label="نافد من المخزون"
          value={fmtNum(outStock)}
          valueClass="text-slate-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* توزيع حالة المخزون */}
        <ChartCard title="توزيع حالة المخزون" sub={`${fmtNum(products.length)} منتج`}>
          {stockDonut.length > 0 ? (
            <Donut data={stockDonut} centerValue={fmtNum(products.length)} centerLabel="منتج" />
          ) : (
            <ChartEmpty />
          )}
        </ChartCard>

        {/* جدول المنتجات تحت الحد الأدنى */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden self-start">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <PackageSearch size={15} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">منتجات تحتاج إعادة تعبئة</h3>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded px-2 py-0.5 tabular-nums mr-auto">
              {fmtNum(filtered.length)}
            </span>
          </div>
          {items.length === 0 ? (
            <div className="py-14 text-center">
              <Package size={26} className="mx-auto mb-2 text-emerald-300" />
              <p className="text-sm font-bold text-emerald-700">المخزون في حالة جيدة ✓</p>
              <p className="text-xs text-slate-400 mt-1">
                مفيش منتجات تحت الحد الأدنى حاليًا — هننبّهك أول ما حاجة تقرب تخلص
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400 font-semibold">
              لا نتائج مطابقة للبحث
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[720px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">المنتج</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">الفئة</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">المتاح</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">حد الأدنى</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">نقطة الطلب</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">آخر توريد</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => {
                    const isCritical = it.status === 'critical';
                    return (
                      <tr
                        key={it.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs font-bold text-slate-800 max-w-[200px] truncate">
                          {it.productName || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{it.category || '—'}</td>
                        <td
                          className={`px-4 py-3 text-xs font-extrabold tabular-nums ${isCritical ? 'text-red-600' : 'text-amber-600'}`}
                        >
                          {fmtNum(it.currentStock)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                          {fmtNum(it.minStock)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                          {fmtNum(it.reorderPoint)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {fmtDate(it.lastRestockDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${isCritical ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                          >
                            {isCritical ? 'خطر' : 'تحذير'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
