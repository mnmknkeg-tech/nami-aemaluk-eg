'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ShoppingBag,
  MapPin,
  CreditCard,
  Loader2,
  CheckCircle,
  Store,
  Truck,
  Banknote,
  UserRound,
} from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/utils';
import { isSessionActive, jsonRequest } from '@/lib/api';
import { LocationPicker } from '@/components/LocationPicker';
import { playOrderNotifSound } from '@/lib/sounds';

export default function CheckoutPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const { items, totalItems, totalPrice, itemsByShop, clearCart } = useCart();

  // Compact replacement for the market navbar, which is intentionally not
  // rendered on /checkout (see AppChrome). Keeps a clear way back and a
  // constant reminder of what is being ordered.
  const checkoutHeader = (title: string, count?: number) => (
    <header className="sticky top-0 z-[60] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-brand-cyan transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          رجوع
        </button>
        <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <h1 className="text-sm md:text-base font-black text-slate-900 dark:text-white">{title}</h1>
        {typeof count === 'number' && count > 0 && (
          <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <ShoppingBag className="w-4 h-4" />
            {count} منتج
          </span>
        )}
      </div>
    </header>
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  /** Phone stored on the logged-in account — offered as one-tap picks. */
  const [accountProfile, setAccountProfile] = useState<{
    name?: string;
    phone?: string;
    extraPhones?: string[];
  } | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const shopGroups = itemsByShop();

  // Prefill name/phone from the logged-in account so returning customers
  // don't retype them — the chips below the phone field restore them too.
  useEffect(() => {
    if (!isSessionActive()) return;
    jsonRequest<any>('/users/me')
      .then((body) => {
        const user = body?.data || body?.user || body;
        const profile = {
          name: user?.name || undefined,
          phone: user?.phone || undefined,
          extraPhones: Array.isArray(user?.extraPhones) ? user.extraPhones : [],
        };
        if (!profile.name && !profile.phone) return;
        setAccountProfile(profile);
        setCustomerName((prev) => prev || profile.name || '');
        setPhone((prev) => prev || profile.phone || '');
      })
      .catch(() => {});
  }, []);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);
    setError('');

    try {
      // Guest checkout: visitors without an account order via the public endpoint.
      const isGuest = !isSessionActive();
      const endpoint = isGuest ? '/orders/public' : '/orders';

      const orders: any[] = [];
      const shopEntries = Object.entries(shopGroups);

      for (const [shopId, shopItems] of shopEntries) {
        const shopTotal = shopItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const order = await jsonRequest<any>(endpoint, {
          method: 'POST',
          body: JSON.stringify({
            shopId,
            items: shopItems.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
            customer: {
              name: customerName || undefined,
              phone: phone || undefined,
              city: city || undefined,
              district: district || undefined,
              address: address || undefined,
              notes: notes || undefined,
              lat: coords?.lat,
              lng: coords?.lng,
            },
            customerPhone: phone || undefined,
            deliveryAddressManual:
              [city, district, address].filter(Boolean).join('، ') || undefined,
            deliveryLat: coords?.lat,
            deliveryLng: coords?.lng,
            deliveryNote: notes || undefined,
            paymentMethod: paymentMethod === 'cod' ? 'COD' : 'CARD',
            total: shopTotal,
            source: 'marketplace',
          }),
        }).catch((err) => {
          throw new Error(err?.message || `فشل إنشاء الطلب من ${shopItems[0]?.shopName}`);
        });

        orders.push(order);
      }

      clearCart();
      setSuccess({ orders, count: orders.length });
      playOrderNotifSound();
    } catch (err: any) {
      setError(err?.message || 'فشل إنشاء الطلب');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/40">
        {checkoutHeader('تم الطلب')}
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold mb-3">تم إنشاء طلبك بنجاح!</h2>
          <p className="text-slate-500 font-semibold mb-8">
            {success.count > 1
              ? `تم إنشاء ${success.count} طلبات من متاجر مختلفة`
              : 'سيتم التواصل معك قريباً لتأكيد الطلب'}
          </p>
          <div className="space-y-3 mb-8">
            {success.orders.map((o: any) => (
              <div
                key={String(o?.id || Math.random())}
                className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-brand-purple" />
                  <div className="text-right">
                    <div className="font-bold text-sm">
                      طلب #
                      {String(o?.id || o?.orderNumber || '')
                        .slice(0, 8)
                        .toUpperCase()}
                    </div>
                    <div className="text-xs text-slate-500">
                      {o?.shopName || o?.shop?.name || ''}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/track/${o?.id || o?.orderNumber || ''}`}
                  className="text-brand-cyan font-bold text-sm hover:underline"
                >
                  تتبع الطلب
                </Link>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-brand-gradient text-white font-bold text-sm"
            >
              العودة للرئيسية
            </Link>
            <Link
              href="/dalil"
              className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-sm"
            >
              متابعة التسوق
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/40">
        {checkoutHeader('إتمام الطلب')}
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
          <ShoppingBag className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">سلتك فارغة</h2>
          <p className="text-slate-500 font-semibold mb-6">أضف منتجات قبل إتمام الطلب</p>
          <Link
            href="/dalil"
            className="px-6 py-3 rounded-xl bg-brand-gradient text-white font-bold text-sm"
          >
            تصفح المتاجر
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/40">
      {checkoutHeader('إتمام الطلب', totalItems)}

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-10">
        <form
          ref={formRef}
          onSubmit={handlePlaceOrder}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8"
        >
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Info */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold mb-5">
                <MapPin className="w-5 h-5 text-brand-cyan" />
                بيانات التوصيل
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    الاسم الكامل *
                  </label>
                  <input
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 font-semibold text-sm outline-none focus:border-brand-cyan transition-colors"
                    placeholder="الاسم"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    رقم الهاتف *
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 font-semibold text-sm outline-none focus:border-brand-cyan transition-colors"
                    placeholder="01xxxxxxxxx"
                  />
                  {(() => {
                    const savedPhones = [
                      ...(accountProfile?.phone ? [accountProfile.phone] : []),
                      ...(accountProfile?.extraPhones || []),
                    ].filter((p) => p && p !== phone);
                    if (savedPhones.length === 0) return null;
                    return (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {savedPhones.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setPhone(p);
                              if (accountProfile?.name)
                                setCustomerName((prev) => prev || accountProfile.name!);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-brand-cyan/40 bg-brand-cyan/5 text-[11px] font-bold text-brand-cyan hover:bg-brand-cyan/10 transition-colors"
                          >
                            <UserRound className="w-3 h-3" />
                            <span dir="ltr">{p}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">المدينة *</label>
                  <input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 font-semibold text-sm outline-none focus:border-brand-cyan transition-colors"
                    placeholder="القاهرة، الإسكندرية..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">المنطقة</label>
                  <input
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 font-semibold text-sm outline-none focus:border-brand-cyan transition-colors"
                    placeholder="المنطقة / الحي"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    العنوان بالتفصيل *
                  </label>
                  <textarea
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 font-semibold text-sm outline-none focus:border-brand-cyan transition-colors resize-none"
                    placeholder="الشارع، رقم المبنى، الشقة..."
                  />
                </div>
                <div className="md:col-span-2">
                  <LocationPicker
                    initialCoords={coords}
                    onLocationSelect={(lat, lng) => setCoords({ lat, lng })}
                    onAddressResolved={(addr) => {
                      if (addr.city) setCity(addr.city);
                      if (addr.district) setDistrict(addr.district);
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 font-semibold text-sm outline-none focus:border-brand-cyan transition-colors resize-none"
                    placeholder="أي ملاحظات إضافية..."
                  />
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold mb-5">
                <Banknote className="w-5 h-5 text-brand-cyan" />
                طريقة الدفع
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl border-2 border-brand-cyan bg-brand-cyan/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-cyan/10 flex items-center justify-center">
                      <Banknote className="w-6 h-6 text-brand-cyan" />
                    </div>
                    <div>
                      <span className="font-bold text-sm block">الدفع عند الاستلام (COD)</span>
                      <span className="text-xs text-slate-500">
                        ادفع نقداً للمندوب عند استلام طلبك ومطابقته
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-cyan/20 text-brand-cyan">
                    مفعل
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50 dark:bg-slate-800/40 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <span className="font-bold text-sm block text-slate-500">
                        البطاقات البنكية والدفع الإلكتروني
                      </span>
                      <span className="text-xs text-slate-400">
                        فيزا / ماستركارد / ميزة / محافظ إلكترونية
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500">
                    قريباً
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 sticky top-20">
              <h2 className="text-lg font-bold mb-5">ملخص الطلب</h2>

              {/* Items by shop */}
              <div className="space-y-4 mb-5 max-h-[300px] overflow-y-auto">
                {Object.entries(shopGroups).map(([shopId, shopItems]) => (
                  <div key={shopId}>
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <Store className="w-4 h-4 text-brand-purple" />
                      <span className="font-bold text-xs text-slate-600 dark:text-slate-400">
                        {shopItems[0].shopName}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {shopItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs line-clamp-1">{item.name}</p>
                            <p className="text-xs text-slate-500">
                              {item.quantity} × {formatPrice(item.price)}
                            </p>
                          </div>
                          <span className="font-bold text-xs">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-sm font-semibold text-slate-500">
                  <span>عدد المنتجات</span>
                  <span>{totalItems}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-slate-500">
                  <span>الشحن</span>
                  <span className="text-green-500">يُحدد لاحقاً</span>
                </div>
                <div className="flex justify-between text-lg font-black pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>الإجمالي</span>
                  <span className="text-brand-cyan">{formatPrice(totalPrice)}</span>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 rounded-xl text-red-500 text-xs font-bold text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="hidden lg:w-full mt-5 py-4 bg-brand-gradient text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60 lg:flex"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                {loading ? 'جاري إنشاء الطلب...' : 'تأكيد الطلب'}
              </button>

              <Link
                href="/dalil"
                className="w-full mt-3 py-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-cyan transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                متابعة التسوق
              </Link>
            </div>
          </div>
        </form>
      </div>

      {/* شريط دفع ثابت للموبايل: الإجمالي وزر التأكيد يفضلوا ظاهرين طول
          وقت إدخال البيانات بدل ما الليزر يوصل بعيد عن الشاشة. */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-[70] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] pb-[env(safe-area-inset-bottom)]">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-slate-500">الإجمالي</span>
            <span className="text-base font-black text-brand-cyan leading-tight">
              {formatPrice(totalPrice)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={loading}
            className="mr-auto flex-1 py-3.5 bg-brand-gradient text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {loading ? 'جاري إنشاء الطلب...' : `تأكيد الطلب (${totalItems})`}
          </button>
        </div>
      </div>

      {/* مساحة احتياطية حتى لا يغطي الشريط الثابت آخر حقل في النموذج */}
      <div className="lg:hidden h-24" aria-hidden="true" />
    </div>
  );
}
