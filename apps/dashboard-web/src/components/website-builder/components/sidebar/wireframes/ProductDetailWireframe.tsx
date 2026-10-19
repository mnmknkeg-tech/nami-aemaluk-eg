import React from 'react';
import { Sparkles, Check } from 'lucide-react';
import { WireframeProps } from './types';

export const ProductDetailWireframe: React.FC<WireframeProps> = ({ template }) => {
  const type = template.wireframeType || template.id;
    if (template.category === 'product_detail') {
    if (type === 'product-detail-showcase') {
      return (
        <div className="w-full bg-white border border-slate-300 rounded-lg p-3 flex gap-2.5 shadow-xs">
          <div className="w-16 h-16 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1 flex flex-col justify-between py-0.5">
            <div className="space-y-1">
              <div className="h-2.5 bg-slate-300 rounded-full w-4/5" />
              <div className="h-2 bg-slate-200 rounded-full w-1/2" />
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <div className="h-4 px-2 bg-blue-600 rounded text-[8px] font-bold text-white flex items-center">
                أضف للسلة
              </div>
              <div className="h-4 px-1.5 bg-slate-100 rounded text-[8px] text-slate-600 flex items-center">
                واتساب
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'product-specs-table') {
      return (
        <div className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <span className="text-[9px] font-bold text-slate-700">المواصفات والضمان</span>
            <Check className="w-3 h-3 text-emerald-600" />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div className="h-2 bg-slate-200 rounded" />
            <div className="h-2 bg-slate-200 rounded" />
            <div className="h-2 bg-slate-200 rounded" />
            <div className="h-2 bg-slate-200 rounded" />
          </div>
        </div>
      );
    }
  }

  return null;
};
