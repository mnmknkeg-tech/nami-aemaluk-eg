import { PageHeaderSkeleton, Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12" aria-busy>
      <span className="sr-only">جاري التحميل...</span>
      <PageHeaderSkeleton className="mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form column */}
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
        {/* Summary column */}
        <div className="space-y-3">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}
