'use client';

import React from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import { Language } from '@/nammy/types';

interface TermsPageViewProps {
  lang: Language;
}

export const TermsPageView: React.FC<TermsPageViewProps> = ({ lang }) => {
  const isAr = lang === 'ar';

  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      
      {/* Header */}
      <div className="text-start space-y-3">
        <span className="text-xs font-black text-amber-600 uppercase tracking-wider">
          {isAr ? 'اتفاقية الاستخدام' : 'Terms of Service'}
        </span>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          {isAr ? (
            <>
              شروط واضحة وعادلة{' '}
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                لضمان استقرار تجارتك
              </span>
            </>
          ) : (
            <>
              Transparent, fair terms{' '}
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                to safeguard your store
              </span>
            </>
          )}
        </h1>

        <p className="text-sm sm:text-base text-slate-700 font-medium max-w-xl leading-relaxed">
          {isAr
            ? 'توضح هذه الاتفاقية حقوقك والتزاماتنا المتبادلة لضمان تشغيل نقاط البيع واستمرارية المبيعات بلا انقطاع.'
            : 'Outlining our mutual commitments to ensure 99.9% POS continuity and uninterrupted operations.'}
        </p>
      </div>

      {/* Terms Content */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <div className="space-y-2">
          <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>{isAr ? '1. التجربة المجانية والاشتراك:' : '1. Free Trial & Subscriptions:'}</span>
          </h4>
          <p className="text-slate-600 pl-4">
            {isAr
              ? 'تتيح المنصة تجربة مجانية لمدة 14 يوماً بكافة المزايا وبدون اشتراط بطاقة ائتمانية. يتاح للتاجر إلغاء أو ترقية الباقة في أي وقت بكل حرية وبدون أي رسوم خفية.'
              : 'Our 14-day free trial gives access to all core features with no credit card required. Merchants can upgrade or cancel subscriptions anytime without exit fees.'}
          </p>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-100">
          <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{isAr ? '2. استمرارية الخدمة ومستوى التشغيل (SLA):' : '2. Service Level Agreement (SLA):'}</span>
          </h4>
          <p className="text-slate-600 pl-4">
            {isAr
              ? 'نلتزم بنسبة تشغيل وتوافر للأنظمة السحابية ونقاط البيع تفوق 99.9%، مع عمل الكاشير في وضع عدم الاتصال (Offline Mode) في حال انقطاع الإنترنت بالفرع.'
              : 'We maintain 99.9%+ high availability across cloud services and POS terminals, with full offline POS capability during local internet outages.'}
          </p>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-100">
          <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-600"></span>
            <span>{isAr ? '3. الفوترة الضريبية والامتثال القانوني:' : '3. Tax Invoicing & Compliance:'}</span>
          </h4>
          <p className="text-slate-600 pl-4">
            {isAr
              ? 'التاجر مسؤول عن صحة الأرقام الضريبية المسجلة في حسابه، وتوفر المنصة آليات الربط المعتمدة مع هيئة الزكاة والضريبة والجمارك لإصدار الفواتير الإلكترونية المعتمدة.'
              : 'Merchants are responsible for providing valid tax registration numbers, and our platform guarantees compliant integration with regional tax authorities.'}
          </p>
        </div>
      </div>

    </div>
  );
};
