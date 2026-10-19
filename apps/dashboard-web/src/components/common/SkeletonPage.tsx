'use client';

/**
 * هيكل صفحة مؤقت (Skeleton) — لمرحلة إعادة تنظيم أقسام المالية/المحاسبة/التحليلات.
 * بيعرض عنوان الصفحة + الأقسام المخططة ليها لحد ما نبدأ التصميم التفصيلي صفحة صفحة.
 */
import React from 'react';
import { Info } from 'lucide-react';

export default function SkeletonPage({
  title,
  subtitle,
  icon: Icon,
  sections,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  sections: string[];
}) {
  return (
    <div className="min-h-full bg-[#F4F5F7] text-slate-900" style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}>
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0">
            <Icon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-amber-500" />
            <h2 className="font-black text-slate-900 text-sm">الهيكل جاهز — التصميم التفصيلي في المرحلة الجاية</h2>
          </div>
          <p className="text-xs text-slate-500 font-bold mb-4">الأقسام المخططة لهذه الصفحة (هيكل فقط — بدون أي وظائف نهائية بعد):</p>
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <span key={s} className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}