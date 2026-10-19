import { DarkHeadingSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function BlogLoading() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <section className="bg-slate-950 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <DarkHeadingSkeleton />
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6 text-center" aria-hidden="true">
          <Skeleton rounded="xl" className="mx-auto mb-4 h-12 w-12" />
          <Skeleton rounded="lg" className="mx-auto mb-3 h-7 w-32" />
          <Skeleton rounded="sm" className="mx-auto mb-8 h-4 w-96 max-w-full" />
          <Skeleton rounded="sm" className="mx-auto h-4 w-40" />
        </div>
      </section>
    </div>
  );
}
