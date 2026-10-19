import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Tag,
  CreditCard,
  Building2,
  Globe2,
  Store,
  Layers,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';

export interface CartDrawerProps {
  contained?: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ contained = false }) => {
  const {
    website,
    isCartOpen,
    setIsCartOpen,
    cartItems,
    cartTotal,
    cartCount,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartMode,
    setCartMode,
    currentTenant,
    switchPage,
    isRtl,
  } = useBuilder();

  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [placedOrderNumber, setPlacedOrderNumber] = useState('');

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    setCouponSuccess(null);

    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'ALMAJD10' || code === 'VIP10' || code === 'SALE10') {
      setAppliedDiscount(0.1);
      setCouponSuccess('تم تطبيق كود الخصم (10%) بنجاح!');
    } else if (code === 'VIP20') {
      setAppliedDiscount(0.2);
      setCouponSuccess('تم تطبيق كود الخصم الحصري (20%) بنجاح!');
    } else {
      setCouponError('كود الخصم غير صحيح أو منتهي الصلاحية');
    }
  };

  const discountAmount = cartTotal * appliedDiscount;
  const subtotalAfterDiscount = cartTotal - discountAmount;
  const vatAmount = subtotalAfterDiscount * 0.15;
  const finalTotal = subtotalAfterDiscount + vatAmount;

  const handleCheckoutSubmit = () => {
    setIsCheckingOut(true);
    const orderNumber = '#' + Math.floor(100000 + Math.random() * 900000);
    setPlacedOrderNumber(orderNumber);

    const newOrder = {
      id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      orderNumber,
      source: 'website',
      status: 'pending',
      createdAt: new Date().toISOString(),
      tenantId: currentTenant.id,
      shopName: currentTenant.businessInfo?.brandName || website.name,
      items: [...cartItems],
      total: Math.round(finalTotal),
      subtotal: cartTotal,
      discount: discountAmount,
      tax: vatAmount,
      paymentMethod: 'cash_on_delivery',
      customer: {
        name: customerName || 'عميل المتجر الإلكتروني',
        phone: customerPhone || currentTenant.businessInfo?.phone || '',
        address: customerAddress || 'استلام / توصيل سريع',
      },
    };

    // Save to merchant's local orders list
    try {
      const storageKey = `ray_merchant_orders_${currentTenant.id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.unshift(newOrder);
      localStorage.setItem(storageKey, JSON.stringify(existing));

      // Trigger order event for order bell in dashboard
      window.dispatchEvent(new CustomEvent('ray_new_website_order', { detail: newOrder }));
    } catch (e) {
      console.warn('Failed to save website order locally', e);
    }

    setTimeout(() => {
      setIsCheckingOut(false);
      setCheckoutCompleted(true);
    }, 1000);
  };

  const resetAndClose = () => {
    if (checkoutCompleted) {
      clearCart();
      setCheckoutCompleted(false);
      setAppliedDiscount(0);
      setCouponCode('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
    }
    setIsCartOpen(false);
  };

  const merchantWaPhone = (currentTenant.businessInfo?.whatsappNumber || currentTenant.businessInfo?.phone || '').replace(/\D/g, '');
  const waOrderLink = merchantWaPhone
    ? `https://wa.me/${merchantWaPhone.startsWith('20') ? merchantWaPhone : '20' + merchantWaPhone}?text=${encodeURIComponent(
        `مرحباً، تم تأكيد الطلب رقم ${placedOrderNumber} بقيمة ${Math.round(finalTotal)} ج.م من موقع ${currentTenant.businessInfo?.brandName}:\n` +
          cartItems.map((i) => `• ${i.title || (i as any).name} (الكمية: ${i.quantity}) - ${i.price * i.quantity} ج.م`).join('\n') +
          `\nالاسم: ${customerName || 'عميل الموقع'}\nالهاتف: ${customerPhone || 'غير محدد'}\nالعنوان: ${customerAddress || 'غير محدد'}`
      )}`
    : null;

  return (
    <div
      className={`${
        contained
          ? 'absolute inset-0 z-50 overflow-hidden pointer-events-auto'
          : 'fixed inset-0 z-[9999]'
      } flex justify-end animate-in fade-in duration-200`}
    >
      {/* Dark backdrop */}
      <div
        onClick={resetAndClose}
        className={`${
          contained ? 'absolute inset-0' : 'fixed inset-0'
        } bg-slate-950/60 backdrop-blur-xs transition-opacity`}
      />

      {/* Slide-over Panel */}
      <div
        style={{ direction: isRtl ? 'rtl' : 'ltr' }}
        className="relative z-10 w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden text-slate-900 animate-in slide-in-from-right duration-300"
      >
        {/* Cart Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900">سلة المشتريات والحجوزات</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white">
                  {cartCount}
                </span>
              </div>
              <p className="text-xs text-slate-500">{currentTenant.businessInfo.brandName}</p>
            </div>
          </div>

          <button
            onClick={resetAndClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual Mode Switcher Banner */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 to-blue-950 text-white text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {cartMode === 'standalone' ? (
              <Store className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Globe2 className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span className="font-medium">
              {cartMode === 'standalone' ? 'وضع السلة المستقلة للمتجر' : 'وضع السلة الموحدة للمنصة'}
            </span>
          </div>

          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setCartMode('standalone')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                cartMode === 'standalone'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              مستقلة
            </button>
            <button
              onClick={() => setCartMode('unified')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                cartMode === 'unified'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>موحدة</span>
              <span className="px-1 py-0.2 bg-amber-400 text-slate-900 rounded-[3px] text-[8px] font-black">قريباً</span>
            </button>
          </div>
        </div>

        {/* Mode Explanation Notice */}
        {cartMode === 'unified' ? (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>تطبيق راي الموحد قيد التطوير:</strong> يتم حالياً استقبال ومعالجة كافة طلبات موقعك عبر السلة المستقلة لتصلك مباشرة في لوحة التحكم.
            </span>
          </div>
        ) : (
          <div className="px-4 py-1.5 bg-emerald-50/70 border-b border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>سلة مستقلة وبوابة مبيعات حصرية لمتجر {currentTenant.businessInfo?.brandName || website.name}.</span>
          </div>
        )}

        {/* Cart Body */}
        {checkoutCompleted ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-black text-slate-900">تم تأكيد طلب الحجز والدفع بنجاح!</h4>
            <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
              رقم المرجع: <strong>#{Math.floor(100000 + Math.random() * 900000)}</strong>
              <br />
              تم إرسال إشعار فوري إلى لوحة تحكم التاجر وتفاصيل الفاتورة الإلكترونية عبر الواتساب والبريد.
            </p>
            <button
              onClick={resetAndClose}
              className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-md"
            >
              متابعة التصفح
            </button>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-800 text-base">سلة مشترياتك فارغة حالياً</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                استكشف أحدث تشكيلة من أسطول السيارات والمنتجات الفاخرة وأضفها لسلتك بضغطة زر.
              </p>
            </div>
            <button
              onClick={() => {
                switchPage('page_fleet');
                setIsCartOpen(false);
              }}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
            >
              تصفح أسطول المعرض
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
            {cartItems.map((item) => (
              <div key={item.id} className="pt-3 first:pt-0 flex gap-3 items-start group">
                <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <h5 className="text-xs font-bold text-slate-900 truncate leading-snug">
                      {item.title}
                    </h5>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      title="حذف من السلة"
                      className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {item.badge && (
                    <span className="inline-block text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}

                  <div className="text-xs font-extrabold text-blue-700 font-mono">
                    {item.priceFormatted || `${item.price.toLocaleString()} ج.م`}
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                      <button
                        onClick={() => updateCartQuantity(item.id, -1)}
                        className="p-1 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                        title="تقليل الكمية"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 text-xs font-bold text-slate-800 font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.id, 1)}
                        className="p-1 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                        title="زيادة الكمية"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      الإجمالي: {(item.price * item.quantity).toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer & Checkout (Only shown when items exist and not completed) */}
        {cartItems.length > 0 && !checkoutCompleted && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/90 space-y-3 shrink-0">
            {/* Coupon Code Form */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="كود الخصم (جرب ALMAJD10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 uppercase font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                تطبيق
              </button>
            </form>

            {couponSuccess && (
              <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {couponSuccess}
              </p>
            )}
            {couponError && (
              <p className="text-[11px] text-red-500 font-medium">
                {couponError}
              </p>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs pt-1 border-t border-slate-200/80">
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي:</span>
                <span className="font-mono font-bold">{cartTotal.toLocaleString()} ج.م</span>
              </div>

              {appliedDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>الخصم ({appliedDiscount * 100}%):</span>
                  <span className="font-mono">-{discountAmount.toLocaleString()} ج.م</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>ضريبة القيمة المضافة (15%):</span>
                <span className="font-mono">{vatAmount.toLocaleString()} ج.م</span>
              </div>

              <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
                <span>المبلغ الإجمالي المستحق:</span>
                <span className="font-mono text-blue-700 text-base">
                  {Math.round(finalTotal).toLocaleString()} ج.م
                </span>
              </div>
            </div>

            {/* Payment simulator methods */}
            <div className="flex items-center justify-center gap-2 py-1 text-[10px] text-slate-500">
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold">مدى Mada</span>
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold">Apple Pay</span>
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold">تمارا 4 دفعات</span>
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold">Visa / MC</span>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleCheckoutSubmit}
              disabled={isCheckingOut}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isCheckingOut ? (
                <span className="animate-pulse">جاري معالجة الطلب والدفع...</span>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {cartMode === 'standalone' ? 'متابعة الدفع وحجز الطلب' : 'ترحيل الطلب للسلة الموحدة'}
                  </span>
                  <span className="font-mono font-normal opacity-80">
                    ({Math.round(finalTotal).toLocaleString()} ج.م)
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
