'use client';

import React from 'react';
import { ShieldCheck, Lock, EyeOff, Server, CheckCircle2 } from 'lucide-react';
import { Language } from '@/nammy/types';

interface PrivacyPageViewProps {
  lang: Language;
}

export const PrivacyPageView: React.FC<PrivacyPageViewProps> = ({ lang }) => {
  const isAr = lang === 'ar';

  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      
      {/* Header */}
      <div className="text-start space-y-3">
        <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">
          {isAr ? 'الأمان والخصوصية' : 'Security & Privacy'}
        </span>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          {isAr ? (
            <>
              بيانات تجارتك ومبيعاتك{' '}
              <span className="bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded-lg border-b-2 border-emerald-400 inline-block">
                مشفرة ومحمية بالكامل
              </span>
            </>
          ) : (
            <>
              Your commercial data & sales{' '}
              <span className="bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded-lg border-b-2 border-emerald-400 inline-block">
                strictly encrypted
              </span>
            </>
          )}
        </h1>

        <p className="text-sm sm:text-base text-slate-700 font-medium max-w-xl leading-relaxed">
          {isAr
            ? 'نحمي بيانات متجرك ومبيعاتك وعملائك وفق أعلى معايير التشفير البنكي المعتمدة والمتوافقة مع اللوائح في مصر.'
            : 'We safeguard your point-of-sale logs, inventory numbers, and customer databases with institutional encryption.'}
        </p>
      </div>

      {/* Highlights - Clean Outline-Style Icons without background box containers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="group p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition-all">
          {/* Clean Outline-Style Icon without background box container */}
          <div className="pt-1">
            <Lock size={26} strokeWidth={2.1} className="text-amber-500 transition-transform group-hover:scale-110" />
          </div>
          <h3 className="font-black text-base text-slate-900">
            {isAr ? 'تشفير مالي 256-bit' : '256-Bit Financial Encryption'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isAr
              ? 'تشفير كامل لكافة الفواتير والعمليات البنكية لحماية حقوقك وأموالك.'
              : 'End-to-end encryption across all billing transactions and financial sync points.'}
          </p>
        </div>

        <div className="group p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition-all">
          {/* Clean Outline-Style Icon without background box container */}
          <div className="pt-1">
            <EyeOff size={26} strokeWidth={2.1} className="text-emerald-500 transition-transform group-hover:scale-110" />
          </div>
          <h3 className="font-black text-base text-slate-900">
            {isAr ? 'عدم مشاركة بياناتك' : 'Zero Data Selling'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isAr
              ? 'بياناتك ومبيعاتك وقائمة عملائك ملك لك وحدك ولا تباع أو تشارك لأي طرف ثالث.'
              : 'Your store metrics, inventory, and customer databases belong strictly to you.'}
          </p>
        </div>

        <div className="group p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition-all">
          {/* Clean Outline-Style Icon without background box container */}
          <div className="pt-1">
            <Server size={26} strokeWidth={2.1} className="text-violet-600 transition-transform group-hover:scale-110" />
          </div>
          <h3 className="font-black text-base text-slate-900">
            {isAr ? 'سيرفرات سحابية آمنة' : 'Secure Cloud Infrastructure'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isAr
              ? 'استضافة موثوقة مع نسخ احتياطي فوري على مدار الساعة بدون أي فقدان للبيانات.'
              : 'High-availability regional cloud storage with automated continuous backups.'}
          </p>
        </div>
      </div>

      {/* Policy details */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <h4 className="font-black text-slate-900 text-sm sm:text-base">
          {isAr ? 'التزامات الخصوصية الأساسية:' : 'Core Privacy Commitments:'}
        </h4>
        <ul className="space-y-3">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>
              {isAr
                ? 'الامتثال الكامل لمتطلبات مصلحة الضرائب المصرية (ETA) في توثيق الفاتورة والإيصال الإلكتروني وحفظ السجلات المالية.'
                : 'Full compliance with Egyptian Tax Authority (ETA) e-invoicing and e-receipt archiving requirements.'}
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>
              {isAr
                ? 'حق التاجر في استخراج وتصدير نسخته الكاملة من بيانات المنتجات والعملاء والمبيعات بأي وقت بصيغة Excel أو CSV.'
                : 'Merchants retain full rights to export their complete data catalog anytime in CSV or Excel formats.'}
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>
              {isAr
                ? 'سياسات وصول مشددة تعتمد على صلاحيات الموظفين المحددة من قبلك فقط في لوحة التحكم.'
                : 'Strict role-based access control configured solely by the merchant inside the admin panel.'}
            </span>
          </li>
        </ul>
      </div>

    </div>
  );
};
