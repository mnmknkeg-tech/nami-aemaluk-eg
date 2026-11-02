'use client';

import React, { useState } from 'react';
import {
  Store,
  TrendingUp,
  Building2,
  Check,
  X,
  ArrowLeft,
  Sparkles,
  Zap,
  ShieldCheck,
  Smartphone,
  Receipt,
  Package,
  Truck,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { Language } from '@/nammy/types';
import { BEFORE_AFTER_DATA, THREE_STEPS } from '@/nammy/landingData';
import { MEN_MAKANAK_LIVE } from '@/nammy/menMakanak';

interface HomePageViewProps {
  lang: Language;
  onOpenDemo: (ctx?: string) => void;
}

export const HomePageView: React.FC<HomePageViewProps> = ({ lang, onOpenDemo }) => {
  const isAr = lang === 'ar';
  const comparison = BEFORE_AFTER_DATA[lang];
  const steps = THREE_STEPS[lang];
  const [activeSimulatorTab, setActiveSimulatorTab] = useState<'pos' | 'stock' | 'shipping'>('pos');

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {/* Creative Identity Banner for Egyptian Merchants */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-b border-slate-200/80 pb-3 text-start">
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs font-bold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>
            {isAr
              ? 'منظومة نقاط البيع وإدارة المتاجر المصممة للسوق المصري 🇪🇬'
              : 'Point of Sale & Retail OS Tailored for Egypt 🇪🇬'}
          </span>
        </div>

        <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
          <span>⚡ {isAr ? 'كاشير سحابي سريع' : 'Sub-second POS'}</span>
          <span>•</span>
          <span>🧾 {isAr ? 'معتمد من الضرائب ETA' : 'ETA Compliant'}</span>
          <span>•</span>
          <span>📦 {isAr ? 'مخزن متزامن' : 'Live Stock'}</span>
        </div>
      </div>

      {/* Human, PostHog-inspired Hero Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-1">
        {/* Main Hero Copy with Highlighter Pen Accents */}
        <div className="lg:col-span-7 space-y-4 text-start">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.2]">
            {isAr ? (
              <>
                تجارتك{' '}
                <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                  على أرض الواقع
                </span>
                .. <br />
                وإدارتها{' '}
                <span className="bg-sky-100 text-sky-950 px-2 py-0.5 rounded-lg border-b-2 border-sky-400 inline-block">
                  في إيدك.
                </span>
              </>
            ) : (
              <>
                Your business in the{' '}
                <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                  real world
                </span>
                .. <br />
                managed right{' '}
                <span className="bg-sky-100 text-sky-950 px-2 py-0.5 rounded-lg border-b-2 border-sky-400 inline-block">
                  in your hands.
                </span>
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
            {isAr ? (
              <>
                من أول محل في وسط البلد أو التجمع.. لأكبر شبكة فروع في المحافظات. أدوات حقيقية
                تساعدك{' '}
                <mark className="bg-emerald-100/90 text-emerald-950 px-1.5 py-0.5 rounded font-bold">
                  تبيع، تدير، وتتابع
                </mark>{' '}
                مخزونك ومبيعاتك وفروعك في مكان واحد وبشكل لحظي.
              </>
            ) : (
              <>
                From your first storefront in Cairo to a multi-branch nationwide chain. Everything
                you need to{' '}
                <mark className="bg-emerald-100/90 text-emerald-950 px-1.5 py-0.5 rounded font-bold">
                  sell, operate, and track
                </mark>{' '}
                inventory and cashiers in one live dashboard.
              </>
            )}
          </p>

          <p className="text-xs text-slate-500 font-medium">
            {isAr
              ? 'ابدأ اليوم بدون أي التزام مالي أو بطاقة ائتمانية — دعم مصري كامل.'
              : 'Get started today with zero commitments or credit cards — tailored for Egypt.'}
          </p>
        </div>

        {/* Human Tactile Conversion Card */}
        <div className="lg:col-span-5">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xl space-y-4 relative overflow-hidden text-start">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-100/70 to-transparent rounded-bl-full pointer-events-none" />

            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-700 block">
                {isAr ? 'التسجيل السريع' : 'Instant Setup'}
              </span>
              <h3 className="text-lg font-black text-slate-900">
                {isAr ? 'ابدأ مجانًا بالكامل' : 'Start completely free'}
              </h3>
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>
                  {isAr
                    ? 'تجربة حية فورية بدون بطاقة بنكية'
                    : 'Instant live demo with zero credit cards'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>
                  {isAr
                    ? 'فواتير وإيصالات متوافقة مع مصلحة الضرائب ETA'
                    : 'ETA e-invoicing & e-receipt compliant'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>
                  {isAr
                    ? 'ربط الكاشير والمخزن في أقل من 3 دقائق'
                    : 'Setup wizard installs POS in 3 minutes'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => onOpenDemo(isAr ? 'بدء تجربة مجانية فورية' : 'Instant Free Trial')}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm shadow-[0_3px_0_rgba(180,83,9,1)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              >
                {isAr ? 'ابدأ الآن مجانًا' : 'Get Started'}
              </button>

              <button
                onClick={() =>
                  onOpenDemo(isAr ? 'تحدث مع مستشار أعمال' : 'Talk with Retail Advisor')
                }
                className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
              >
                {isAr ? 'تحدث مع مستشار تجاري' : 'Talk with an advisor'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PostHog Interactive Operations Terminal Simulator (Exact match to Image 2: "Ship with PostHog") */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-5 text-start">
        {/* Simulator Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSimulatorTab('pos')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSimulatorTab === 'pos'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isAr ? '⚡ حركة الكاشير والطلبات الحية' : '⚡ Live POS & Receipts'}
            </button>

            <button
              onClick={() => setActiveSimulatorTab('stock')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSimulatorTab === 'stock'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isAr ? '📦 إشعارات المخزن ونواقص الرف' : '📦 Shelf & Stock Alerts'}
            </button>

            <button
              onClick={() => setActiveSimulatorTab('shipping')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSimulatorTab === 'shipping'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isAr ? '🛵 الشحن والدفع (إنستاباي وفوري)' : '🛵 Delivery & Payouts'}
            </button>
          </div>

          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {isAr ? 'مزامنة لحظية حية' : 'Live Syncing'}
          </span>
        </div>

        {/* Simulator Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Feed of real-time tickets with P1, P2 badges */}
          <div className="lg:col-span-7 space-y-3">
            {activeSimulatorTab === 'pos' && (
              <>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 hover:border-amber-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      P1 كاشير مباشر
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      منذ لحظات • فرع المعادي
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">
                    تم إصدار فاتورة بيع #INV-2043 بقيمة 850 ج.م
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    تم الخصم الفوري لـ 2 قطعة من المخزن وتأكيد الدفع عبر إنستاباي، والتوثيق التلقائي
                    في مصلحة الضرائب.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 hover:border-amber-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                      P2 طلب أونلاين
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      منذ 3 دقائق • متجر الويب
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">
                    أوردر جديد #ORD-1092 بالدفع عند الاستلام (COD)
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    العميل من التجمع الخامس، تم حجز الكمية تلقائياً وطباعة بوليصة الشحن بنقرة واحدة.
                  </p>
                </div>

                {MEN_MAKANAK_LIVE && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 hover:border-amber-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                        P3 تطبيق من مكانك
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        منذ 7 دقائق • عميل محيط
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900">
                      زيارة واستلام من الفرع عبر خريطة المتجر
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      زبون وصل للفرع من خلال تفعيل العرض الترويجي المحيط، وسدد عبر فودافون كاش.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeSimulatorTab === 'stock' && (
              <>
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
                      تنبيه نقص صنف
                    </span>
                    <span className="text-[10px] text-rose-700 font-bold">باقي 2 قطعة فقط</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">
                    «قميص لينين أبيض مقاس L» قارب على النفاد
                  </h4>
                  <p className="text-[11px] text-slate-700">
                    تم إنشاء مسودة أمر توريد تلقائي من المستودع الرئيسي لتفادي ضياع أي بيعة.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                      جرد فوري
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">مطابق 100%</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">
                    جرد شيفت المساء - فرع مصر الجديدة
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    تمت مطابقة 148 عملية بيع مع الرصيد الفعلي بدون وجود أي عجز مالي أو بضاعة مفقودة.
                  </p>
                </div>
              </>
            )}

            {activeSimulatorTab === 'shipping' && (
              <>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
                      تحصيل إلكتروني
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">تم الإيداع</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">
                    تسوية نقدية عبر إنستاباي ومحافظ المحمول
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    إجمالي المدفوعات الرقمية لليوم: 14,850 ج.م محولة مباشرة لحساب البنك بدون تأخير.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-300">
                      شحن محافظات
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">بوليصة #EGY-8921</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">
                    تم تسليم 12 طرد لشركة الشحن متجهة للإسكندرية وطنطا
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    إشعار تلقائي للعملاء برقم التتبع وتأكيد معاينة الطرد قبل الاستلام.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Right: Side Explainer Panel (Like in PostHog Image 2) */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-start">
            <h3 className="font-black text-lg text-slate-900 leading-tight">
              {isAr ? 'شغّل متجرك بنظام الإدارة الذاتي' : 'Run on the Self-Operating Retail OS'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isAr
                ? 'لوحة تحكم واحدة تجمع حركة الكاشير، إشعارات المخزن، وتوصيل الطلبات لحظة بلحظة بدون لخبطة دفاتر أو برامج متفرقة.'
                : 'Your central hub clusters POS transactions, inventory depleted per scan, and automated courier dispatches in real-time.'}
            </p>

            <button
              onClick={() => onOpenDemo(isAr ? 'تجربة المحاكي الحي' : 'Live Simulator Trial')}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-[0_3px_0_rgba(180,83,9,1)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              {isAr ? 'ابدأ التجربة المجانية الآن' : 'Get Started — Free'}
            </button>

            <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
              <span className="text-[11px] font-black text-slate-400 block uppercase">
                {isAr ? 'الإشارات الحية المربوطة:' : 'Connected Real-Time Signals:'}
              </span>
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <Zap size={14} className="text-amber-500 shrink-0" />
                <span>{isAr ? 'سرعة كاشير أقل من ثانية' : 'Sub-second checkout velocity'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <Package size={14} className="text-emerald-500 shrink-0" />
                <span>
                  {isAr
                    ? 'خصم المخزون التلقائي من الرف'
                    : 'Instant shelf-level inventory deduction'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <Receipt size={14} className="text-indigo-500 shrink-0" />
                <span>
                  {isAr
                    ? 'الفاتورة والإيصال الإلكتروني ETA'
                    : 'Egyptian Tax Authority (ETA) compliance'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <CreditCard size={14} className="text-rose-500 shrink-0" />
                <span>
                  {isAr ? 'إنستاباي، فوري، ومحافظ المحمول' : 'InstaPay, Fawry & Mobile Wallets'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section: رحلة نموّك */}
      <div className="space-y-6 pt-6 border-t border-slate-200/80">
        <div className="text-start space-y-1">
          <span className="text-xs font-black text-amber-600 uppercase tracking-wider">
            {isAr ? 'رحلة نموّك' : 'Your Growth Path'}
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900">
            {isAr
              ? 'مهما كانت تجارتك النهارده.. إحنا جاهزين لبكرة.'
              : 'Wherever your business stands today.. we are ready for tomorrow.'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            {isAr
              ? 'من أول عملية بيع.. لأكبر فرع. من محل واحد.. لمنظومة كاملة. ابدأ من مكانك الحالي وكبَّر واحنا معاك.'
              : 'From your first physical sale to multi-store rollout. Start right where you are.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-start">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2 hover:border-amber-400 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Store size={20} />
            </div>
            <h3 className="font-black text-base text-slate-900">
              {isAr ? 'أول محل' : 'First Shop'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isAr
                ? 'ابدأ صح من أول فاتورة، ونظّم شغلك من اليوم الأول.'
                : 'Start clean from bill #1, and streamline your workflow right from day one.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border-2 border-indigo-500 shadow-sm space-y-2 relative">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-black text-base text-slate-900">
              {isAr ? 'تجارة بتتوسع' : 'Expanding Footprint'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isAr
                ? 'فروع أكتر، منتجات أكتر، عملاء أكتر.. وإدارة أسهل.'
                : 'More branches, broader catalog, larger clientele, yet simpler oversight.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2 hover:border-violet-400 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Building2 size={20} />
            </div>
            <h3 className="font-black text-base text-slate-900">
              {isAr ? 'بزنس على مستوى أكبر' : 'Enterprise Chain'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isAr
                ? 'تحكّم في عملياتك وفروعك وبياناتك من مكان واحد.'
                : 'Centralized governance across all store locations, terminals, and ERP.'}
            </p>
          </div>
        </div>
      </div>

      {/* Section: الفرق واضح (قبل وبعد) */}
      <div className="space-y-6 pt-6 border-t border-slate-200/80">
        <div className="text-start space-y-1">
          <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">
            {comparison.title}
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900">{comparison.subtitle}</h2>
          <p className="text-xs sm:text-sm text-slate-600">{comparison.desc}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-start">
          {/* بعد نمّي */}
          <div className="p-6 rounded-3xl bg-emerald-50/80 border-2 border-emerald-300 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-black text-base">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <Check size={14} strokeWidth={3} />
              </div>
              <span>{comparison.afterTitle}</span>
            </div>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-800 font-semibold">
              {comparison.after.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* قبل نمّي */}
          <div className="p-6 rounded-3xl bg-rose-50/60 border border-rose-200 space-y-3">
            <div className="flex items-center gap-2 text-rose-900 font-black text-base">
              <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center">
                <X size={14} strokeWidth={3} />
              </div>
              <span>{comparison.beforeTitle}</span>
            </div>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 font-medium">
              {comparison.before.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Section: ابدأ في دقائق (ثلاث خطوات فقط) */}
      <div className="space-y-6 pt-6 border-t border-slate-200/80">
        <div className="text-start space-y-1">
          <span className="text-xs font-black text-amber-600 uppercase tracking-wider">
            {isAr ? 'ابدأ في دقائق' : 'Ready in Minutes'}
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900">
            {isAr ? 'ثلاث خطوات فقط من الفكرة إلى البيع' : 'Three Simple Steps to Selling'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            {isAr
              ? 'صممنا نمّي لتبدأ بسرعة وبدون أي تعقيد تقني.'
              : 'Engineered for rapid deployment without operational friction.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-start">
          {steps.map((st) => (
            <div
              key={st.step}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2"
            >
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 font-black text-sm flex items-center justify-center">
                {st.step}
              </span>
              <h3 className="font-black text-base text-slate-900">{st.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{st.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Reassurance & Call to Action */}
      <div className="p-8 rounded-3xl bg-slate-900 text-white text-center space-y-4 shadow-xl">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          {isAr
            ? 'جاهز تنقل إدارة متجرك للمستوى التالي؟'
            : 'Ready to upgrade your store management?'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
          {isAr
            ? 'انضم إلى تجار مصر الذين يديرون كاشيراتهم ومخازنهم بنظام نمّي السحابي.'
            : 'Join leading retail pioneers running cloud registers and real-time inventory on Nammy.'}
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onOpenDemo(isAr ? 'بدء الاستخدام مجاناً' : 'Get Started Free')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm shadow-[0_3px_0_rgba(180,83,9,1)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            {isAr ? 'ابدأ الآن مجانًا' : 'Get Started Free'}
          </button>
          <button
            onClick={() => onOpenDemo(isAr ? 'حجز جلسة استشارية' : 'Book Consultation')}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer border border-slate-700"
          >
            {isAr ? 'تحدث مع مستشار تجاري' : 'Talk with Specialist'}
          </button>
        </div>
      </div>
    </div>
  );
};
