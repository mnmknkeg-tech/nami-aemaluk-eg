'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Download, Hammer, HelpCircle, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ============================================================
 * AnalyticsPlaceholder — هيكل مبدئي موحّد لصفحات التحليلات
 * اللي لسه تحت التطوير (مشاركة، مالية، تسويق، عمليات، مدفوعات، لوجستيات)
 * ============================================================ */

type AnalyticsPlaceholderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  /** tailwind text color class for the icon tile, e.g. 'text-fuchsia-500' */
  accent?: string;
  bullets: string[];
  related?: { label: string; href: string }[];
};

export default function AnalyticsPlaceholder({
  title,
  description,
  icon: Icon,
  accent = 'text-fuchsia-500',
  bullets,
  related = [],
}: AnalyticsPlaceholderProps) {
  return (
    <div
      className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1400px] mx-auto"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 ${accent}`}
          >
            <Icon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">{title}</h1>
            <p className="text-xs text-slate-400 mt-1 font-semibold">{description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="h-9 px-3 rounded-full border border-slate-200 bg-white text-slate-600 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50">
            <RefreshCw size={14} /> تحديث
          </button>
          <button className="h-9 px-3 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5">
            <Download size={14} /> تصدير
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2 flex flex-col sm:flex-row gap-2 sm:items-center justify-between border-b border-slate-100">
          <div className="flex gap-1 overflow-x-auto">
            <span className="h-8 px-3 rounded-full bg-slate-900 text-white text-[12px] font-bold flex items-center">
              نظرة عامة
            </span>
            <span className="h-8 px-3 rounded-full text-slate-500 text-[12px] font-bold flex items-center">
              التفاصيل
            </span>
          </div>
          <button className="h-8 px-3 rounded-full border border-slate-200 text-slate-600 text-[12px] font-bold flex items-center gap-1.5">
            آخر 30 يومًا <ChevronDown size={14} />
          </button>
        </div>
        <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {['المؤشر الرئيسي', 'مقارنة الفترة', 'الحالة'].map((label) => (
            <div key={label} className="rounded-xl border border-slate-100 p-4">
              <span className="text-[11px] font-bold text-slate-400">{label}</span>
              <div className="mt-3 h-6 w-20 rounded bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* ===== Notice: قيد التطوير ===== */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 text-right">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Hammer size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 leading-none">
                قيد التطوير
              </span>
              <h2 className="text-sm font-bold text-slate-900">الصفحة جاهزة كهيكل مبدئي</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              هذه الصفحة جاهزة كهيكل مبدئي — البيانات والرسوم البيانية هتُضاف هنا
            </p>
          </div>
        </div>
      </div>

      {/* ===== ماذا ستجد هنا؟ ===== */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <HelpCircle size={15} className="text-slate-400" />
          <h3 className="text-sm font-bold text-slate-800">ماذا ستجد هنا؟</h3>
        </div>
        <ul className="p-4 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
              <ChevronRight size={14} className="text-slate-300 mt-1 shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* ===== روابط ذات صلة ===== */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/analytics"
          className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
        >
          كل التحليلات
        </Link>
        {related.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
