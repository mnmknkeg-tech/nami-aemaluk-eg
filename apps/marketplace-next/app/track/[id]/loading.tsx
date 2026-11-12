import { ListSkeleton, PageHeaderSkeleton, Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6" aria-busy>
      <span className="sr-only">جاري تحميل الطلب...</span>
      <PageHeaderSkeleton />
      <Skeleton className="h-32 rounded-2xl" />
      {/* Status timeline */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
            <Skeleton className="h-4 rounded-md flex-1" />
          </div>
        ))}
      </div>
      <ListSkeleton rows={3} />
    </div>
  );
}
