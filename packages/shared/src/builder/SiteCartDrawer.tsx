'use client';

import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  ShoppingCart,
  Store,
  Package,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Tag,
  CreditCard,
  MessageCircle,
  Phone,
  Truck,
} from 'lucide-react';
import type { SiteShopContext, Website } from './types';
import { buildWhatsAppLink, formatPrice } from './theme';

export interface SiteCartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
}

interface SiteCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: SiteCartItem[];
  shop: SiteShopContext;
  website: Website;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

export const SiteCartDrawer: React.FC<SiteCartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  shop,
  website,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [placedOrderNumber, setPlacedOrderNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'whatsapp'>('cod');

  if (!isOpen) return null;

  const rawSubtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = rawSubtotal * appliedDiscount;
  const subtotalAfterDiscount = rawSubtotal - discountAmount;
  const finalTotal = subtotalAfterDiscount;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    setCouponSuccess(null);

    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'ALMAJD10' || code === 'VIP10' || code === 'SALE10' || code === 'WELCOME10') {
      setAppliedDiscount(0.1);
      setCouponSuccess('تم تفعيل كود الخصم (10%) بنجاح!');
    } else if (code === 'VIP20' || code === 'SAVE20') {
      setAppliedDiscount(0.2);
      setCouponSuccess('تم تفعيل كود الخصم الحصري (20%) بنجاح!');
    } else {
      setCouponError('كود الخصم غير صحيح أو منتهي الصلاحية');
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsCheckingOut(true);
    const orderNum = '#' + Math.floor(100000 + Math.random() * 900000);
    setPlacedOrderNumber(orderNum);

    const newOrder = {
      id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      orderNumber: orderNum,
      source: 'website',
      status: 'pending',
      createdAt: new Date().toISOString(),
      tenantId: shop.id,
      shopId: shop.id,
      shopName: shop.name || website.name,
      items: [...items],
      total: Math.round(finalTotal),
      subtotal: rawSubtotal,
      discount: discountAmount,
      tax: 0,
      paymentMethod: paymentMethod === 'cod' ? 'cash_on_delivery' : 'whatsapp_direct',
      notes: orderNotes,
      customer: {
        name: customerName || 'عميل المتجر الإلكتروني',
        phone: customerPhone || '',
        address: customerAddress || 'توصيل مباشر',
      },
    };

    // 1. Save to merchant's local storage for real-time dashboard display
    try {
      const storageKey = `ray_merchant_orders_${shop.id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.unshift(newOrder);
      localStorage.setItem(storageKey, JSON.stringify(existing));

      // Also notify merchant dashboard listeners (order bell & list watcher)
      window.dispatchEvent(new CustomEvent('ray_new_website_order', { detail: newOrder }));
      window.dispatchEvent(new Event('orders-updated'));
    } catch (err) {
      console.warn('Could not persist website order to localStorage', err);
    }

    // 2. Attempt backend order creation asynchronously
    try {
      fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      }).catch(() => {});
    } catch {}

    setTimeout(() => {
      setIsCheckingOut(false);
      setCheckoutCompleted(true);
      onClearCart();
    }, 600);
  };

  // Build WhatsApp invoice summary link
  const buildWhatsAppOrderLink = () => {
    const itemsList = items
      .map((it, idx) => `${idx + 1}. ${it.title} × ${it.quantity} (${it.price * it.quantity} ج.م)`)
      .join('\n');

    const msg = `مرحبًا ${shop.name}، أود تأكيد طلبي من الموقع الإلكتروني:
رقم الطلب: ${placedOrderNumber}
العميل: ${customerName || 'عميل المتجر'}
الهاتف: ${customerPhone}
العنوان: ${customerAddress}
المنتجات:
${itemsList}

الإجمالي: ${Math.round(finalTotal)} ج.م
طريقة الاستلام: ${paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'تأكيد مباشر عبر واتساب'}
ملاحظات: ${orderNotes || 'لا توجد'}`;

    return buildWhatsAppLink(shop.whatsapp || shop.phone, msg);
  };

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
          {checkoutCompleted ? (
            /* Order Success View */
            <div className="py-8 px-2 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900">تم استلام طلبك بنجاح! 🎉</h4>
                <p className="text-xs text-slate-500 mt-1">
                  رقم طلبك هو{' '}
                  <span className="font-black text-emerald-600 font-mono text-sm">
                    {placedOrderNumber}
                  </span>
                </p>
                <p className="text-[11px] text-slate-600 mt-1">
                  تم إرسال الطلب مباشرة إلى لوحة تحكم التاجر وسيتواصل معك لتأكيد التوصيل.
                </p>
              </div>

              {/* Direct WhatsApp Confirmation Button */}
              {(shop.whatsapp || shop.phone) && (
                <a
                  href={buildWhatsAppOrderLink() || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>إرسال تفاصيل الفاتورة عبر واتساب</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  setCheckoutCompleted(false);
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                متابعة تصفح المتجر
              </button>
            </div>
          ) : items.length === 0 ? (
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

              {/* Promo Code Input */}
              <form onSubmit={handleApplyCoupon} className="space-y-1.5 pt-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="كود الخصم (مثل SALE10)"
                      className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-emerald-500 transition-colors uppercase font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    تطبيق
                  </button>
                </div>
                {couponSuccess && (
                  <p className="text-[10px] text-emerald-600 font-bold">{couponSuccess}</p>
                )}
                {couponError && <p className="text-[10px] text-red-500 font-bold">{couponError}</p>}
              </form>

              {/* Customer Details Form */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <span className="text-xs font-bold text-slate-800 block">بيانات استلام الطلب</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="الاسم بالكامل *"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-emerald-500"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="رقم الهاتف للتواصل وتأكيد الطلب *"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="عنوان التوصيل أو الفرع المطلوب *"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-emerald-500"
                />
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="ملاحظات إضافية على الطلب (اختياري)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-emerald-500 resize-none"
                />

                {/* Payment Method */}
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    طريقة الدفع
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-2 rounded-lg border text-center text-xs font-bold cursor-pointer transition-all ${
                        paymentMethod === 'cod'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      💵 عند الاستلام
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('whatsapp')}
                      className={`p-2 rounded-lg border text-center text-xs font-bold cursor-pointer transition-all ${
                        paymentMethod === 'whatsapp'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      💬 واتساب مباشر
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer & Submit Action */}
        {!checkoutCompleted && items.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-white space-y-3">
            {/* Price Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>المجموع الفرعي</span>
                <span className="font-semibold">{formatPrice(rawSubtotal)}</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>خصم الكوبون ({appliedDiscount * 100}%)</span>
                  <span>- {formatPrice(discountAmount)}</span>
                </div>
              )}
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
              disabled={isCheckingOut}
              onClick={handleCheckoutSubmit}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isCheckingOut ? (
                <span>جاري إرسال الطلب...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد وإرسال الطلب ({formatPrice(finalTotal)})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
