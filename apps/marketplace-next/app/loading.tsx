import { ProductRailSkeleton, Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-brand-black" aria-busy>
      <span className="sr-only">جاري التحميل...</span>
      {/* الهيكل مطابق للصفحة الحالية: بحث ← الأقسام ← صفوف المنتجات (من غير بنر) */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-1 md:pt-2 pb-4 md:pb-6 space-y-3">
        {/* Hero search */}
        <Skeleton className="h-14 md:h-16 rounded-2xl" />
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
