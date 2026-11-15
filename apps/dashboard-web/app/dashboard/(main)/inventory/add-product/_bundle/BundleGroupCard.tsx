'use client';

import React from 'react';
import { Layers, Plus, Package, Image as ImageIcon, Trash2 } from 'lucide-react';
import type { BundleItem, CustomBundleSection } from './types';

type Props = {
  bundleType: 'fixed' | 'custom';
  setBundleType: React.Dispatch<React.SetStateAction<'fixed' | 'custom'>>;
  bundleItems: BundleItem[];
  customSections: CustomBundleSection[];
  originalTotalPrice: number;
  onOpenPicker: (sectionId: string | null) => void;
  onUpdateItemQuantity: (productId: string, qty: number) => void;
  onRemoveBundleItem: (productId: string) => void;
  onAddCustomSection: () => void;
  onUpdateSection: (sectionId: string, field: keyof CustomBundleSection, value: any) => void;
  onRemoveCustomSection: (sectionId: string) => void;
  onRemoveProductFromSection: (sectionId: string, productId: string) => void;
};

export default function BundleGroupCard({
  bundleType,
  setBundleType,
  bundleItems,
  customSections,
  originalTotalPrice,
  onOpenPicker,
  onUpdateItemQuantity,
  onRemoveBundleItem,
  onAddCustomSection,
  onUpdateSection,
  onRemoveCustomSection,
  onRemoveProductFromSection,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">مجموعة المنتجات</h3>
            <p className="text-[11px] text-slate-400">اختر نوع مجموعة المنتجات وحدد محتوياتها</p>
          </div>
        </div>
      </div>

      {/* Group Type Selector (ثابتة vs مخصصة) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-700">اختر نوع المجموعة</label>
          <span className="text-[10px] text-slate-400">يمكن اختيار نوع مجموعة منتجات واحد فقط</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option 1: Fixed */}
          <button
            type="button"
            onClick={() => setBundleType('fixed')}
            className={`p-4 rounded-xl border text-right transition-all relative ${
              bundleType === 'fixed'
                ? 'border-teal-600 bg-teal-50/50 ring-1 ring-teal-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-slate-900">ثابتة</span>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  bundleType === 'fixed'
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-slate-300'
                }`}
              >
                {bundleType === 'fixed' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              مجموعة تضم منتجات بدون خيارات يشتريها العميل معًا.
            </p>
          </button>

          {/* Option 2: Custom */}
          <button
            type="button"
            onClick={() => setBundleType('custom')}
            className={`p-4 rounded-xl border text-right transition-all relative ${
              bundleType === 'custom'
                ? 'border-teal-600 bg-teal-50/50 ring-1 ring-teal-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-slate-900">مُخصَّصة</span>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  bundleType === 'custom'
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-slate-300'
                }`}
              >
                {bundleType === 'custom' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              مجموعة تُعرض منتجاتها ضمن أقسام يختار منها العميل ما يناسبه.
            </p>
          </button>
        </div>
      </div>

      {/* ─── Render based on bundleType ─── */}

      {/* TYPE A: Fixed Bundle (ثابتة) */}
      {bundleType === 'fixed' && (
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              منتجات الباقة الثابتة (التي يستلمها العميل معاً)
            </span>
            <button
              type="button"
              onClick={() => onOpenPicker(null)}
              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>إضافة منتج للباقة</span>
            </button>
          </div>

          {bundleItems.length === 0 ? (
            <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Package size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">لم تُضف منتجات للباقة بعد</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                اضغط على زر &quot;إضافة منتج للباقة&quot; لاختيار المنتجات التي ستتضمنها هذه الحزمة.
              </p>
              <button
                type="button"
                onClick={() => onOpenPicker(null)}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors"
              >
                <Plus size={14} />
                <span>اختر منتجات المتجر الآن</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {bundleItems.map((item, index) => (
                  <div
                    key={item.productId}
                    className="p-3 bg-white flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 text-center text-xs font-bold text-slate-400">
                        {index + 1}
                      </span>
                      <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon size={18} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                        <p className="text-[11px] text-slate-400">السعر الفردي: {item.price} ج.م</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Quantity control */}
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => onUpdateItemQuantity(item.productId, item.quantity - 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                        >
                          -
                        </button>
                        <span className="px-2.5 py-1 text-xs font-black text-slate-800 bg-slate-50 min-w-[28px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateItemQuantity(item.productId, item.quantity + 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                        >
                          +
                        </button>
                      </div>

                      <div className="w-20 text-left">
                        <span className="text-xs font-bold text-slate-800 block">
                          {(item.price * item.quantity).toFixed(2)} ج.م
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveBundleItem(item.productId)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="حذف من الباقة"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-600">
                  إجمالي عدد القطع في الباقة:{' '}
                  <strong className="text-slate-900">
                    {bundleItems.reduce((s, i) => s + i.quantity, 0)} قطعة
                  </strong>
                </span>
                <span className="font-bold text-slate-600">
                  مجموع الأسعار الفردية:{' '}
                  <strong className="text-slate-900">{originalTotalPrice.toFixed(2)} ج.م</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TYPE B: Custom Bundle (مُخصَّصة مع أقسام للاختيار) */}
      {bundleType === 'custom' && (
        <div className="space-y-5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">أقسام الباقة المخصصة</span>
              <p className="text-[11px] text-slate-400">
                أنشئ أقساماً (مثل: الطبق الرئيسي، الإضافة، المشروب) ليختار العميل منها
              </p>
            </div>
            <button
              type="button"
              onClick={onAddCustomSection}
              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>إضافة قسم جديد</span>
            </button>
          </div>

          <div className="space-y-4">
            {customSections.map((sec, secIndex) => (
              <div
                key={sec.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {secIndex + 1}
                    </span>
                    <input
                      type="text"
                      value={sec.title}
                      onChange={(e) => onUpdateSection(sec.id, 'title', e.target.value)}
                      placeholder="عنوان القسم (مثال: اختر التيشيرت)"
                      className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white w-full max-w-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-500 font-medium">المطلوب اختياره:</span>
                    <select
                      value={sec.minSelect}
                      onChange={(e) => onUpdateSection(sec.id, 'minSelect', Number(e.target.value))}
                      className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-white font-bold"
                    >
                      <option value="1">1 منتج</option>
                      <option value="2">2 منتج</option>
                      <option value="3">3 منتجات</option>
                    </select>

                    {customSections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveCustomSection(sec.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors mr-1"
                        title="حذف القسم"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Products List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-bold">
                      الخيارات المتاحة للعميل في هذا القسم ({sec.items.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenPicker(sec.id)}
                      className="text-[11px] text-teal-600 hover:underline font-bold flex items-center gap-1"
                    >
                      <Plus size={12} />
                      <span>إضافة منتجات لهذا القسم</span>
                    </button>
                  </div>

                  {sec.items.length === 0 ? (
                    <div
                      onClick={() => onOpenPicker(sec.id)}
                      className="py-4 px-3 border border-dashed border-slate-200 rounded-lg bg-white text-center cursor-pointer hover:border-teal-400 transition-colors text-[11px] text-slate-400"
                    >
                      + اضغط هنا لاختيار المنتجات التي ستظهر للعميل في هذا القسم
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sec.items.map((item) => (
                        <div
                          key={item.productId}
                          className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded bg-slate-100 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon size={14} className="text-slate-400" />
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-slate-500 font-bold">
                              {item.price} ج.م
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemoveProductFromSection(sec.id, item.productId)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
