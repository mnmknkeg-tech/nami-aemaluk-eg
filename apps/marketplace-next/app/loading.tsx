import { ProductRailSkeleton, Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-brand-black" aria-busy>
      <span className="sr-only">جاري التحميل...</span>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-4 space-y-4">
        {/* Hero search */}
        <Skeleton className="h-14 md:h-16 rounded-2xl" />
        {/* Welcome banner */}
        <Skeleton className="aspect-[5/4] sm:aspect-[2/1] rounded-3xl md:rounded-[2.5rem]" />
        {/* Category strip */}
        <div className="flex gap-2.5 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[74px] space-y-1.5">
              <Skeleton className="w-14 h-14 rounded-2xl mx-auto" />
              <Skeleton className="h-3 rounded-md w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      </div>
      {/* Product rail rows */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40 rounded-lg" />
          <ProductRailSkeleton count={6} />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-40 rounded-lg" />
          <ProductRailSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}
