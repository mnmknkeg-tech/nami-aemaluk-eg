'use client';

import React from 'react';
import { Eye, Package, ShoppingBag } from 'lucide-react';
import type { BundleItem, CustomBundleSection } from './types';

type Props = {
  bundleType: 'fixed' | 'custom';
  name: string;
  category: string;
  brand: string;
  imageUrl: string;
  bundleNumericPrice: number;
  originalTotalPrice: number;
  savingsAmount: number;
  savingsPercent: number;
  bundleItems: BundleItem[];
  customSections: CustomBundleSection[];
  selectedCustomOptions: Record<string, string>;
  setSelectedCustomOptions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

export default function BundleLivePreview({
  bundleType,
  name,
  category,
  brand,
  imageUrl,
  bundleNumericPrice,
  originalTotalPrice,
  savingsAmount,
  savingsPercent,
  bundleItems,
  customSections,
  selectedCustomOptions,
  setSelectedCustomOptions,
}: Props) {
  return (
    <div className="lg:col-span-4 sticky top-20 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Eye size={15} className="text-teal-600" />
            <span>معاينة الباقة المباشرة</span>
          </div>
          <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
            {bundleType === 'fixed' ? 'باقة ثابتة' : 'باقة مخصصة'}
          </span>
        </div>

        {/* Product Card */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="aspect-video bg-slate-100 relative overflow-hidden flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4">
                <Package size={36} className="mx-auto text-slate-300 mb-1" />
                <span className="text-[11px] text-slate-400 block font-medium">
                  صورة الباقة المجمّعة
                </span>
              </div>
            )}
            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-black shadow-xs">
              باقة منتجات
            </span>
            {savingsPercent > 0 && (
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black shadow-xs">
                خصم {savingsPercent}%
              </span>
            )}
          </div>

          <div className="p-4 space-y-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 leading-snug">
                {name || 'اسم باقة المنتجات'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {category || 'باقات وعروض'} {brand ? `• ${brand}` : ''}
              </p>
            </div>

            {/* Pricing preview */}
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-teal-600">
                {bundleNumericPrice > 0 ? `${bundleNumericPrice.toFixed(2)} ج.م` : '0.00 ج.م'}
              </span>
              {savingsAmount > 0 && (
                <span className="text-xs text-slate-400 line-through font-bold">
                  {originalTotalPrice.toFixed(2)} ج.م
                </span>
              )}
            </div>

            {savingsAmount > 0 && (
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                🎉 وفر {savingsAmount.toFixed(2)} ج.م عند طلب هذه الباقة!
              </div>
            )}

            {/* Included items / Custom sections preview */}
            <div className="border-t border-slate-100 pt-2.5 space-y-2">
              {bundleType === 'fixed' ? (
                <>
                  <span className="text-[11px] font-bold text-slate-700 block">
                    القطع المشمولة في الباقة ({bundleItems.length}):
                  </span>
                  {bundleItems.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">
                      لم يتم اختيار منتجات للباقة بعد
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-44 overflow-y-auto">
                      {bundleItems.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-slate-50 text-slate-700"
                        >
                          <span className="truncate max-w-[180px]">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-bold text-slate-500 shrink-0">
                            {(item.price * item.quantity).toFixed(2)} ج.م
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span className="text-[11px] font-bold text-slate-700 block">
                    اختيارات العميل للباقة:
                  </span>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {customSections.map((sec) => (
                      <div key={sec.id} className="text-[11px] bg-slate-50 p-2 rounded-lg">
                        <span className="font-bold text-slate-800 block mb-1">{sec.title}:</span>
                        {sec.items.length === 0 ? (
                          <span className="text-[10px] text-slate-400">
                            لا توجد خيارات في هذا القسم
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {sec.items.map((item) => {
                              const isPicked =
                                selectedCustomOptions[sec.id] === item.productId ||
                                sec.items[0]?.productId === item.productId;
                              return (
                                <button
                                  key={item.productId}
                                  type="button"
                                  onClick={() =>
                                    setSelectedCustomOptions((prev) => ({
                                      ...prev,
                                      [sec.id]: item.productId,
                                    }))
                                  }
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                    isPicked
                                      ? 'bg-teal-600 text-white border-teal-600'
                                      : 'bg-white text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {item.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Button preview */}
            <button
              type="button"
              disabled
              className="w-full py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 opacity-90 cursor-default shadow-xs"
            >
              <ShoppingBag size={14} />
              <span>إضافة الباقة إلى السلة</span>
            </button>
          </div>
        </div>

        <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 text-[11px] text-teal-800 space-y-1">
          <span className="font-bold block">💡 تعزيز المبيعات:</span>
          <p className="leading-relaxed text-teal-700">
            الباقات المجمعة ترفع متوسط قيمة الطلب (AOV) بنسبة تصل إلى 35% خاصة عند تقديم خصم إجمالي
            مقارنة بالشراء الفردي.
          </p>
        </div>
      </div>
    </div>
  );
}
