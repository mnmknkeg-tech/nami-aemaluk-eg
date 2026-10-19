import React from 'react';
import { WireframeProps } from './types';

export const AuthWireframe: React.FC<WireframeProps> = ({ template }) => {
    if (template.category === 'auth') {
    return (
      <div className="w-full bg-white border border-slate-300 rounded-xl p-2.5 space-y-1.5 text-right text-[8px] shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
          <span className="text-[9px] font-bold text-slate-800">🔐 تسجيل الدخول والحساب</span>
          <span className="text-[7px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
            عضوية
          </span>
        </div>
        <div className="flex gap-1.5 pt-0.5">
          <div className="w-1/2 bg-blue-50/70 border border-blue-100 rounded p-1 space-y-1">
            <div className="h-1.5 bg-blue-400 rounded w-4/5" />
            <div className="h-1 bg-slate-300 rounded w-3/5" />
            <div className="h-1 bg-slate-200 rounded w-2/3" />
          </div>
          <div className="w-1/2 bg-slate-50 border border-slate-200 rounded p-1 space-y-1">
            <div className="h-2 bg-slate-200 rounded" />
            <div className="h-2 bg-slate-200 rounded" />
            <div className="h-3 bg-blue-600 rounded text-white text-[6px] font-bold flex items-center justify-center">
              دخول
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};
