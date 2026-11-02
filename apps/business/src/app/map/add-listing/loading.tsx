import { Skeleton, TextSkeleton } from '@/components/ui/Skeleton';

export default function AddMapListingLoading() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12" dir="rtl">
      <div className="mx-auto w-full max-w-2xl" aria-hidden="true">
        {/* مؤشر الخطوات */}
        <div className="mb-8 flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-1 items-center gap-2">
              <Skeleton rounded="full" className="h-9 w-9 flex-shrink-0" />
              {i < 2 && <Skeleton rounded="sm" className="h-1 flex-1" />}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <Skeleton rounded="lg" className="mb-3 h-7 w-2/3" />
          <TextSkeleton lines={2} className="mb-8" />
          <div className="space-y-5">
            <div>
              <Skeleton rounded="sm" className="mb-2 h-3.5 w-24" />
              <Skeleton rounded="xl" className="h-12 w-full" />
            </div>
            <div>
              <Skeleton rounded="sm" className="mb-2 h-3.5 w-32" />
              <Skeleton rounded="xl" className="h-28 w-full" />
            </div>
            <div>
              <Skeleton rounded="sm" className="mb-2 h-3.5 w-20" />
              <Skeleton rounded="xl" className="h-12 w-full" />
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <Skeleton rounded="xl" className="h-12 w-28" />
            <Skeleton rounded="xl" className="h-12 w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}
