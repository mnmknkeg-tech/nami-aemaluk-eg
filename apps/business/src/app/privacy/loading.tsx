import { ProseSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function PrivacyLoading() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <section className="bg-slate-950 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center" aria-hidden="true">
          <Skeleton dark rounded="lg" className="mx-auto h-12 w-1/2 max-w-md md:h-16" />
        </div>
      </section>
      <section className="py-20">
        <ProseSkeleton sections={5} />
      </section>
    </div>
  );
}
