'use client';

import { Package, Trash2, Plus, X } from 'lucide-react';
import { presetColors, presetSizes } from './types';
import type { AddonItem, FashionSizeItem, PackOptionItem } from './types';

type Props = {
  selectedColors: Array<{ name: string; value: string }>;
  toggleColor: (color: { name: string; value: string }) => void;
  customColor: string;
  setCustomColor: (v: string) => void;
  addCustomColor: () => void;
  fashionSizeItems: FashionSizeItem[];
  addPresetSize: (size: string) => void;
  addCustomSizeItem: () => void;
  customSize: string;
  setCustomSize: (v: string) => void;
  updateSizePrice: (index: number, price: string) => void;
  removeSize: (index: number) => void;
  basePrice: string;
  packEnabled: boolean;
  setPackEnabled: (v: boolean) => void;
  packOptionItems: PackOptionItem[];
  addPackOption: () => void;
  updatePackOption: (id: string, field: 'qty' | 'price', val: string) => void;
  removePackOption: (id: string) => void;
  addonItems: AddonItem[];
  addAddon: () => void;
  updateAddon: (id: string, field: keyof AddonItem, val: any) => void;
  removeAddon: (id: string) => void;
};

export default function ClothingOptionsCard({
  selectedColors,
  toggleColor,
  customColor,
  setCustomColor,
  addCustomColor,
  fashionSizeItems,
  addPresetSize,
  addCustomSizeItem,
  customSize,
  setCustomSize,
  updateSizePrice,
  removeSize,
  basePrice,
  packEnabled,
  setPackEnabled,
  packOptionItems,
  addPackOption,
  updatePackOption,
  removePackOption,
  addonItems,
  addAddon,
  updateAddon,
  removeAddon,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-xs">
      <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
        خيارات المنتج الملموس (الألوان والمقاسات)
      </h2>

      {/* Colors */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-700 block text-right">الألوان المتاحة</label>
        <div className="flex flex-wrap gap-2 justify-end">
          {presetColors.map((c) => {
            const isSelected = selectedColors.some((x) => x.value === c.value);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleColor(c)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-bold text-xs transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/40"
                  style={{ background: c.value }}
                />
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Custom color input */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={addCustomColor}
            className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-black transition-all"
          >
            إضافة لون مخصص
          </button>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-10 h-8 rounded-lg border border-slate-200 bg-white cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-500">اختر من اللوحة</span>
          </div>
        </div>

        {/* Selected colors chips */}
        {selectedColors.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {selectedColors.map((c) => (
              <span
                key={c.value}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 font-bold text-xs text-slate-800"
              >
                <span
                  className="w-3 h-3 rounded-full border border-slate-300"
                  style={{ background: c.value }}
                />
                {c.name}
                <button
                  type="button"
                  onClick={() => toggleColor(c)}
                  className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Sizes */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <label className="text-xs font-bold text-slate-700 block text-right">
          المقاسات والأسعار الخاصة
        </label>
        <div className="flex flex-wrap gap-2 justify-end">
          {presetSizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addPresetSize(s)}
              disabled={fashionSizeItems.some((x) => x.label === s)}
              className="px-3 py-1.5 rounded-full border font-bold text-xs transition-all bg-white border-slate-200 hover:border-slate-400 disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Custom size input */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addCustomSizeItem}
            className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-black transition-all shrink-0"
          >
            إضافة مقاس مخصص
          </button>
          <input
            placeholder="مثال: 42 أو مقاس حر..."
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-right outline-none focus:border-teal-400"
          />
        </div>

        {/* Sizes table */}
        {fashionSizeItems.length > 0 && (
          <div className="space-y-2 pt-2">
            {fashionSizeItems.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50"
              >
                <button
                  type="button"
                  onClick={() => removeSize(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">ج.م</span>
                  <input
                    type="number"
                    value={s.price}
                    onChange={(e) => updateSizePrice(idx, e.target.value)}
                    className="w-24 h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center focus:outline-none focus:border-teal-400"
                    placeholder={basePrice || 'السعر'}
                  />
                </div>
                <span className="font-bold text-slate-800 text-xs px-2.5 py-1 bg-white rounded-lg border border-slate-200">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pack Options */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={packEnabled}
              onChange={(e) => setPackEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-teal-600"
            />
            <span className="text-xs font-bold text-slate-700">
              تفعيل باقات التوفير (اشترِ أكثر ووفر)
            </span>
          </label>
          <h3 className="text-xs font-bold text-slate-500">باقات الخيارات</h3>
        </div>

        {packEnabled && (
          <div className="space-y-2.5 pt-2">
            {packOptionItems.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 justify-between"
              >
                <button
                  type="button"
                  onClick={() => removePackOption(p.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <div className="text-right">
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                      السعر الإجمالي
                    </label>
                    <input
                      type="number"
                      value={p.price}
                      onChange={(e) => updatePackOption(p.id, 'price', e.target.value)}
                      className="w-28 h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-400 text-center"
                      placeholder="السعر"
                    />
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                      الكمية في الباقة
                    </label>
                    <input
                      type="number"
                      value={p.qty}
                      onChange={(e) => updatePackOption(p.id, 'qty', e.target.value)}
                      className="w-24 h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-400 text-center"
                      placeholder="مثال: 3"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addPackOption}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all"
            >
              <Plus size={14} />
              <span>إضافة باقة</span>
            </button>
          </div>
        )}
      </div>

      {/* Addons / Complementary Products */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={addAddon}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition-all"
          >
            <Plus size={13} />
            <span>إضافة منتج تكميلي</span>
          </button>
          <h3 className="text-xs font-bold text-slate-700">منتجات تكميلية (Cross-sell)</h3>
        </div>

        {addonItems.length === 0 ? (
          <div className="text-center py-6 text-slate-400 rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
            <Package size={28} className="mx-auto mb-1.5 text-slate-300" />
            <p className="text-xs font-bold">لا توجد منتجات تكميلية مقترحة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addonItems.map((a) => (
              <div
                key={a.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => removeAddon(a.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-colors"
                  >
                    حذف
                  </button>
                  <input
                    value={a.price}
                    onChange={(e) => updateAddon(a.id, 'price', e.target.value)}
                    placeholder="السعر (ج.م)"
                    inputMode="decimal"
                    className="w-28 bg-white border border-slate-200 rounded-xl h-10 px-3 font-bold text-right outline-none text-xs focus:border-teal-400"
                  />
                  <input
                    value={a.name}
                    onChange={(e) => updateAddon(a.id, 'name', e.target.value)}
                    placeholder="اسم المنتج التكميلي (مثال: حزام جلدي)"
                    className="flex-1 bg-white border border-slate-200 rounded-xl h-10 px-3 font-bold text-right outline-none text-xs focus:border-teal-400"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
