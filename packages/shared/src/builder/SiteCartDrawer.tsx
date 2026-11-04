'use client';

import React from 'react';
import { X, ShoppingBag, ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import type { SiteShopContext, Website } from './types';
import { formatPrice } from './theme';

export interface SiteCartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
  productId?: string;
  addons?: unknown;
  variantSelection?: unknown;
}

interface SiteCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: SiteCartItem[];
  shop: SiteShopContext;
  website: Website;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onProceedToCheckout: () => void;
}

export const SiteCartDrawer: React.FC<SiteCartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  shop,
  website,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const rawSubtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  // Discounts are deliberately not calculated in this presentation-only cart.
  // Checkout/backend remain the authority until a validated coupon endpoint is wired.
  const finalTotal = rawSubtotal;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full bg-white text-slate-900 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-slate-900">سلة مشتريات المتجر</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  موقع مستقل
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{shop.name || website.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            /* Empty Cart View */
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">السلة فارغة حالياً</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                تصفح منتجات وعروض المتجر وأضف ما يعجبك إلى السلة لإتمام الطلب بسهولة
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                تصفح المنتجات الآن
              </button>
            </div>
          ) : (
            /* Items List & Checkout */
            <>
              {/* Product Items */}
              <div className="space-y-2.5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                      <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                        {formatPrice(item.price)}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1 rounded-lg border border-slate-100">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Delete Item */}
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Delivery details are collected on the full merchant checkout page. */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <p className="text-xs font-bold text-slate-700">
                  أكمل بيانات الاسم والهاتف والعنوان والخريطة في صفحة الطلب التالية.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer & Submit Action */}
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-white space-y-3">
            {/* Price Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>المجموع الفرعي</span>
                <span className="font-semibold">{formatPrice(rawSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-100">
                <span>الإجمالي النهائي</span>
                <span className="text-emerald-600 text-base font-black">
                  {formatPrice(finalTotal)}
                </span>
              </div>
            </div>

            {/* Confirm Order Button */}
            <button
              type="button"
              onClick={onProceedToCheckout}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <>
                <ArrowRight className="w-4 h-4" />
                <span>تأكيد السلة وإدخال بيانات التوصيل ({formatPrice(finalTotal)})</span>
              </>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
