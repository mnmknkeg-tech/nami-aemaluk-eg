// Skeleton primitives shared by the per-section loading.tsx files.
// Same visual language as the shared (main)/loading.tsx: slate bars, white
// rounded-2xl cards, animate-pulse. Server-safe (no hooks, no 'use client').

const pulse = 'bg-slate-200/70 rounded-lg animate-pulse';
const faint = 'bg-slate-100 rounded-lg animate-pulse';

export function SkeletonHeader({ actionW = 'w-28' }: { actionW?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className={`h-6 w-44 ${pulse}`} />
        <div className={`h-3.5 w-64 ${faint}`} />
      </div>
      <div className={`h-9 ${actionW} bg-slate-200/70 rounded-xl animate-pulse`} />
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  const cols =
    count >= 4
      ? 'grid-cols-2 lg:grid-cols-4'
      : count === 3
        ? 'grid-cols-2 md:grid-cols-3'
        : 'grid-cols-2';
  return (
    <div className={`grid gap-3 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <div className={`h-3.5 w-20 ${faint}`} />
          <div className={`h-7 w-28 ${pulse}`} />
          <div className={`h-3 w-16 ${faint}`} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className={`h-9 flex-1 min-w-48 ${faint}`} />
      <div className={`h-9 w-20 ${faint}`} />
      <div className={`h-9 w-20 ${faint}`} />
      <div className={`h-9 w-9 rounded-xl ${faint}`} />
    </div>
  );
}

const TABLE_COLS = 'grid grid-cols-[14%_28%_16%_26%_16%] gap-3';

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
      <div className={`${TABLE_COLS}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-3 ${faint}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${TABLE_COLS} items-center`} style={{ opacity: 1 - i * 0.12 }}>
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="h-9 rounded-xl bg-slate-50 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <div className={`h-10 w-10 rounded-xl ${faint}`} />
          <div className={`h-4 w-24 ${pulse}`} />
          <div className={`h-3 w-full ${faint}`} />
          <div className={`h-3 w-2/3 ${faint}`} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-100 p-3.5 flex items-center gap-3"
          style={{ opacity: 1 - i * 0.1 }}
        >
          <div className={`h-9 w-9 rounded-full shrink-0 ${faint}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-3.5 w-2/3 ${pulse}`} />
            <div className={`h-3 w-1/3 ${faint}`} />
          </div>
          <div className={`h-6 w-6 rounded-full shrink-0 ${faint}`} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPanel({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-[30%_1fr] gap-3 items-center">
          <div className={`h-3.5 w-3/4 ${faint}`} />
          <div
            className="h-10 rounded-xl bg-slate-50 animate-pulse"
            style={{ opacity: 1 - i * 0.1 }}
          />
        </div>
      ))}
    </div>
  );
}
