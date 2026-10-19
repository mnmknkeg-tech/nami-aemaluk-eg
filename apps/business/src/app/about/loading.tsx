import { IconCardRowSkeleton, Skeleton, DarkHeadingSkeleton } from '@/components/ui/Skeleton';

export default function AboutLoading() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <section className="bg-slate-950 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <DarkHeadingSkeleton />
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          {/* رسالتنا / رؤيتنا */}
          <IconCardRowSkeleton count={2} />

          {/* قيمنا */}
          <div className="mt-12">
            <Skeleton rounded="lg" className="mb-8 mx-auto h-7 w-40" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="text-center p-6 rounded-[2rem] border border-slate-100">
                  <Skeleton rounded="lg" className="mx-auto mb-3 h-8 w-8" />
                  <Skeleton rounded="sm" className="mx-auto mb-2 h-4 w-2/3" />
                  <Skeleton rounded="sm" className="mx-auto h-3.5 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA داكن */}
      <section className="bg-slate-950 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center" aria-hidden="true">
          <Skeleton dark rounded="lg" className="mx-auto mb-4 h-8 w-56" />
          <Skeleton dark rounded="sm" className="mx-auto mb-8 h-4 w-80" />
          <Skeleton dark rounded="xl" className="mx-auto h-14 w-52" />
        </div>
      </section>
    </div>
  );
}
