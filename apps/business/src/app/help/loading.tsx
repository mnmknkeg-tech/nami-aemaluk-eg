import { DarkHeadingSkeleton, IconCardRowSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function HelpLoading() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <section className="bg-slate-950 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <DarkHeadingSkeleton />
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <IconCardRowSkeleton count={2} />
          <div className="mt-12 text-center">
            <Skeleton rounded="sm" className="mx-auto h-4 w-32" />
          </div>
        </div>
      </section>
    </div>
  );
}
