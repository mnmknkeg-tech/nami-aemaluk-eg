import { ShopCardSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-12 md:py-16">
      <div className="flex items-center gap-4 mb-10 animate-pulse">
        <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => <ShopCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
