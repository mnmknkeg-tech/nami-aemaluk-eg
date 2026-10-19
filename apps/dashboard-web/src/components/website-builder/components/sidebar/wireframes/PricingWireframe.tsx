import React from 'react';
import { Check } from 'lucide-react';
import { WireframeProps } from './types';

export const PricingWireframe: React.FC<WireframeProps> = ({ template }) => {
  const type = template.wireframeType || template.id;
    if (template.category === 'pricing') {
    if (type === 'pricing-luxury-vip') {
      return (
        <div className="w-full bg-slate-950 border border-amber-500/30 rounded-xl p-2.5 space-y-1.5 text-center text-white">
          <span className="text-[10px] font-bold text-amber-400 block">
            باقات العضوية الحصرية VIP
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-right">
            <div className="bg-slate-900 border border-amber-500/20 rounded p-1.5">
              <span className="text-[8px] font-bold text-amber-400">نادي النخبة</span>
              <span className="text-[9px] font-black text-white block">2,500 ج.م / شهرياً</span>
            </div>
            <div className="bg-gradient-to-r from-amber-950 to-slate-900 border border-amber-400 rounded p-1.5">
              <span className="text-[8px] font-bold text-amber-300">عضوية الـ VIP</span>
              <span className="text-[9px] font-black text-amber-300 block">5,000 ج.م / شهرياً</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
        <span className="text-[10px] font-bold text-slate-800 block text-center">
          خطط وباقات الأسعار
        </span>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="bg-white p-1.5 rounded-lg border border-slate-200">
            <span className="text-[8px] font-bold text-slate-600 block">أساسية</span>
            <span className="text-[9px] font-extrabold text-slate-900 block mt-0.5">199 ج.م</span>
          </div>
          <div className="bg-slate-900 p-1.5 rounded-lg text-white shadow-xs">
            <span className="text-[8px] font-bold text-cyan-400 block">احترافية</span>
            <span className="text-[9px] font-extrabold text-white block mt-0.5">499 ج.م</span>
          </div>
          <div className="bg-white p-1.5 rounded-lg border border-slate-200">
            <span className="text-[8px] font-bold text-slate-600 block">شركات</span>
            <span className="text-[9px] font-extrabold text-slate-900 block mt-0.5">1499 ج.م</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
