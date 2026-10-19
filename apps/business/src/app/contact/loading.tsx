import { DarkHeadingSkeleton, IconCardRowSkeleton } from '@/components/ui/Skeleton';

export default function ContactLoading() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <section className="bg-slate-950 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <DarkHeadingSkeleton />
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <IconCardRowSkeleton count={4} />
        </div>
      </section>
    </div>
  );
}
