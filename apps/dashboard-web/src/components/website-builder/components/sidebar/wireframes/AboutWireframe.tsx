import React from 'react';
import { WireframeProps } from './types';

export const AboutWireframe: React.FC<WireframeProps> = ({ template }) => {
  const type = template.wireframeType || template.id;
    if (template.category === 'about') {
    if (type === 'about-story-timeline') {
      return (
        <div className="w-full bg-white border border-slate-300 rounded-xl p-2.5 space-y-2 text-right text-[8px]">
          <div className="text-center space-y-0.5">
            <span className="text-[7px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
              ✨ مسيرة التميز
            </span>
            <span className="text-[9px] font-extrabold text-slate-800 block">
              عقد من الريادة والتميز
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[7px] text-center">
            <div className="bg-slate-50 border border-slate-200 rounded p-1">
              <span className="font-bold text-blue-600 block">2015</span>
              <span className="text-slate-600">التأسيس</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-1">
              <span className="font-bold text-blue-600 block">2021</span>
              <span className="text-slate-600">فحص 150+</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-1">
              <span className="font-bold text-blue-700 block">2025</span>
              <span className="text-blue-800">التوسع الكامل</span>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'about-split-ceo') {
      return (
        <div className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 space-y-1.5 text-right text-[8px]">
          <div className="grid grid-cols-2 gap-2 items-center">
            <div className="space-y-1">
              <span className="text-[7px] font-bold text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded-full">
                🏛️ رسالة القيادة
              </span>
              <span className="text-[8px] font-bold text-white block">« شغف بالفخامة والثقة »</span>
              <span className="text-[7px] text-slate-400 block font-light">م. سلطان الهذلول</span>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded h-12 flex items-center justify-center text-[7px] text-slate-400">
              صورة الإدارة VIP
            </div>
          </div>
        </div>
      );
    }

    if (type === 'about-values-pillars') {
      return (
        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-right text-[8px]">
          <div className="text-center space-y-0.5">
            <span className="text-[7px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              🛡️ الركائز الثلاث
            </span>
            <span className="text-[9px] font-bold text-slate-800 block">قيم تحكم كل خطوة</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[7px] text-center">
            <div className="bg-white border border-slate-200 rounded p-1">
              <span className="block font-bold text-slate-800">🔍 الشفافية</span>
              <span className="text-slate-500 text-[6px]">فحص دقيق</span>
            </div>
            <div className="bg-white border border-slate-200 rounded p-1">
              <span className="block font-bold text-slate-800">👑 ضيافة VIP</span>
              <span className="text-slate-500 text-[6px]">مستشار خاص</span>
            </div>
            <div className="bg-white border border-slate-200 rounded p-1">
              <span className="block font-bold text-slate-800">🏆 الضمان</span>
              <span className="text-slate-500 text-[6px]">شراكة ممتدة</span>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'about-branches-locations') {
      return (
        <div className="w-full bg-white border border-slate-300 rounded-xl p-2.5 space-y-1.5 text-right text-[8px]">
          <div className="text-center">
            <span className="text-[7px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
              📍 صالات المملكة
            </span>
            <span className="text-[9px] font-bold text-slate-800 block">الرياض • جدة • الخبر</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[7px] text-center">
            <div className="bg-slate-50 border border-slate-200 rounded p-1">
              <span className="font-bold text-slate-800 block">الرياض (HQ)</span>
              <span className="text-slate-500 text-[6px]">الملك فهد</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-1">
              <span className="font-bold text-slate-800 block">جدة</span>
              <span className="text-slate-500 text-[6px]">الملك عبدالعزيز</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-1">
              <span className="font-bold text-slate-800 block">الخبر</span>
              <span className="text-slate-500 text-[6px]">الملك فيصل</span>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'about-certifications-awards') {
      return (
        <div className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 space-y-1.5 text-right text-[8px]">
          <div className="text-center">
            <span className="text-[7px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded-full">
              🏅 اعتمادات رسمية
            </span>
            <span className="text-[9px] font-bold text-white block">
              شهادات الأيزو والفحص الألماني
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[7px] text-center">
            <div className="bg-slate-800 border border-slate-700 rounded p-1">
              <span className="font-bold text-emerald-400 block">ISO 9001</span>
              <span className="text-slate-400 text-[6px]">إدارة الجودة</span>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded p-1">
              <span className="font-bold text-blue-400 block">TÜV Cert</span>
              <span className="text-slate-400 text-[6px]">فحص 150+</span>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded p-1">
              <span className="font-bold text-amber-400 block">VIP Award</span>
              <span className="text-slate-400 text-[6px]">أفضل معرض</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full bg-white border border-slate-300 rounded-xl p-2.5 space-y-1.5 text-right text-[8px]">
        <span className="text-[9px] font-bold text-slate-800 block">قسم من نحن والقصة</span>
        <span className="text-[7px] text-slate-500 block">نبذة تعريفية بالشركة والخدمات</span>
      </div>
    );
  }

  return null;
};
