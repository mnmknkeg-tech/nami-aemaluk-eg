import { cn } from '@/lib/utils';
import { PRODUCT_GRID_CLASS, RAIL_ITEM_WIDTH, RAIL_SCROLLER_CLASS } from '@/lib/product-layout';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-2xl', className)} />;
}

export function ShopCardSkeleton() {
  return (
    <div className="bg-white dark:bg-brand-black rounded-4xl overflow-hidden border border-slate-100 dark:border-slate-800">
      <Skeleton className="aspect-square w-full !rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * Matches the updated ProductCard layout:
 * - Rounded-2xl card
 * - Aspect-square image top
 * - Vendor pill / star
 * - 2-line title
 * - Price row + round "+" action button
 */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800',
        className
      )}
    >
      <Skeleton className="aspect-square w-full !rounded-none" />
      <div className="p-3 md:p-3.5 space-y-2 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16 !rounded-md" />
            <Skeleton className="h-3 w-8 !rounded-md" />
          </div>
          <Skeleton className="h-3.5 w-full !rounded-md" />
          <Skeleton className="h-3.5 w-3/4 !rounded-md" />
        </div>
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
          <Skeleton className="h-4 w-16 !rounded-md" />
          <Skeleton className="w-9 h-9 !rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Product grid skeleton used in shop, search, offers and category views. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={PRODUCT_GRID_CLASS}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Horizontal product rail skeleton matching `ProductRail`. */
export function ProductRailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={RAIL_SCROLLER_CLASS}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={RAIL_ITEM_WIDTH}>
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  );
}

/** A few shimmering text lines — used for titles/paragraph loading states. */
export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5 rounded-md', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

/** Shimmering list rows — orders, addresses, notifications, tracking steps. */
export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4"
        >
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 rounded-md w-1/2" />
            <Skeleton className="h-3 rounded-md w-1/3" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Page title + subtitle shimmer (replaces full-screen spinners in pages). */
export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden>
      <Skeleton className="h-8 w-48 rounded-xl" />
      <Skeleton className="h-4 w-72 rounded-md" />
    </div>
  );
}

/**
 * Full profile-section shell: dark header + stat cards + list rows.
 * Used by every profile page (orders, addresses, settings, wishlist…) while loading.
 */
export function ProfileShellSkeleton({ rows = 4, stats = 4 }: { rows?: number; stats?: number }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 md:pb-12" aria-busy>
      <span className="sr-only">جاري التحميل...</span>
      {/* Header */}
      <div className="bg-brand-black text-white py-8 px-4 md:px-6">
        <div className="max-w-[1400px] mx-auto flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-xl bg-white/20 dark:bg-white/20" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40 rounded-lg bg-white/20 dark:bg-white/20" />
            <Skeleton className="h-3.5 w-48 rounded-md bg-white/20 dark:bg-white/20" />
          </div>
        </div>
      </div>
      {/* Body */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 space-y-5">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: stats }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <ListSkeleton rows={rows} />
      </div>
    </div>
  );
}
