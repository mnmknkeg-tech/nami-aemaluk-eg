import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import type { MarketActivity } from '@/lib/activity-catalog';
import { getActivityTheme } from '@/lib/activity-catalog';
import { cn } from '@/lib/utils';

export function SectionHeader({
  kicker,
  title,
  subtitle,
  icon,
  viewAllHref,
  viewAllLabel = 'عرض الكل',
  accent = '#00B8D4',
  align = 'start',
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  viewAllHref?: string;
  viewAllLabel?: string;
  accent?: string;
  align?: 'start' | 'center';
}) {
  return (
    <div
      className={cn(
        // على الموبايل العنوان والزر فوق بعض بدل ما يتزاحموا جنب بعض
        'flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 mb-5 md:mb-7',
        align === 'center' && 'items-center text-center sm:justify-center'
      )}
    >
      <div className={cn('min-w-0', align === 'center' && 'flex flex-col items-center')}>
        {kicker && (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] md:text-xs font-black mb-2"
            style={{ backgroundColor: `${accent}14`, color: accent }}
          >
            {icon}
            {kicker}
          </span>
        )}
        <h2 className="text-xl md:text-3xl font-black tracking-tight leading-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          {!kicker && icon && (
            <span
              className="w-9 h-9 md:w-11 md:h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${accent}14`, color: accent }}
            >
              {icon}
            </span>
          )}
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1.5 max-w-[48ch]">
            {subtitle}
          </p>
        )}
        <span
          className="block h-1 w-12 rounded-full mt-2.5 md:mt-3"
          style={{ background: `linear-gradient(to left, ${accent}, transparent)` }}
        />
      </div>

      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 min-h-[44px] sm:min-h-0 rounded-xl text-xs md:text-sm font-black border transition-all hover:gap-2.5 active:scale-[0.98]"
          style={{ color: accent, borderColor: `${accent}33`, backgroundColor: `${accent}0A` }}
        >
          {viewAllLabel}
          <ArrowLeft className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

export function ActivityCard({
  activity,
  shopCount,
  productCount,
}: {
  activity: MarketActivity;
  shopCount?: number;
  productCount?: number;
}) {
  const theme = getActivityTheme(activity.id);
  return (
    <Link
      href={`/activity/${activity.id}`}
      className="group relative flex h-full flex-col rounded-3xl overflow-hidden border border-slate-200/70 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] bg-white dark:bg-slate-900"
    >
      {/* Top gradient band */}
      <div
        className="relative h-20 md:h-24 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-6 -left-6 w-28 h-28 bg-white rounded-full blur-2xl" />
          <div className="absolute -bottom-8 right-8 w-24 h-24 bg-black/30 rounded-full blur-2xl" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src={activity.image}
            alt=""
            width={56}
            height={56}
            className="w-12 h-12 md:w-14 md:h-14 object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
          />
        </div>
      </div>
      {/* Label */}
      <div className="flex flex-1 flex-col p-3 md:p-4 text-center">
        <h3 className="font-black text-[13px] md:text-sm text-slate-900 dark:text-white leading-snug line-clamp-2">
          {activity.label.ar}
        </h3>
        {(shopCount != null || productCount != null) && (
          <p className="text-[10px] md:text-[11px] text-slate-400 font-bold mt-1 line-clamp-1">
            {shopCount != null && shopCount > 0 ? `${shopCount} متجر` : ''}
            {shopCount != null && shopCount > 0 && productCount != null && productCount > 0
              ? ' • '
              : ''}
            {productCount != null && productCount > 0 ? `${productCount} منتج` : ''}
          </p>
        )}
        <span
          className={cn(
            'mt-auto pt-2 inline-flex items-center justify-center gap-1 text-[10px] md:text-[11px] font-black transition-all group-hover:gap-2'
          )}
          style={{ color: theme.accent }}
        >
          تصفح القسم
          <ArrowLeft className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}
