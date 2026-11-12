import { PageHeadingSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function FeaturesLoading() {
  return (
    <div className="min-h-screen bg-white pt-16" dir="rtl">
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <PageHeadingSkeleton />
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-16">
          {Array.from({ length: 5 }).map((_, g) => (
            <div key={g} className="flex flex-col md:flex-row gap-8 items-start">
              <Skeleton rounded="xl" className="flex-shrink-0 h-16 w-16" />
              <div className="flex-1 w-full">
                <Skeleton rounded="lg" className="mb-4 h-7 w-56" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 5 }).map((_, f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Skeleton rounded="full" className="h-2 w-2 flex-shrink-0" />
                      <Skeleton rounded="sm" className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-brand-black">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center" aria-hidden="true">
          <Skeleton dark rounded="lg" className="mx-auto mb-6 h-8 w-3/4 max-w-lg" />
          <Skeleton rounded="xl" className="mx-auto h-14 w-48" />
        </div>
      </section>
    </div>
  );
}
