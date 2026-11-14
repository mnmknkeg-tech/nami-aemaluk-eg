import { SkeletonHeader } from '@/components/skeletons';

// POS opens into a product-grid + cart layout — mirror that shape so the
// skeleton doesn't jump when the register mounts.
export default function Loading() {
  return (
    <div className="p-4 md:p-6 space-y-4 animate-in fade-in duration-200">
      <SkeletonHeader actionW="w-36" />
      <div className="flex gap-3">
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
              <div className="h-12 w-12 rounded-xl bg-slate-100 animate-pulse" />
              <div className="h-3.5 w-4/5 bg-slate-200/70 rounded-lg animate-pulse" />
              <div className="h-3 w-1/2 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
        <div className="hidden md:block w-72 bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shrink-0">
          <div className="h-5 w-24 bg-slate-200/70 rounded-lg animate-pulse" />
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-slate-50 animate-pulse"
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
          <div className="h-11 rounded-xl bg-slate-200/70 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
