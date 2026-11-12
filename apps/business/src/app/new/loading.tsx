import { Skeleton, TextSkeleton } from '@/components/ui/Skeleton';

function GridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 p-6 text-center">
          <Skeleton rounded="xl" className="mx-auto mb-4 h-14 w-14" />
          <Skeleton rounded="sm" className="mx-auto mb-2.5 h-4 w-3/4" />
          <Skeleton rounded="sm" className="mx-auto h-3.5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function NewLoading() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Brand nav */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton rounded="lg" className="h-10 w-10" />
          <Skeleton rounded="sm" className="h-5 w-28" />
        </div>
        <Skeleton rounded="full" className="h-9 w-40" />
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-20 text-center">
        <div aria-hidden="true">
          <Skeleton rounded="lg" className="mx-auto mb-5 h-12 w-4/5 max-w-2xl md:h-16" />
          <Skeleton rounded="lg" className="mx-auto mb-8 h-12 w-3/5 max-w-xl md:h-16" />
          <TextSkeleton lines={2} className="mx-auto max-w-xl" />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <Skeleton rounded="lg" className="mb-10 mx-auto h-8 w-72" />
        <GridSkeleton count={8} />
      </section>

      {/* Services */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="text-center mb-10" aria-hidden="true">
          <Skeleton rounded="lg" className="mx-auto mb-4 h-8 w-64" />
          <Skeleton rounded="sm" className="mx-auto h-4 w-72" />
        </div>
        <GridSkeleton count={4} />
      </section>
    </div>
  );
}
