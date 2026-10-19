'use client';

import React, { useState } from 'react';
import { 
  MapPin, 
  Sparkles,
  Store,
  Navigation,
  CheckCircle2,
  Users,
  Compass,
  ArrowLeft,
  ShoppingBag
} from 'lucide-react';
import { Language } from '@/nammy/types';

interface MenMakanakPageViewProps {
  lang: Language;
  onOpenDemo: (ctx?: string) => void;
}

export const MenMakanakPageView: React.FC<MenMakanakPageViewProps> = ({ lang, onOpenDemo }) => {
  const isAr = lang === 'ar';
  const [activeZone, setActiveZone] = useState<'cairo' | 'giza' | 'alex'>('cairo');

  const features = isAr ? [
    { 
      title: 'ظهور مباشر على الخريطة',
      text: 'متجرك يظهر للي حواليك على الخريطة أول ما يدوروا على منتجات تبيعها.',
      icon: MapPin,
      iconColor: 'text-amber-500'
    },
    { 
      title: 'عروض فورية للمحيطين',
      text: 'عروضك ومنتجاتك توصل لعملاء جاهزين يشتروا النهارده في محيط 5 كم من محلك.',
      icon: Sparkles,
      iconColor: 'text-rose-500'
    },
    { 
      title: 'تحويل الزيارات لمبيعات',
      text: 'كل متصفح على التطبيق بيتحول لعملية بيع حقيقية وموثقة على كاشيرك.',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500'
    },
    { 
      title: 'مزامنة الفروع والأرفف',
      text: 'اربط فروعك ومخزونك — والزبون يوصلك من أقرب فرع له متوفر فيه الصنف.',
      icon: Navigation,
      iconColor: 'text-violet-600'
    },
  ] : [
    { 
      title: 'Live Map Visibility',
      text: 'Your storefront appears on the interactive map for local shoppers searching nearby.',
      icon: MapPin,
      iconColor: 'text-amber-500'
    },
    { 
      title: 'Proximity Promotions',
      text: 'Broadcast promotions directly to customers ready to purchase within 5 km.',
      icon: Sparkles,
      iconColor: 'text-rose-500'
    },
    { 
      title: 'Foot-Traffic to Revenue',
      text: 'Convert foot-traffic discovery from the app into verified point-of-sale transactions.',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500'
    },
    { 
      title: 'Multi-Branch Proximity',
      text: 'Synchronize your branches and live stock so buyers route to their nearest location.',
      icon: Navigation,
      iconColor: 'text-violet-600'
    },
  ];

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      
      {/* Header Statement */}
      <div className="text-start space-y-3">
        <span className="text-xs font-black text-amber-600 uppercase tracking-wider">
          {isAr ? 'تطبيق من مكانك (Men Makanak)' : 'Hyperlocal Commerce Grid'}
        </span>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          {isAr ? (
            <>
              العملاء اللي حواليك.. <br />
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                بقوا زبائن دكانتك.
              </span>
            </>
          ) : (
            <>
              Shoppers right around you.. <br />
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                become your buyers.
              </span>
            </>
          )}
        </h1>

        <p className="text-sm sm:text-base text-slate-700 max-w-2xl font-medium leading-relaxed">
          {isAr
            ? '«من مكانك» يوصّل متجرك لعملاء حواليك مستعدين يشتروا — يشوفوك على الخريطة، يتصفحوا رصيد منتجاتك الحي، ويوصلوا لباب محلك أو يطلبوا دليفري فوري.'
            : 'Men Makanak connects your store to local shoppers ready to buy — they spot you on the interactive map, browse your live shelves, and walk to your doorstep.'}
        </p>
      </div>

      {/* Interactive Hyperlocal Simulation Mockup */}
      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 text-start space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <Compass size={18} />
            </span>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900">
                {isAr ? 'كيف يشاهد المتسوقون محلك في منطقتك؟' : 'How Nearby Shoppers See Your Store'}
              </h3>
              <span className="text-[11px] text-slate-500 font-bold">
                {isAr ? 'محاكاة حية لتجربة تطبيق من مكانك' : 'Live Men Makanak discovery preview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveZone('cairo')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${activeZone === 'cairo' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              {isAr ? 'القاهرة' : 'Cairo'}
            </button>
            <button
              onClick={() => setActiveZone('giza')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${activeZone === 'giza' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              {isAr ? 'الجيزة والشيخ زايد' : 'Giza & Zayed'}
            </button>
            <button
              onClick={() => setActiveZone('alex')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${activeZone === 'alex' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              {isAr ? 'الإسكندرية' : 'Alexandria'}
            </button>
          </div>
        </div>

        {/* Live Mock Discovery Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-amber-600">📍 {isAr ? 'على بُعد 850 متر' : '850m away'}</span>
              <span className="text-emerald-600 font-black">مفتوح الآن</span>
            </div>
            <h4 className="font-black text-sm text-slate-900">
              {activeZone === 'cairo' ? 'بوتيك فريدة - فرع المعادي' : activeZone === 'giza' ? 'محمصات الشيخ زايد' : 'متجر سبورت لاين - سموحة'}
            </h4>
            <p className="text-xs text-slate-600">
              {isAr ? 'متوفر 3 قطع من «فستان كتان صيفي» بمقاسك في الفرع.' : '3 items in stock for your exact size in this branch.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-rose-600">🏷️ {isAr ? 'عرض حصري للجيران' : 'Neighborhood Promo'}</span>
              <span className="text-slate-400 font-mono">ينتهي اليوم</span>
            </div>
            <h4 className="font-black text-sm text-slate-900">
              {isAr ? 'خصم 15% عند الاستلام من الفرع' : '15% Off Store Pickup'}
            </h4>
            <p className="text-xs text-slate-600">
              {isAr ? 'العميل يضغط زر الاتجاهات ويمشي لمحلك في 5 دقائق.' : 'Customer clicks directions and walks in within 5 minutes.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-indigo-600">⚡ {isAr ? 'مزامنة الكاشير' : 'POS Sync'}</span>
              <span className="text-emerald-600 font-black">فوري</span>
            </div>
            <h4 className="font-black text-sm text-slate-900">
              {isAr ? 'تحديث المخزن الفوري' : 'Live Shelf Reservation'}
            </h4>
            <p className="text-xs text-slate-600">
              {isAr ? 'حجز الصنف للعميل لمنع بيعه مرتين بالخطأ.' : 'Reserves product instantly to prevent double-selling.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-start">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div key={idx} className="group p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-start gap-3.5 bg-white hover:border-slate-300 transition-all">
              <div className="shrink-0 pt-0.5">
                <Icon size={24} strokeWidth={2.1} className={`${feat.iconColor} transition-transform group-hover:scale-110`} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-slate-900">{feat.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {feat.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-world Impact Visual Box with Warm Amber Palette */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white space-y-4 text-start flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
            {isAr ? 'شبكة المتاجر المحلية' : 'Local Retail Grid'}
          </span>
          <h2 className="text-xl sm:text-2xl font-black">
            {isAr ? 'تجارتك تكبر على أرض الواقع.. وإحنا نكبرها معاك.' : 'Your store scales in the real world, and we scale alongside you.'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg">
            {isAr 
              ? 'أدوات كاشير أقوى · ربط محلي مباشر · نمو مستمر. اربط فروعك واجعل كل متسوق قريب خطوة منك.'
              : 'Sub-second POS · Direct local reach · Sustained foot traffic growth.'}
          </p>
        </div>

        <button
          onClick={() => onOpenDemo(isAr ? 'ربط متجري بتطبيق من مكانك' : 'Connect Store to Men Makanak')}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 shrink-0 cursor-pointer relative z-10"
        >
          {isAr ? 'اربط متجرك بتطبيق من مكانك' : 'Connect Store to Men Makanak'}
        </button>
      </div>

    </div>
  );
};
