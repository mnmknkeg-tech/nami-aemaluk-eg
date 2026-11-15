'use client';

import { Sparkles, CalendarClock } from 'lucide-react';

export default function PromoBanner() {
  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-5 sm:p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-bold">
          <Sparkles size={12} />
          <span>متاحة في باقتك</span>
        </div>
        <h2 className="text-lg sm:text-xl font-black">نظّم حجوزات متجرك بسهولة</h2>
        <p className="text-xs text-teal-100 leading-relaxed max-w-2xl">
          حدّد المواعيد وأدِر الحجوزات والطاقة الاستيعابية من مكان واحد. يتيح لعملائك اختيار اليوم
          والوقت المناسب وحجز الجلسة أو الموعد مباشرة مع تأكيد فوري.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-md">
            ✓ حدّد مواعيد وتواريخ الحجز بسهولة
          </span>
          <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-md">
            ✓ نظّم الطاقة الاستيعابية حسب وقت الحجز
          </span>
          <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-md">
            ✓ تابع الحجوزات وأدِرها من مكان واحد
          </span>
          <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-md">
            ✓ مناسب للخدمات والجلسات والمواعيد
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
        <span className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold border border-white/20 flex items-center gap-1.5">
          <CalendarClock size={14} />
          <span>حجوزات ومواعيد</span>
        </span>
      </div>
    </div>
  );
}
