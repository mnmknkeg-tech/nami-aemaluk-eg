import React from 'react';
import { Menu, Instagram, Twitter, Facebook } from 'lucide-react';
import { WireframeProps } from './types';

export const NavbarWireframe: React.FC<WireframeProps> = ({ template }) => {
  const type = template.wireframeType || template.id;
    if (template.category === 'navbar') {
    if (type === 'navbar-composition') {
      return (
        <div className="w-full bg-white border border-slate-300 rounded-lg p-2.5 flex items-center justify-between text-[10px] text-slate-700 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-500">تواصل معنا</span>
            <span className="text-[9px] text-slate-500">من نحن</span>
            <span className="text-[9px] font-bold text-slate-800">الرئيسية</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Menu className="w-3.5 h-3.5 text-slate-700" />
            <span>الشعار</span>
          </div>
        </div>
      );
    }

    if (type === 'navbar-full-split') {
      return (
        <div className="w-full bg-white border border-slate-300 rounded-lg p-2.5 flex items-center justify-between text-[10px] text-slate-700 shadow-xs">
          <Menu className="w-4 h-4 text-slate-700" />
          <span className="font-bold text-slate-800">الشعار</span>
        </div>
      );
    }

    if (type === 'navbar-vertical') {
      return (
        <div className="w-full bg-white border border-slate-300 rounded-lg p-2 flex items-center justify-between text-[10px] text-slate-700 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="bg-lime-600 text-white text-[9px] font-bold px-2 py-0.5 rounded">
              احجز
            </span>
            <Menu className="w-3.5 h-3.5 text-slate-700" />
          </div>
          <span className="font-bold text-slate-800">الشعار</span>
        </div>
      );
    }

    if (type === 'navbar-supported') {
      return (
        <div className="w-full bg-white border border-slate-300 rounded-lg p-2 flex items-center justify-between text-[9px] text-slate-700 shadow-xs">
          <span className="bg-lime-600 text-white font-bold px-2 py-0.5 rounded">احجز تذكرة</span>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span>تواصل معنا</span>
            <span>القائمة ▾</span>
            <span>من نحن</span>
            <span className="font-bold text-slate-800">الرئيسية</span>
          </div>
          <span className="font-bold text-slate-800">الشعار</span>
        </div>
      );
    }

    if (type === 'navbar-middle') {
      return (
        <div className="w-full bg-white border border-slate-300 rounded-lg p-2 flex items-center justify-between text-[9px] text-slate-700 shadow-xs">
          <div className="flex items-center gap-1 text-slate-700">
            <Instagram className="w-2.5 h-2.5" />
            <Twitter className="w-2.5 h-2.5" />
            <Facebook className="w-2.5 h-2.5" />
          </div>
          <span className="font-bold text-slate-800 text-[10px]">الشعار</span>
          <div className="flex items-center gap-1 text-slate-600">
            <span>القائمة ▾</span>
            <span>من نحن</span>
            <span className="font-bold text-slate-800">الرئيسية</span>
          </div>
        </div>
      );
    }

    if (type === 'navbar-full') {
      return (
        <div className="w-full bg-white border border-slate-300 rounded-lg p-2 flex items-center justify-between text-[9px] text-slate-700 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="bg-lime-600 text-white font-bold px-2 py-0.5 rounded">تواصل</span>
            <div className="flex items-center gap-0.5 text-slate-600">
              <Instagram className="w-2.5 h-2.5" />
              <Twitter className="w-2.5 h-2.5" />
              <Facebook className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span>تواصل معنا</span>
            <span>القائمة ▾</span>
            <span>من نحن</span>
            <span>الرئيسية</span>
            <span className="font-bold text-slate-800">الشعار</span>
          </div>
        </div>
      );
    }

    // Default navbar (aligned)
    return (
      <div className="w-full bg-white border border-slate-300 rounded-lg p-2 flex items-center justify-between text-[9px] text-slate-700 shadow-xs">
        <span className="bg-lime-600 text-white font-bold px-2.5 py-0.5 rounded">اتصل</span>
        <div className="flex items-center gap-1.5 text-slate-600">
          <span>تواصل معنا</span>
          <span>القائمة ▾</span>
          <span>من نحن</span>
          <span>الرئيسية</span>
          <span className="font-bold text-slate-800">الشعار</span>
        </div>
      </div>
    );
  }

  return null;
};
