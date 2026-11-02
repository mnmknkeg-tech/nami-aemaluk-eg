import { PageHeaderSkeleton, ProductGridSkeleton, Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12" aria-busy>
      <span className="sr-only">جاري التحميل...</span>
      <PageHeaderSkeleton className="mb-6" />
      <Skeleton className="h-14 rounded-xl max-w-2xl mb-8" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
