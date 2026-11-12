'use client';

import React from 'react';
import { Building, Target, ShieldCheck, Zap } from 'lucide-react';
import { Language } from '@/nammy/types';
import { MEN_MAKANAK_LIVE } from '@/nammy/menMakanak';

interface AboutPageViewProps {
  lang: Language;
  onOpenDemo: (ctx?: string) => void;
}

export const AboutPageView: React.FC<AboutPageViewProps> = ({ lang, onOpenDemo }) => {
  const isAr = lang === 'ar';

  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-start space-y-3">
        <span className="text-xs font-black text-amber-600 uppercase tracking-wider">
          {isAr ? 'من نحن' : 'About Us'}
        </span>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {isAr ? (
            <>
              بنينا نمّي لمساعدة التجار{' '}
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                على إدارة أعمالهم الحقيقية
              </span>
            </>
          ) : (
            <>
              We built Nammy to help merchants{' '}
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                run real-world commerce
              </span>
            </>
          )}
        </h1>

        <p className="text-sm sm:text-base text-slate-700 font-medium max-w-xl leading-relaxed">
          {isAr
            ? 'منظومة عربية مرنة لإدارة نقاط البيع، الفروع، والمخزون على أرض الواقع، وربطها بالمتجر الإلكتروني بدون أي تعقيد تقني.'
            : 'A clean, unified operating system designed specifically for physical retail merchants to master registers, multi-branch stock, and digital checkout.'}
        </p>
      </div>

      {/* Pillars with Rich Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 hover:border-amber-400 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Zap size={20} />
          </div>
          <h3 className="font-black text-base text-slate-900">
            {isAr ? 'أدوات أقوى' : 'Robust Tooling'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isAr
              ? 'لوحة تحكم مركزية، كاشير سحابي سريع، ' +
                (MEN_MAKANAK_LIVE ? 'وتطبيق «من مكانك» ' : '') +
                'لجلب زبائن منطقتك.'
              : 'Unified dashboard, fast cloud POS' +
                (MEN_MAKANAK_LIVE ? ', and Men Makanak local discovery' : '') +
                '.'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 hover:border-emerald-400 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck size={20} />
          </div>
          <h3 className="font-black text-base text-slate-900">
            {isAr ? 'دعم حقيقي' : 'Real Support'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isAr
              ? 'فريق استشاري وتقني متواجد 24/7 لمساعدتك على مدار الأسبوع بدون توقف.'
              : 'Dedicated retail specialists available 24/7 whenever you need help.'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 hover:border-indigo-400 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Target size={20} />
          </div>
          <h3 className="font-black text-base text-slate-900">
            {isAr ? 'نمو مستمر' : 'Continuous Growth'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isAr
              ? 'نطور معك أدوات التجارة الحديثة خطوة بخطوة من أول فاتورة لأكبر فرع.'
              : 'Continuous product engineering side-by-side with your retail ambitions.'}
          </p>
        </div>
      </div>

      {/* Directory & Structure */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-700 shadow-2xs">
        <div>
          <h4 className="font-black text-slate-900 mb-2">
            {isAr ? 'المنظومة والمنتج' : 'Product & Ecosystem'}
          </h4>
          <ul className="space-y-1.5 text-slate-600">
            <li>{isAr ? 'المميزات الشاملة' : 'Core Capabilities'}</li>
            <li>{isAr ? 'مصمم الصفحات والدومينات' : 'Page & Domain Builder'}</li>
            <li>{isAr ? 'لوحة التحكم المركزية' : 'Central Dashboard'}</li>
            {!MEN_MAKANAK_LIVE ? null : (
              <li>{isAr ? 'تطبيق من مكانك' : 'Men Makanak Local App'}</li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="font-black text-slate-900 mb-2">
            {isAr ? 'الشركة والتواصل' : 'Company & Contact'}
          </h4>
          <ul className="space-y-1.5 text-slate-600">
            <li>{isAr ? 'قصة نمّي' : 'Our Story'}</li>
            <li>{isAr ? 'تواصل مع فريق الإدارة' : 'Executive Inquiries'}</li>
            <li>{isAr ? 'المدونة ودليل التجزئة' : 'Retail Guides & Blog'}</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-2">
            {isAr ? 'الأمان والامتثال' : 'Security & Trust'}
          </h4>
          <ul className="space-y-1.5 text-slate-600">
            <li>{isAr ? 'مركز المساعدة المباشر' : '24/7 Live Desk'}</li>
            <li>{isAr ? 'تشفير وحماية البيانات 256-bit' : '256-bit Financial Security'}</li>
            <li>{isAr ? 'الفاتورة والإيصال الإلكتروني (ETA)' : 'Egyptian ETA Tax Invoicing'}</li>
          </ul>
        </div>
      </div>

      {/* Action */}
      <div className="text-start pt-1">
        <button
          onClick={() => onOpenDemo(isAr ? 'تواصل مع فريق نمّي' : 'Connect with Team')}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm rounded-xl cursor-pointer transition-all shadow-xs active:scale-95"
        >
          {isAr ? 'ابدأ رحلتك معنا اليوم' : 'Begin Your Journey'}
        </button>
      </div>
    </div>
  );
};
