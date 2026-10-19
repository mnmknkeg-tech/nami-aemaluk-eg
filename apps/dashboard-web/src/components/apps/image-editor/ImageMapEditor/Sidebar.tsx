'use client';

import React, { memo, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface SidebarProps {
  selected: any;
  selectedProduct: any;
  productEditName: string;
  setProductEditName: (v: string) => void;
  productEditPrice: string;
  setProductEditPrice: (v: string) => void;
  productEditStock: string;
  setProductEditStock: (v: string) => void;
  productSaving: boolean;
  saveLinkedProduct: () => Promise<void>;
  updateSelected: (patch: any) => void;
  productOptions: any[];
  hotspots: any[];
  setHotspots: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedId: (id: string) => void;
  activeMap: any;
  maps: any[];
  setActiveMap: (m: any) => void;
  normalizeHotspotsFromMap: (m: any) => any[];
  setAddingMode: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  // Sections support (new)
  sections?: any[];
  addSection?: () => void;
  updateSection?: (id: string, patch: any) => void;
  removeSection?: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  selected,
  selectedProduct,
  productEditName,
  setProductEditName,
  productEditPrice,
  setProductEditPrice,
  productEditStock,
  setProductEditStock,
  productSaving,
  saveLinkedProduct,
  updateSelected,
  productOptions,
  hotspots,
  setHotspots,
  setSelectedId,
  activeMap,
  maps,
  setActiveMap,
  normalizeHotspotsFromMap,
  setAddingMode,
  fileInputRef,
  sections,
  addSection,
  updateSection,
  removeSection,
}) => {
  const [productQuery, setProductQuery] = useState('');

  const filteredProductOptions = useMemo(() => {
    const list = Array.isArray(productOptions) ? productOptions : [];
    const q = String(productQuery || '').trim().toLowerCase();
    if (!q) return list.slice(0, 250);
    const out: any[] = [];
    for (const p of list) {
      const name = String(p?.name || '').toLowerCase();
      const id = String(p?.id || '').toLowerCase();
      if (name.includes(q) || id.includes(q)) out.push(p);
      if (out.length >= 250) break;
    }
    return out;
  }, [productOptions, productQuery]);

  return (
    <div className="border-t lg:border-t-0 lg:border-l border-slate-100 p-4 overflow-y-auto bg-white">
      <div className="space-y-4">
        {/* Image upload */}
        <div className="space-y-2">
          <div className="text-xs font-black text-slate-500">الصورة</div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm transition-all active:scale-95 shadow-lg"
            type="button"
          >
            رفع/تغيير الصورة
          </button>
        </div>

        {/* Map switcher */}
        <div className="space-y-2">
          <div className="text-xs font-black text-slate-500">اختر الخريطة</div>
          <select
            value={String(activeMap?.id || '')}
            onChange={(e) => {
              const id = String(e.target.value || '');
              const m = maps.find((x: any) => String(x?.id) === id) || null;
              setActiveMap(m);
              setHotspots(normalizeHotspotsFromMap(m));
              setSelectedId('');
              setAddingMode(false);
            }}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#00E5FF]"
          >
            <option value="">بدون</option>
            {maps.map((m: any) => (
              <option key={m.id} value={String(m.id)}>
                {String(m.title || m.imageUrl || m.image_url || '').slice(0, 40)}
                {m.isActive || m.is_active ? ' (نشط)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Sections (new) */}
        {Array.isArray(sections) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-slate-500">الأقسام</div>
              {addSection && (
                <button
                  type="button"
                  onClick={addSection}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  title="إضافة قسم"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
            {sections.length === 0 && (
              <div className="text-[10px] text-slate-400 font-bold">لا توجد أقسام بعد</div>
            )}
            {sections.map((s: any) => (
              <div key={s.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                <input
                  value={String(s.name || '')}
                  onChange={(e) => updateSection?.(s.id, { name: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 font-bold text-xs outline-none focus:border-[#00E5FF] bg-white"
                  placeholder="اسم القسم"
                />
                {removeSection && (
                  <button
                    type="button"
                    onClick={() => removeSection(s.id)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                    title="حذف القسم"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Selected hotspot editor */}
        {selected ? (
          <div className="space-y-3 p-4 rounded-3xl bg-slate-50 border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
            <div className="font-black text-sm text-slate-900">تعديل النقطة</div>

            <div className="space-y-1">
              <div className="text-[10px] font-black text-slate-500">التسمية المعروضة</div>
              <input
                value={selected.label || ''}
                onChange={(e) => updateSelected({ label: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#00E5FF] bg-white"
              />
            </div>

            {/* Section assignment (new) */}
            {Array.isArray(sections) && sections.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-black text-slate-500">القسم</div>
                <select
                  value={String(selected.sectionId || '')}
                  onChange={(e) => updateSelected({ sectionId: e.target.value || null })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#00E5FF] bg-white"
                >
                  <option value="">بدون قسم</option>
                  {sections.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-[10px] font-black text-slate-500">ربط بمنتج</div>
              <input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#00E5FF] bg-white mb-2"
                placeholder="ابحث بالاسم"
              />
              <select
                value={selected.productId || ''}
                onChange={(e) => {
                  const nextId = String(e.target.value || '').trim() || null;
                  const nextProduct = nextId
                    ? (productOptions).find((p: any) => String(p?.id || '') === nextId) || null
                    : null;
                  updateSelected({
                    productId: nextId,
                    ...(nextProduct && !selected.label ? { label: String(nextProduct?.name || '') } : {}),
                  });
                }}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#00E5FF] bg-white"
              >
                <option value="">بدون</option>
                {filteredProductOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {selectedProduct ? (
              <div className="space-y-3 p-4 rounded-3xl bg-white border border-slate-200 shadow-sm">
                <div className="font-black text-[10px] text-[#00E5FF] uppercase tracking-widest">تعديل بيانات المنتج الأصلية</div>

                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-500">اسم المنتج</div>
                  <input
                    value={productEditName}
                    onChange={(e) => setProductEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-slate-500">السعر</div>
                    <input
                      type="number"
                      value={productEditPrice}
                      onChange={(e) => setProductEditPrice(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#00E5FF]"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-slate-500">المخزون</div>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={productEditStock}
                      onChange={(e) => setProductEditStock(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#00E5FF]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => saveLinkedProduct().catch(() => {})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs transition-all active:scale-95 disabled:opacity-50"
                  disabled={productSaving}
                >
                  {productSaving ? <Loader2 size={14} className="animate-spin inline ml-2" /> : null}
                  حفظ في المخزون
                </button>
              </div>
            ) : null}

            <div className="space-y-1">
              <div className="text-[10px] font-black text-slate-500">سعر خاص (اختياري)</div>
              <input
                type="number"
                value={typeof selected.priceOverride === 'number' ? String(selected.priceOverride) : ''}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  updateSelected({ priceOverride: Number.isFinite(n) ? n : null });
                }}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold outline-none focus:border-[#00E5FF] bg-white"
                placeholder="اتركه فارغاً لاستخدام سعر المنتج"
              />
            </div>

            {/* Advanced fields (new): sortOrder, width, height */}
            <details className="space-y-2">
              <summary className="text-[10px] font-black text-slate-400 cursor-pointer select-none">
                إعدادات متقدمة
              </summary>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-500">ترتيب</div>
                  <input
                    type="number"
                    value={typeof selected.sortOrder === 'number' ? String(selected.sortOrder) : '0'}
                    onChange={(e) => updateSelected({ sortOrder: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 font-bold text-xs outline-none focus:border-[#00E5FF] bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-500">عرض</div>
                  <input
                    type="number"
                    value={typeof selected.width === 'number' && selected.width !== null ? String(selected.width) : ''}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      updateSelected({ width: Number.isFinite(n) ? n : null });
                    }}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 font-bold text-xs outline-none focus:border-[#00E5FF] bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-500">ارتفاع</div>
                  <input
                    type="number"
                    value={typeof selected.height === 'number' && selected.height !== null ? String(selected.height) : ''}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      updateSelected({ height: Number.isFinite(n) ? n : null });
                    }}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 font-bold text-xs outline-none focus:border-[#00E5FF] bg-white"
                  />
                </div>
              </div>
            </details>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setHotspots((prev) => prev.filter((h) => h.id !== selected.id));
                  setSelectedId('');
                }}
                className="px-4 py-3 rounded-2xl bg-red-50 text-red-600 font-black border border-red-100 text-xs transition-all active:scale-95"
              >
                حذف النقطة
              </button>
              <button
                type="button"
                onClick={() => setSelectedId('')}
                className="px-4 py-3 rounded-2xl bg-white text-slate-700 font-black border border-slate-200 text-xs transition-all active:scale-95"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 text-slate-500 font-bold text-sm text-center">
            اختر نقطة على الصورة لتعديلها، أو فعّل وضع الإضافة وأضف نقطة جديدة.
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(Sidebar);
