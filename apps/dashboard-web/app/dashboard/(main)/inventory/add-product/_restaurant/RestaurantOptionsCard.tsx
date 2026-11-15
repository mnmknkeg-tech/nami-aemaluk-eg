'use client';

import { Plus, Trash2, Package } from 'lucide-react';
import { RESTAURANT_SIZE_NONE, type AddonItem, type MenuVariantItem } from './types';

interface RestaurantOptionsCardProps {
  baseSizesEnabled: boolean;
  onBaseSizesEnabled: (v: boolean) => void;
  priceSmall: string;
  onPriceSmall: (v: string) => void;
  priceMedium: string;
  onPriceMedium: (v: string) => void;
  priceLarge: string;
  onPriceLarge: (v: string) => void;
  menuVariants: MenuVariantItem[];
  onAddMenuVariant: () => void;
  onRemoveMenuVariant: (id: string) => void;
  onUpdateMenuVariant: (id: string, field: keyof MenuVariantItem, value: any) => void;
  addonItems: AddonItem[];
  onAddAddon: () => void;
  onRemoveAddon: (id: string) => void;
  onUpdateAddon: (id: string, field: keyof AddonItem, value: any) => void;
}

export default function RestaurantOptionsCard({
  baseSizesEnabled,
  onBaseSizesEnabled,
  priceSmall,
  onPriceSmall,
  priceMedium,
  onPriceMedium,
  priceLarge,
  onPriceLarge,
  menuVariants,
  onAddMenuVariant,
  onRemoveMenuVariant,
  onUpdateMenuVariant,
  addonItems,
  onAddAddon,
  onRemoveAddon,
  onUpdateAddon,
}: RestaurantOptionsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-xs">
      <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
        خيارات الوجبة والأحجام والإضافات
      </h2>

      {/* Base sizes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={baseSizesEnabled}
              onChange={(e) => onBaseSizesEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-teal-600"
            />
            <span className="text-xs font-bold text-slate-700">
              تفعيل الأحجام (صغير / وسط / كبير)
            </span>
          </label>
          <span className="text-xs font-bold text-slate-400">أحجام المنتج الأساسية</span>
        </div>

        {baseSizesEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="text-right p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <label className="text-xs font-bold text-slate-600 block">صغير</label>
              <input
                type="number"
                value={priceSmall === RESTAURANT_SIZE_NONE ? '' : priceSmall}
                onChange={(e) => onPriceSmall(e.target.value || RESTAURANT_SIZE_NONE)}
                className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center focus:outline-none focus:border-teal-400"
                placeholder="السعر (اتركه فارغ للتعطيل)"
              />
            </div>
            <div className="text-right p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <label className="text-xs font-bold text-slate-600 block">متوسط</label>
              <input
                type="number"
                value={priceMedium === RESTAURANT_SIZE_NONE ? '' : priceMedium}
                onChange={(e) => onPriceMedium(e.target.value || RESTAURANT_SIZE_NONE)}
                className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center focus:outline-none focus:border-teal-400"
                placeholder="السعر (اتركه فارغ للتعطيل)"
              />
            </div>
            <div className="text-right p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <label className="text-xs font-bold text-slate-600 block">كبير</label>
              <input
                type="number"
                value={priceLarge === RESTAURANT_SIZE_NONE ? '' : priceLarge}
                onChange={(e) => onPriceLarge(e.target.value || RESTAURANT_SIZE_NONE)}
                className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center focus:outline-none focus:border-teal-400"
                placeholder="السعر (اتركه فارغ للتعطيل)"
              />
            </div>
          </div>
        )}
      </div>

      {/* Menu Variants */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onAddMenuVariant}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition-all"
          >
            <Plus size={13} />
            <span>إضافة نوع</span>
          </button>
          <div className="text-right">
            <h3 className="text-xs font-bold text-slate-800">أنواع وتشكيلات الوجبة</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">مثال: دجاج، لحم، مكسرات، نباتي...</p>
          </div>
        </div>

        {menuVariants.length === 0 ? (
          <div className="text-center py-5 text-slate-400 rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
            <p className="text-xs font-bold">لا توجد أنواع مضافة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {menuVariants.map((variant) => (
              <div
                key={variant.id}
                className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onRemoveMenuVariant(variant.id)}
                    className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) => onUpdateMenuVariant(variant.id, 'name', e.target.value)}
                    className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-right focus:outline-none focus:border-teal-400"
                    placeholder="اسم النوع (مثال: دجاج أو لحم بقري)"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={variant.hasSmall}
                      onChange={(e) =>
                        onUpdateMenuVariant(variant.id, 'hasSmall', e.target.checked)
                      }
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-teal-600"
                    />
                    <span className="text-xs font-bold text-slate-600">صغير</span>
                    <input
                      type="number"
                      value={variant.priceSmall}
                      onChange={(e) =>
                        onUpdateMenuVariant(variant.id, 'priceSmall', e.target.value)
                      }
                      disabled={!variant.hasSmall}
                      className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-center disabled:opacity-40"
                      placeholder="السعر"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={variant.hasMedium}
                      onChange={(e) =>
                        onUpdateMenuVariant(variant.id, 'hasMedium', e.target.checked)
                      }
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-teal-600"
                    />
                    <span className="text-xs font-bold text-slate-600">وسط</span>
                    <input
                      type="number"
                      value={variant.priceMedium}
                      onChange={(e) =>
                        onUpdateMenuVariant(variant.id, 'priceMedium', e.target.value)
                      }
                      disabled={!variant.hasMedium}
                      className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-center disabled:opacity-40"
                      placeholder="السعر"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={variant.hasLarge}
                      onChange={(e) =>
                        onUpdateMenuVariant(variant.id, 'hasLarge', e.target.checked)
                      }
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-teal-600"
                    />
                    <span className="text-xs font-bold text-slate-600">كبير</span>
                    <input
                      type="number"
                      value={variant.priceLarge}
                      onChange={(e) =>
                        onUpdateMenuVariant(variant.id, 'priceLarge', e.target.value)
                      }
                      disabled={!variant.hasLarge}
                      className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-center disabled:opacity-40"
                      placeholder="السعر"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Addons */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onAddAddon}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition-all"
          >
            <Plus size={13} />
            <span>إضافة صوص / إضافة</span>
          </button>
          <div className="text-right">
            <h3 className="text-xs font-bold text-slate-800">إضافات الوجبة (Add-ons)</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">صوصات إضافية، بطاطس، جبن مضاعف...</p>
          </div>
        </div>

        {addonItems.length === 0 ? (
          <div className="text-center py-5 text-slate-400 rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
            <Package size={24} className="mx-auto mb-1 text-slate-300" />
            <p className="text-xs font-bold">لا توجد إضافات مخصصة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addonItems.map((addon) => (
              <div
                key={addon.id}
                className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onRemoveAddon(addon.id)}
                    className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                  <input
                    type="text"
                    value={addon.name}
                    onChange={(e) => onUpdateAddon(addon.id, 'name', e.target.value)}
                    className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-right focus:outline-none focus:border-teal-400"
                    placeholder="اسم الإضافة (مثال: صوص جبنة شيدر)"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={addon.hasSmall}
                      onChange={(e) => onUpdateAddon(addon.id, 'hasSmall', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-teal-600"
                    />
                    <span className="text-xs font-bold text-slate-600">صغير</span>
                    <input
                      type="number"
                      value={addon.priceSmall}
                      onChange={(e) => onUpdateAddon(addon.id, 'priceSmall', e.target.value)}
                      disabled={!addon.hasSmall}
                      className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-center disabled:opacity-40"
                      placeholder="السعر"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={addon.hasMedium}
                      onChange={(e) => onUpdateAddon(addon.id, 'hasMedium', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-teal-600"
                    />
                    <span className="text-xs font-bold text-slate-600">وسط</span>
                    <input
                      type="number"
                      value={addon.priceMedium}
                      onChange={(e) => onUpdateAddon(addon.id, 'priceMedium', e.target.value)}
                      disabled={!addon.hasMedium}
                      className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-center disabled:opacity-40"
                      placeholder="السعر"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={addon.hasLarge}
                      onChange={(e) => onUpdateAddon(addon.id, 'hasLarge', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-teal-600"
                    />
                    <span className="text-xs font-bold text-slate-600">كبير</span>
                    <input
                      type="number"
                      value={addon.priceLarge}
                      onChange={(e) => onUpdateAddon(addon.id, 'priceLarge', e.target.value)}
                      disabled={!addon.hasLarge}
                      className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-center disabled:opacity-40"
                      placeholder="السعر"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
