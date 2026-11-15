'use client';

import React from 'react';
import { Package, Search, Image as ImageIcon, Check, Plus } from 'lucide-react';
import type { AvailableProduct, BundleItem, CustomBundleSection } from './types';

type Props = {
  targetSectionId: string | null;
  bundleItems: BundleItem[];
  customSections: CustomBundleSection[];
  products: AvailableProduct[];
  loadingProducts: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onAddProduct: (p: AvailableProduct) => void;
  onClose: () => void;
};

export default function ProductPickerModal({
  targetSectionId,
  bundleItems,
  customSections,
  products,
  loadingProducts,
  search,
  onSearchChange,
  onAddProduct,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Package size={16} className="text-teal-600" />
            <span>
              {targetSectionId === null
                ? 'اختر منتجاً لإضافته للباقة الثابتة'
                : 'اختر منتجاً لإضافته للقسم المخصص'}
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث باسم المنتج أو التصنيف..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pr-8 pl-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[220px]">
          {loadingProducts ? (
            <div className="text-center py-10">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-slate-400">جاري تحميل منتجات المتجر...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              لا توجد منتجات تطابق البحث
            </div>
          ) : (
            products.map((p) => {
              const alreadyInTarget =
                targetSectionId === null
                  ? bundleItems.some((i) => i.productId === p.id)
                  : customSections
                      .find((s) => s.id === targetSectionId)
                      ?.items.some((i) => i.productId === p.id);

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={16} className="text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-900 truncate">{p.name}</h5>
                      <p className="text-[10px] text-slate-400">
                        {p.price} ج.م {p.category ? `• ${p.category}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddProduct(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shrink-0 ${
                      alreadyInTarget
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
                  >
                    {alreadyInTarget ? (
                      <>
                        <Check size={13} />
                        <span>مضاف</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>إضافة</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
