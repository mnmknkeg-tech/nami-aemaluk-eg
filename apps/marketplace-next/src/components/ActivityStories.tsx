'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import type { MarketActivity } from '@/lib/activity-catalog';
import { getActivityTheme } from '@/lib/activity-catalog';
import { cn } from '@/lib/utils';

/**
 * ActivityStories — صف أفقي من الدوائر بنستايل ستوريز (زي Instagram/Snapchat
 * وأحسن تطبيقات مصر زي السوق/Talabat/Yassir).
 *
 *   - كل دائرة فيها صورة القسم، حواليها حلقة بلون القسم.
 *   - اسم القسم تحت الدائرة.
 *   - آخر دائرة = "الكل" — بتروح لصفحة /dalil (الدليل الكامل).
 *   - أفقي scrollable مع أسهم للتنقل على الديسكتوب.
 *
 * بيستخدم VISIBLE_ACTIVITIES من activity-catalog (المصدر الوحيد للحقيقة).
 */
export function ActivityStories({
  activities,
  shopCountByActivity,
}: {
  activities: MarketActivity[];
  shopCountByActivity?: Map<string, number>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canStart, setCanStart] = useState(false);
  const [canEnd, setCanEnd] = useState(false);

  const check = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // RTL: scrollLeft <= 0 يعني في البداية، والقيمة السالبة بتعني scroll لليمين
    const abs = Math.abs(el.scrollLeft);
    setCanStart(abs > 4); // فيه لليسار (البداية في RTL = اليمين)
    setCanEnd(abs < max - 4); // فيه لليمين (النهاية في RTL = اليسار)
  };

  useEffect(() => {
    check();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  const scrollBy = (dir: 'next' | 'prev') => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.firstElementChild?.clientWidth ?? 90;
    // RTL: "next" (لليسار، نهاية الصف) = scrollLeft سالب أكتر
    el.scrollBy({ left: w * 2.5 * (dir === 'next' ? -1 : 1), behavior: 'smooth' });
  };

  const countFor = (a: MarketActivity) => {
    if (!shopCountByActivity) return undefined;
    const n = a.query
      .split(',')
      .reduce((acc, q) => acc + (shopCountByActivity.get(q.trim()) ?? 0), 0);
    return n || undefined;
  };

  return (
    <div className="relative">
      {/* أسهم التنقل — ديسكتوب فقط */}
      <button
        type="button"
        onClick={() => scrollBy('prev')}
        disabled={!canStart}
        aria-label="الأقسام السابقة"
        className={cn(
          'hidden md:flex absolute z-20 top-1/2 -translate-y-1/2 right-0 translate-x-1',
          'w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700',
          'items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700',
          'disabled:opacity-0 disabled:pointer-events-none transition-all'
        )}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => scrollBy('next')}
        disabled={!canEnd}
        aria-label="الأقسام التالية"
        className={cn(
          'hidden md:flex absolute z-20 top-1/2 -translate-y-1/2 left-0 -translate-x-1',
          'w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700',
          'items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700',
          'disabled:opacity-0 disabled:pointer-events-none transition-all'
        )}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* تدرّج لطيف على الحواف عشان الـ scroll يبان ناعم */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10" />

      {/* الصف نفسه */}
      <div
        ref={scrollerRef}
        className="flex items-start gap-3 md:gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* كل قسم = دائرة ستوريز */}
        {activities.map((a, i) => {
          const theme = getActivityTheme(a.id);
          const count = countFor(a);
          return (
            <Link
              key={a.id}
              href={`/activity/${a.id}`}
              className="group snap-start shrink-0 flex flex-col items-center gap-1.5 w-[72px] md:w-[88px] focus-visible:outline-none"
              aria-label={`${a.label.ar} — تصفح القسم`}
            >
              {/* الدائرة بحلقة لونية */}
              <div
                className="relative w-16 h-16 md:w-20 md:h-20 rounded-full p-[2.5px] transition-transform duration-300 group-hover:scale-105 group-active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                }}
              >
                <div className="absolute inset-0 rounded-full p-[3px] bg-white dark:bg-slate-900">
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10">
                    <Image
                      src={a.image}
                      alt={a.label.ar}
                      fill
                      sizes="(max-width: 768px) 64px, 80px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      priority={i < 4}
                    />
                  </div>
                </div>
                {/* نقطة متجر صغيرة لو فيه عدّاد */}
                {count != null && count > 0 && (
                  <span
                    className="absolute -bottom-0.5 -left-0.5 min-w-[20px] h-5 px-1 rounded-full text-white text-[9px] md:text-[10px] font-black flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900"
                    style={{ backgroundColor: theme.accent }}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>
              {/* الاسم */}
              <span className="text-center text-[10.5px] md:text-[12px] font-bold text-slate-700 dark:text-slate-200 leading-tight line-clamp-2 w-full">
                {a.label.ar}
              </span>
            </Link>
          );
        })}

        {/* الدائرة الأخيرة = "الكل" → /dalil */}
        <Link
          href="/dalil"
          className="group snap-start shrink-0 flex flex-col items-center gap-1.5 w-[72px] md:w-[88px] focus-visible:outline-none"
          aria-label="كل الأقسام والمتاجر"
        >
          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full p-[2.5px] bg-gradient-to-br from-brand-orange to-brand-amber transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
            <div className="absolute inset-0 rounded-full p-[3px] bg-white dark:bg-slate-900">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-brand-orange-light/20 to-brand-amber/20 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10">
                <LayoutGrid className="w-6 h-6 md:w-7 md:h-7 text-brand-orange group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </div>
          <span className="text-center text-[10.5px] md:text-[12px] font-black text-brand-orange dark:text-brand-amber leading-tight w-full">
            الكل
          </span>
        </Link>
      </div>
    </div>
  );
}
