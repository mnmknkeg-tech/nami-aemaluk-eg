import { DarkCardGridSkeleton, Skeleton, TextSkeleton } from '@/components/ui/Skeleton';

export default function DownloadAppLoading() {
  return (
    <div className="min-h-screen bg-slate-950" dir="rtl">
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div aria-hidden="true">
          <Skeleton dark rounded="2xl" className="mx-auto mb-8 h-20 w-20" />
          <Skeleton dark rounded="lg" className="mx-auto mb-4 h-12 w-3/4" />
          <TextSkeleton dark lines={2} className="mx-auto max-w-xl mb-12" />
        </div>
        <DarkCardGridSkeleton count={3} />
        <div className="mt-12" aria-hidden="true">
          <Skeleton dark rounded="sm" className="mx-auto h-4 w-32" />
        </div>
      </div>
    </div>
  );
}
