import Link from 'next/link';
import Image from 'next/image';
import type { MarketActivity } from '@/lib/activity-catalog';

/**
 * بلاطة القسم — صورة حقيقية مربعة + الاسم تحتها (ستايل أحسن تطبيقات مصر).
 * من غير كارت وخلفية وبوردر: الصورة هي البطل، والنص في مكانه الصح.
 * الحجم صغير ومتساوي على كل الشاشات: 4 أعمدة موبايل ← 8 أعمدة ديسكتوب.
 */
export function ActivityTile({
  activity,
  shopCount,
  priority = false,
}: {
  activity: MarketActivity;
  shopCount?: number;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/activity/${activity.id}`}
      className="group flex flex-col items-center gap-2 min-w-0 focus-visible:outline-none"
      aria-label={`${activity.label.ar} — تصفح القسم`}
    >
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-slate-900/10 group-hover:-translate-y-0.5 group-active:scale-95">
        <Image
          src={activity.image}
          alt={activity.label.ar}
          fill
          sizes="(max-width: 640px) 25vw, (max-width: 768px) 20vw, (max-width: 1024px) 14vw, 12.5vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          priority={priority}
        />
      </div>
      <span className="w-full text-center text-[11px] md:text-[13px] font-black text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
        {activity.label.ar}
      </span>
      {shopCount != null && shopCount > 0 && (
        <span className="-mt-1 text-[9px] md:text-[10px] font-bold text-slate-400">
          {shopCount} متجر
        </span>
      )}
    </Link>
  );
}
