import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Store } from 'lucide-react';
import type { Shop } from '@/lib/services';
import { getActivityTheme } from '@/lib/activity-catalog';
import { cn } from '@/lib/utils';

export function ShopCard({ shop }: { shop: Shop }) {
  const coverImage = shop.coverImage || shop.banner || shop.logo || '/placeholder-shop.png';
  const theme = getActivityTheme(shop.activity || shop.category || '');

  return (
    <Link
      href={`/shop/${shop.slug}`}
      className="card-contain group block bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/70 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Cover with gradient fallback + theme ribbon */}
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${theme.from}33, ${theme.to}33)` }}
        />
        <Image
          src={coverImage}
          alt={shop.name || 'متجر'}
          fill
          loading="lazy"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Logo chip */}
        <div className="absolute bottom-2.5 right-2.5 w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 border border-white/40 shadow-lg flex items-center justify-center overflow-hidden">
          {shop.logo ? (
            <Image
              src={shop.logo}
              alt={shop.name || 'متجر'}
              width={44}
              height={44}
              className="object-cover w-full h-full"
            />
          ) : (
            <Store className="w-5 h-5" style={{ color: theme.accent }} />
          )}
        </div>
        {shop.isApproved === false && (
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-amber-500/95 rounded-full text-white text-[10px] font-black shadow">
            قيد المراجعة
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 md:p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="font-black text-sm md:text-base text-slate-900 dark:text-white truncate flex-1">
            {shop.name}
          </h3>
          {shop.isVerified && (
            <span
              className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${theme.accent}14`, color: theme.accent }}
            >
              موثّق
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold">
          {shop.city && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              {shop.city}
              {shop.district ? ` - ${shop.district}` : ''}
            </span>
          )}
          {shop.rating != null && shop.rating > 0 && (
            <span
              className={cn(
                'mr-auto shrink-0 inline-flex items-center gap-0.5 text-amber-500 font-black'
              )}
            >
              ★ {shop.rating.toFixed(1)}
            </span>
          )}
        </div>

        {shop.bio && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold line-clamp-1 mt-1.5">
            {shop.bio}
          </p>
        )}

        {(shop.productCount != null || shop.followerCount != null) && (
          <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400">
            {shop.productCount != null && shop.productCount > 0 && (
              <span
                className="px-2 py-1 rounded-lg"
                style={{ backgroundColor: `${theme.accent}0D`, color: theme.accent }}
              >
                {shop.productCount} منتج
              </span>
            )}
            {shop.followerCount != null && shop.followerCount > 0 && (
              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                {shop.followerCount} متابع
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
