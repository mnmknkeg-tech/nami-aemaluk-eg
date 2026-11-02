'use client';

import React from 'react';
import {
  MapPin,
  Sparkles,
  Rocket,
  Hammer,
  Clock,
  ArrowLeft,
  Store,
  Users,
  Navigation,
  CheckCircle2,
} from 'lucide-react';
import { Language } from '@/nammy/types';

interface MenMakanakComingSoonViewProps {
  lang: Language;
  onOpenDemo: (ctx?: string) => void;
}

/**
 * شاشة «قيد التطوير» لتطبيق من مكانك.
 *
 * بتظهر في النسخة المنشورة بدل محتوى التطوير الكامل، عشان:
 *   - الصفحة تفضل شغالة ومفهرسة (SEO) لو حد بحث عن «من مكانك» ودخل.
 *   - نحافظ على الفضول بدل ما نظهر 404 ونضيع الزيارات.
 *   - نحوّل الزائر لصفحة التسجيل عشان نسجّل اهتمامه.
 *
 * في اللوكل بيتعرض محتوى التطوير الكامل (MenMakanakPageView) — مش دي.
 */
export const MenMakanakComingSoonView: React.FC<MenMakanakComingSoonViewProps> = ({
  lang,
  onOpenDemo,
}) => {
  const isAr = lang === 'ar';
  const BackIcon = ArrowLeft;

  const teasers = isAr
    ? [
        { icon: MapPin, text: 'ظهور متجرك على الخريطة للزبائن اللي حواليك.' },
        { icon: Navigation, text: 'عروض محلية بتوصل للعميل في محيط 5 كم من محلك.' },
        { icon: Users, text: 'كل زيارة من التطبيق تتحول لبيع حقيقي على كاشيرك.' },
      ]
    : [
        { icon: MapPin, text: 'Your store appears on the map for nearby shoppers.' },
        { icon: Navigation, text: 'Local promos reach customers within a 5 km radius.' },
        { icon: Users, text: 'Every app visit converts into a real sale on your POS.' },
      ];

  const launchPerks = isAr
    ? [
        'ظهور مباشر على الخريطة للزبائن المحيطين',
        'عروض ترويجية فورية في محيط 5 كم',
        'تحويل زيارات التطبيق لمبيعات موثقة',
        'مزامنة الفروع والمخزون تلقائياً',
      ]
    : [
        'Live map visibility for nearby shoppers',
        'Instant promos within a 5 km radius',
        'Convert app visits into verified sales',
        'Automatic branch & stock sync',
      ];

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-8 max-w-3xl mx-auto text-center">
      {/* Badge — قيد التطوير */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-black text-amber-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          {isAr ? 'قيد التطوير' : 'Under Development'}
        </span>
      </div>

      {/* Icon + Heading */}
      <div className="space-y-4">
        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30 flex items-center justify-center">
          <MapPin size={40} strokeWidth={2.2} className="text-white" />
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-black text-amber-600 uppercase tracking-wider">
            {isAr ? 'تطبيق من مكانك (Men Makanak)' : 'Men Makanak App'}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {isAr ? (
              <>
                العملاء اللي حواليك.. <br />
                <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                  بيوصلولك قريب.
                </span>
              </>
            ) : (
              <>
                The shoppers around you.. <br />
                <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                  are almost yours.
                </span>
              </>
            )}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto font-medium leading-relaxed">
            {isAr
              ? 'بنبنى أقوى طريقة توصّل بيها متجرك لعملاء منطقتك — على الخريطة، بعروض محلية، وبمبيعات حقيقية. خلّينا نسجّلك من دلوقتي تكون من أوّل اللي يجربوه.'
              : 'We are building the strongest way to connect your store with nearby customers — on the map, with local offers, and real sales. Register now to be among the first to try it.'}
          </p>
        </div>
      </div>

      {/* Progress bar — شكل تحت الإنشاء */}
      <div className="max-w-md mx-auto space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Hammer size={13} className="text-amber-500" />
            {isAr ? 'جاري التجهيز' : 'In the works'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} className="text-amber-500" />
            {isAr ? 'الإطلاق قريباً' : 'Launching soon'}
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-l from-amber-500 to-orange-400" />
        </div>
      </div>

      {/* Feature teasers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-start">
        {teasers.map((t, i) => {
          const Icon = t.icon;
          return (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3"
            >
              <span className="shrink-0 w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                {t.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* What you get when it launches */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white space-y-4 text-start relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wider">
            <Rocket size={14} />
            {isAr ? 'هتحصل على إيه عند الإطلاق؟' : "What you'll get at launch"}
          </span>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-200">
            {launchPerks.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span className="font-bold">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
        <button
          onClick={() => onOpenDemo(isAr ? 'اهتمام بتطبيق من مكانك' : 'Interest in Men Makanak')}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-transform hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2"
        >
          <Store size={16} strokeWidth={2.4} />
          {isAr ? 'سجّل اهتمامك من دلوقتي' : 'Register your interest'}
        </button>
        <a
          href="/"
          className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-sm rounded-xl shadow-xs transition-all active:scale-95 inline-flex items-center justify-center gap-2"
        >
          <BackIcon size={16} strokeWidth={2.4} />
          {isAr ? 'الرجوع للرئيسية' : 'Back to home'}
        </a>
      </div>

      <p className="text-[11px] text-slate-400 font-bold flex items-center justify-center gap-1.5">
        <Sparkles size={12} className="text-amber-400" />
        {isAr ? 'نمّي أعمالك — بنبنيهالك بإتقان.' : 'Nammy — building it with care for you.'}
      </p>
    </div>
  );
};
