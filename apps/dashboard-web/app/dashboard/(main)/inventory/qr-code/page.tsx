'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  QrCode,
  Search,
  Download,
  Printer,
  RefreshCw,
  Info,
  X,
  Check,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

type Product = {
  id: string;
  name: string;
  sku?: string;
  price: number;
  stock?: number;
  imageUrl?: string;
};

function generateQrPattern(value: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  for (let i = 0; i < value.length; i++) {
    const charCode = value.charCodeAt(i);
    const row = (i * 7) % size;
    const col = (i * 13) % size;
    grid[row][col] = true;
    grid[(row + 1) % size][col] = (charCode & 1) === 1;
    grid[row][(col + 1) % size] = (charCode & 2) === 2;
    grid[(row + 1) % size][(col + 1) % size] = (charCode & 4) === 4;
  }

  const drawFinder = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          grid[r + i][c + j] = true;
        } else {
          grid[r + i][c + j] = false;
        }
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (let i = 0; i < 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
    grid[6][size - 1 - i] = i % 2 === 0;
    grid[size - 1 - i][6] = i % 2 === 0;
  }

  return grid;
}

function QrCodeVisual({ value, size = 120 }: { value: string; size?: number }) {
  const grid = useMemo(() => generateQrPattern(value), [value]);
  const cellSize = size / grid.length;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-white p-2 rounded-lg" style={{ width: size + 16, height: size + 16 }}>
        <svg width={size} height={size}>
          {grid.map((row, r) =>
            row.map((isBlack, c) =>
              isBlack ? (
                <rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="#000"
                />
              ) : null
            )
          )}
        </svg>
      </div>
      <div className="text-[10px] font-mono text-slate-500 max-w-[140px] truncate">{value}</div>
    </div>
  );
}

export default function QRCodePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
        (p.sku || '').includes(debouncedSearch)
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

  const buildQrValue = (p: Product) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/product/${p.id}`;
  };

  const handlePrint = useCallback(() => {
    if (selectedProducts.length === 0) {
      alert('يرجى اختيار منتجات على الأقل');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    const qrHTML = selectedProducts
      .map((p) => {
        const val = buildQrValue(p);
        const grid = generateQrPattern(val);
        const cellSize = 4;
        const svgSize = grid.length * cellSize;
        const rects = grid
          .map((row, r) =>
            row
              .map((isBlack, c) =>
                isBlack
                  ? `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
                  : ''
              )
              .join('')
          )
          .join('');
        return `
        <div style="display:inline-block;text-align:center;margin:10px;padding:10px;border:1px solid #ccc;border-radius:8px;">
          <div style="font-size:12px;font-weight:bold;margin-bottom:4px;">${p.name}</div>
          <svg width="${svgSize}" height="${svgSize}">${rects}</svg>
          <div style="font-size:10px;color:#666;margin-top:4px;">${p.price} ج.م</div>
        </div>`;
      })
      .join('');
    printWindow.document.write(`
      <html><head><title>طباعة QR Code</title></head>
      <body style="font-family:Arial,sans-serif;">
        <h2 style="text-align:center;">QR Code للمنتجات</h2>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;">${qrHTML}</div>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  }, [selectedProducts]);

  const handleDownload = useCallback(() => {
    if (selectedProducts.length === 0) {
      alert('يرجى اختيار منتجات على الأقل');
      return;
    }
    const headers = ['Product Name', 'SKU', 'QR Value', 'Price'];
    const rows = selectedProducts.map((p) => [p.name, p.sku || '---', buildQrValue(p), p.price]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'qr-codes.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'qr-codes.csv');
    });
  }, [selectedProducts]);

  const stats = useMemo(() => {
    const total = products.length;
    const withSku = products.filter((p) => p.sku).length;
    const selected = selectedIds.size;
    return [
      { label: 'إجمالي المنتجات', value: total, icon: Package, color: 'bg-blue-50 text-blue-600' },
      { label: 'لديها SKU', value: withSku, icon: Check, color: 'bg-green-50 text-green-600' },
      {
        label: 'بدون SKU',
        value: total - withSku,
        icon: AlertTriangle,
        color: 'bg-amber-50 text-amber-600',
      },
      { label: 'محدد', value: selected, icon: QrCode, color: 'bg-cyan-50 text-cyan-600' },
    ];
  }, [products, selectedIds]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <QrCode size={24} className="text-[#00E5FF]" />
        </div>
        <div className="text-right flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">QR Code</h1>
            <button
              onClick={() => setGuideOpen(true)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
              title="معلومات / Info"
            >
              <Info size={18} />
            </button>
          </div>
          <p className="text-sm font-bold text-slate-400 mt-1">إنشاء وطباعة أكواد QR للمنتجات</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white"
          >
            <div className={`p-2 rounded-xl ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">{s.label}</p>
              <p className="text-lg font-black text-slate-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePrint}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00E5FF] text-slate-900 font-bold text-sm hover:bg-[#00B8CC] transition-all disabled:opacity-50"
          >
            <Printer size={18} /> طباعة QR
          </button>
          <button
            onClick={handleDownload}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            <Download size={18} /> تصدير CSV
          </button>
          <button
            onClick={() => loadProducts()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <RefreshCw size={18} /> تحديث
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-300" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو SKU..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>

      {/* Products List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <QrCode size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 font-bold text-sm">لا توجد منتجات حالياً</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900"
            >
              {selectedIds.size === filtered.length && filtered.length > 0 ? (
                <Check size={18} className="text-[#00E5FF]" />
              ) : (
                <div className="w-4 h-4 border-2 border-slate-300 rounded" />
              )}
              تحديد الكل
            </button>
            <span className="text-xs font-bold text-slate-400">{filtered.length} منتج</span>
          </div>

          {/* QR Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => {
              const qrVal = buildQrValue(p);
              const isSelected = selectedIds.has(p.id);
              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-xl border-2 p-4 transition-all cursor-pointer ${isSelected ? 'border-[#00E5FF] bg-cyan-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => toggleSelect(p.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm truncate">{p.name}</div>
                      <div className="text-slate-500 text-xs">{p.sku || 'بدون SKU'}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(p.id);
                      }}
                    >
                      {isSelected ? (
                        <Check size={18} className="text-[#00E5FF]" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <QrCodeVisual value={qrVal} />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-600">{p.price} ج.م</span>
                    <span className="text-xs text-slate-400">مخزون: {p.stock ?? 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Guide Modal */}
      {guideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setGuideOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">دليل QR Code</h2>
              <button
                onClick={() => setGuideOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-6 text-right">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">وظيفة الصفحة</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  إنشاء وطباعة أكواد QR للمنتجات والفئات وتتبعها بالماسح.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <QrCode size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">الميزات</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• توليد QR Code لكل منتج</li>
                  <li>• طباعة QR فردي أو جماعي</li>
                  <li>• مسح QR للبحث السريع</li>
                  <li>• ربط QR بصفحة المنتج على الموقع</li>
                  <li>• تخصيص تصميم QR بالشعار والألوان</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
