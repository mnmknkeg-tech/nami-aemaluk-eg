'use client';

/**
 * تبويب الباركود والطباعة داخل صفحة المنتجات — الباركود وظيفة تابعة للمنتج، مش صفحة مستقلة.
 * المحتوى المنقول من app/dashboard/(main)/inventory/barcode/page.tsx
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScanBarcode, Download, Printer, RefreshCw, Check } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvStatusPill,
  InvBulkBar,
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type Product = {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  stock?: number;
  imageUrl?: string;
};

function generateBarcodeValue(id: string, sku?: string): string {
  if (sku && sku.length >= 6) return sku;
  const num = id.replace(/\D/g, '').padEnd(12, '0').slice(0, 12);
  return num || '000000000000';
}

function BarcodeVisual({ value }: { value: string }) {
  const bars = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      arr.push((charCode % 3) + 1);
      arr.push((charCode % 2) + 1);
    }
    return arr;
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-end h-16 gap-[1px] bg-white px-2 py-1 rounded">
        {bars.map((w, i) => (
          <div
            key={i}
            style={{ width: `${w}px`, height: '100%' }}
            className={i % 2 === 0 ? 'bg-black' : 'bg-white'}
          />
        ))}
      </div>
      <div className="text-[10px] font-mono tracking-widest text-slate-700">{value}</div>
    </div>
  );
}

export default function BarcodeView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [barcodeFormat, setBarcodeFormat] = useState('EAN-13');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const data = await apiRequest(`/products/manage/by-shop/${sid}?limit=200`);
      const list = Array.isArray(data) ? data : data?.products || data?.data || [];
      setProducts(
        list.map((p: any) => ({
          id: String(p.id),
          name: p.name || p.title || '---',
          sku: p.sku || '',
          barcode: p.barcode || p.sku || '',
          price: Number(p.price ?? 0),
          stock: Number(p.stock ?? p.quantity ?? 0),
          imageUrl: p.imageUrl || p.image_url || '',
        }))
      );
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filtered = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (p.sku || '').includes(debouncedSearch) ||
        (p.barcode || '').includes(debouncedSearch)
    );
  }, [products, debouncedSearch]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  }, [filtered, selectedIds.size]);

  const selectedProducts = useMemo(
    () => filtered.filter((p) => selectedIds.has(p.id)),
    [filtered, selectedIds]
  );

  const handlePrint = useCallback(() => {
    if (selectedProducts.length === 0) {
      alert('يرجى اختيار منتجات على الأقل');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    const barcodeHTML = selectedProducts
      .map((p) => {
        const val = generateBarcodeValue(p.id, p.sku || p.barcode);
        const bars: string[] = [];
        for (let i = 0; i < val.length; i++) {
          const charCode = val.charCodeAt(i);
          const w1 = (charCode % 3) + 1;
          const w2 = (charCode % 2) + 1;
          bars.push(`<div style="width:${w1}px;height:60px;background:#000"></div>`);
          bars.push(`<div style="width:${w2}px;height:60px;background:#fff"></div>`);
        }
        return `
        <div style="display:inline-block;text-align:center;margin:10px;padding:10px;border:1px solid #ccc;border-radius:8px;">
          <div style="font-size:12px;font-weight:bold;margin-bottom:4px;">${p.name}</div>
          <div style="display:flex;align-items:flex-end;height:60px;gap:1px;">${bars.join('')}</div>
          <div style="font-size:10px;font-family:monospace;letter-spacing:2px;margin-top:4px;">${val}</div>
          <div style="font-size:10px;color:#666;margin-top:2px;">${p.price} ج.م</div>
        </div>`;
      })
      .join('');
    printWindow.document.write(`
      <html><head><title>طباعة الباركود</title></head>
      <body style="font-family:Arial,sans-serif;">
        <h2 style="text-align:center;">باركود المنتجات</h2>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;">${barcodeHTML}</div>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  }, [selectedProducts]);

  const handleDownload = useCallback(() => {
    if (selectedProducts.length === 0) {
      alert('يرجى اختيار منتجات على الأقل');
      return;
    }
    const headers = ['Product Name', 'SKU', 'Barcode', 'Price'];
    const rows = selectedProducts.map((p) => [
      p.name,
      p.sku || '---',
      generateBarcodeValue(p.id, p.sku || p.barcode),
      p.price,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'barcodes.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'barcodes.csv');
    });
  }, [selectedProducts]);

  const withBarcode = products.filter((p) => p.barcode || p.sku).length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar
        hint={`${products.length} منتج • ${withBarcode} لديها باركود • ${products.length - withBarcode} بدون باركود • ${selectedIds.size} محدد`}
      >
        <InvToolButton onClick={() => loadProducts()}>
          <RefreshCw size={14} />
          تحديث
        </InvToolButton>
        <InvToolButton primary onClick={handlePrint}>
          <Printer size={14} />
          طباعة الباركود
        </InvToolButton>
      </InvToolbar>

      <div className="mt-3">
        <InvControlsCard
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث بالاسم أو SKU أو الباركود..."
          filters={
            <select
              value={barcodeFormat}
              onChange={(e) => setBarcodeFormat(e.target.value)}
              className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
            >
              <option value="EAN-13">EAN-13</option>
              <option value="UPC-A">UPC-A</option>
              <option value="Code128">Code128</option>
            </select>
          }
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="mt-3">
          <InvBulkBar>
            <span>{selectedIds.size} منتج محدد</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-bold flex items-center gap-1.5"
              >
                <Printer size={13} />
                طباعة الباركود
              </button>
              <button
                onClick={handleDownload}
                className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-bold flex items-center gap-1.5"
              >
                <Download size={13} />
                تصدير CSV
              </button>
            </div>
          </InvBulkBar>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : filtered.length === 0 ? (
          <InvEmpty icon={ScanBarcode} title="لا توجد منتجات حالياً" />
        ) : (
          <InvTableCard
            headerExtra={
              <div className="col-span-1 flex items-center">
                <button onClick={toggleSelectAll} className="p-1" title="تحديد الكل">
                  {selectedIds.size === filtered.length && filtered.length > 0 ? (
                    <Check size={16} className="text-[#00E5FF]" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                  )}
                </button>
              </div>
            }
            columns={[
              { label: 'المنتج', className: 'col-span-3' },
              { label: 'الباركود', className: 'col-span-4' },
              { label: 'السعر', className: 'col-span-1' },
              { label: 'المخزون', className: 'col-span-1' },
              { label: 'الحالة', className: 'col-span-2' },
            ]}
          >
            {filtered.map((p) => {
              const barcodeVal = generateBarcodeValue(p.id, p.sku || p.barcode);
              const isSelected = selectedIds.has(p.id);
              const hasBarcode = Boolean(p.barcode || p.sku);
              return (
                <InvRow key={p.id} onClick={() => toggleSelect(p.id)}>
                  <div className="col-span-1 flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(p.id);
                      }}
                      className="p-1"
                    >
                      {isSelected ? (
                        <Check size={16} className="text-[#00E5FF]" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                      )}
                    </button>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {p.name}
                    </div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                      {p.sku || 'بدون SKU'}
                    </div>
                  </div>
                  <div className="col-span-4 flex justify-center">
                    <BarcodeVisual value={barcodeVal} />
                  </div>
                  <div className="col-span-1 pr-4 font-bold text-slate-900 text-xs sm:text-sm">
                    {p.price} ج.م
                  </div>
                  <div className="col-span-1 pr-4 text-slate-600 text-xs sm:text-sm">
                    مخزون: {p.stock ?? 0}
                  </div>
                  <div className="col-span-2">
                    <InvStatusPill tone={hasBarcode ? 'emerald' : 'amber'}>
                      {hasBarcode ? 'لديها باركود' : 'بدون باركود'}
                    </InvStatusPill>
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
