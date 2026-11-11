'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Search, ArrowRight, Info } from 'lucide-react';

/**
 * صفحة تتبع الطلب بدون رقم — بدل ما /track ترجع 404،
 * بنطلب من المستخدم يدخل رقم طلبه ونجيبله حالته فوراً.
 * التتبع نفسه عام (Guest-friendly) عبر /orders/public/:id.
 */
export default function TrackLandingPage() {
  const router = useRouter();
  const [orderRef, setOrderRef] = useState('');
  const trimmed = orderRef.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    router.push(`/track/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4 py-16 pb-28 md:pb-16">
      <div className="w-full max-w-lg">
        {/* الكت الرئيسية */}
        <div className="animate-fade-up relative bg-brand-black text-white rounded-3xl p-8 md:p-10 overflow-hidden shadow-2xl shadow-brand-cyan/10">
          {/* توهّج ناعم بهوية المنصة */}
          <div
            aria-hidden
            className="absolute top-0 right-0 w-[320px] h-[320px] bg-brand-cyan/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"
          />
          <div
            aria-hidden
            className="absolute bottom-0 left-0 w-[280px] h-[280px] bg-brand-purple/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3 pointer-events-none"
          />

          <div className="relative z-10">
            {/* أيقونة */}
            <div className="animate-fade-up w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-brand-cyan/25 mb-6">
              <Package className="w-8 h-8 text-white" />
            </div>

            <h1
              className="animate-fade-up text-2xl md:text-3xl font-bold tracking-tight"
              style={{ animationDelay: '80ms' }}
            >
              تتبّع طلبك
            </h1>
            <p
              className="animate-fade-up text-white/60 font-semibold text-sm leading-relaxed mt-2 mb-8"
              style={{ animationDelay: '140ms' }}
            >
              اكتب رقم الطلب اللي وصلك في رسالة التأكيد، وهنوريك حالته لحظة بلحظة — من غير ما تسجّل
              دخول.
            </p>

            {/* فورم الإدخال */}
            <form
              onSubmit={submit}
              className="animate-fade-up space-y-3"
              style={{ animationDelay: '200ms' }}
            >
              <label htmlFor="order-ref" className="sr-only">
                رقم الطلب
              </label>
              <input
                id="order-ref"
                type="text"
                inputMode="text"
                dir="ltr"
                value={orderRef}
                onChange={(e) => setOrderRef(e.target.value)}
                placeholder="مثال: 1234ABCD أو رقم الطلب كامل"
                autoComplete="off"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-white font-semibold text-sm focus:bg-white/10 focus:border-brand-cyan outline-none transition-all placeholder:text-white/30 text-left"
              />
              <button
                type="submit"
                disabled={!trimmed}
                className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gradient text-white font-black text-sm shadow-lg shadow-brand-cyan/25 transition-all hover:shadow-xl hover:shadow-brand-cyan/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <Search className="w-4 h-4" />
                تتبّع الطلب الآن
              </button>
            </form>
          </div>
        </div>

        {/* تلميحات تحت */}
        <div className="animate-fade-up mt-5 space-y-3" style={{ animationDelay: '280ms' }}>
          <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Info className="w-5 h-5 text-brand-cyan shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
              رقم الطلب بيوصلك في رسالة تأكيد الطلب، وتقدر كمان تلاقي كل طلباتك مع أرقامها في صفحة
              <Link
                href="/profile/orders"
                className="text-brand-cyan font-bold hover:underline inline-flex items-center gap-1 mx-1"
              >
                طلباتي
                <ArrowRight className="w-3 h-3 rotate-180" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
