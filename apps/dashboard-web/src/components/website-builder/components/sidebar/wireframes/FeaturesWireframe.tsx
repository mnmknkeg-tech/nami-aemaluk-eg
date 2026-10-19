import React from 'react';
import { Sparkles } from 'lucide-react';
import { WireframeProps } from './types';

export const FeaturesWireframe: React.FC<WireframeProps> = ({ template }) => {
  const type = template.wireframeType || template.id;
    if (template.category === 'features') {
    if (type === 'features-bento') {
      return (
        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-right">
          <div className="text-center font-bold text-[10px] text-slate-800">
            شبكة بينتو المميزات
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="bg-sky-50 border border-sky-200 rounded p-1 text-[8px] text-sky-800 font-bold">
              🔍 فحص 250+
            </div>
            <div className="bg-pink-50 border border-pink-200 rounded p-1 text-[8px] text-pink-800 font-bold">
              💳 تمويل فوري
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded p-1 text-[8px] text-emerald-800 font-bold">
              🚚 تسليم فوري
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
        <div className="text-center">
          <span className="text-[10px] font-bold text-slate-800">أبرز المزايا التنافسية</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-xs">
            <div className="w-5 h-5 mx-auto bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px]">
              ★
            </div>
            <span className="text-[9px] font-bold text-slate-700 block mt-1">سرعة وأمان</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-xs">
            <div className="w-5 h-5 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center text-[10px]">
              ✓
            </div>
            <span className="text-[9px] font-bold text-slate-700 block mt-1">دقة عالية</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-xs">
            <div className="w-5 h-5 mx-auto bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[10px]">
              ⚡
            </div>
            <span className="text-[9px] font-bold text-slate-700 block mt-1">دعم متواصل</span>
          </div>
        </div>
      </div>
    );
  }

  // 3.5 STATS WIREFRAME
  if (template.category === 'stats') {
    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1.5 text-center">
        <span className="text-[10px] font-bold text-slate-200 block">إحصائيات وأرقام الثقة</span>
        <div className="grid grid-cols-4 gap-1">
          <div className="bg-white/5 p-1 rounded border border-white/10">
            <span className="text-[11px] font-black text-sky-400 block">+1500</span>
            <span className="text-[7px] text-slate-400 block">سيارة</span>
          </div>
          <div className="bg-white/5 p-1 rounded border border-white/10">
            <span className="text-[11px] font-black text-emerald-400 block">99.6%</span>
            <span className="text-[7px] text-slate-400 block">رضا</span>
          </div>
          <div className="bg-white/5 p-1 rounded border border-white/10">
            <span className="text-[11px] font-black text-amber-400 block">+15</span>
            <span className="text-[7px] text-slate-400 block">عاماً</span>
          </div>
          <div className="bg-white/5 p-1 rounded border border-white/10">
            <span className="text-[11px] font-black text-purple-400 block">24/7</span>
            <span className="text-[7px] text-slate-400 block">دعم</span>
          </div>
        </div>
      </div>
    );
  }

  // 3.6 STEPS WIREFRAME
  if (template.category === 'steps') {
    return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-right">
        <span className="text-[10px] font-bold text-slate-800 block text-center">
          رحلة الحجز في 3 خطوات
        </span>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="bg-white p-1 rounded border border-slate-200">
            <span className="text-[10px] font-black text-blue-600 block">01</span>
            <span className="text-[8px] font-bold text-slate-700 block">اختر السيارة</span>
          </div>
          <div className="bg-white p-1 rounded border border-slate-200">
            <span className="text-[10px] font-black text-blue-600 block">02</span>
            <span className="text-[8px] font-bold text-slate-700 block">احجز المعاينة</span>
          </div>
          <div className="bg-white p-1 rounded border border-slate-200">
            <span className="text-[10px] font-black text-blue-600 block">03</span>
            <span className="text-[8px] font-bold text-slate-700 block">استلم مفتاحك</span>
          </div>
        </div>
      </div>
    );
  }

  // 3.7 LOGOS WIREFRAME
  if (template.category === 'logos') {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-xl p-2 space-y-1 text-center">
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
          العلامات والشركاء المعتمدين
        </span>
        <div className="flex items-center justify-center gap-2 text-[8px] font-extrabold text-slate-600 flex-wrap">
          <span>MERCEDES</span>
          <span>•</span>
          <span>PORSCHE</span>
          <span>•</span>
          <span>BMW</span>
          <span>•</span>
          <span>RANGE ROVER</span>
        </div>
      </div>
    );
  }

  // 4. GALLERY WIREFRAME
  if (template.category === 'gallery') {
    if (type === 'gallery-fleet') {
      return (
        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-800 block text-center">
            أسطول السيارات الفاخرة المتاح
          </span>
          <div className="grid grid-cols-3 gap-1 text-right">
            <div className="bg-white rounded border border-slate-200 p-1">
              <div className="h-7 bg-slate-200 rounded-xs mb-1" />
              <span className="text-[8px] font-bold text-slate-800 block truncate">
                Porsche 911
              </span>
              <span className="text-[8px] font-extrabold text-blue-600 block">950,000 ج.م</span>
            </div>
            <div className="bg-white rounded border border-slate-200 p-1">
              <div className="h-7 bg-slate-200 rounded-xs mb-1" />
              <span className="text-[8px] font-bold text-slate-800 block truncate">AMG GT</span>
              <span className="text-[8px] font-extrabold text-blue-600 block">870,000 ج.م</span>
            </div>
            <div className="bg-white rounded border border-slate-200 p-1">
              <div className="h-7 bg-slate-200 rounded-xs mb-1" />
              <span className="text-[8px] font-bold text-slate-800 block truncate">
                Range Rover
              </span>
              <span className="text-[8px] font-extrabold text-blue-600 block">460,000 ج.م</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
        <span className="text-[10px] font-bold text-slate-800 block text-center">
          معرض الأعمال والمشاريع
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-12 bg-slate-300 rounded-md" />
          <div className="h-12 bg-slate-400 rounded-md" />
          <div className="h-12 bg-slate-300 rounded-md" />
        </div>
      </div>
    );
  }

  return null;
};
