import { Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-brand-black" aria-busy>
      <span className="sr-only">جاري التحميل...</span>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 space-y-4">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-[70vh] md:h-[74vh] rounded-2xl" />
      </div>
    </div>
  );
}
