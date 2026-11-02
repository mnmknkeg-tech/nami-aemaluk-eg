import { ProductGridSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-brand-black">
      <div className="h-48 md:h-72 bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 -mt-20 relative z-10">
        <div className="bg-white dark:bg-slate-900 rounded-4xl shadow-xl p-6 md:p-8 animate-pulse">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-4xl bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1 space-y-3">
              <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-12">
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
