type SkeletonProps = {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'none';
  /** Skeleton for dark sections (bg-slate-950) instead of light surfaces. */
  dark?: boolean;
};

const ROUNDED = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-[2rem]',
  full: 'rounded-full',
  none: 'rounded-none',
} as const;

export function Skeleton({ className = '', rounded = 'md', dark = false }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`bl-skeleton ${dark ? 'bl-skeleton-dark' : ''} ${ROUNDED[rounded]} ${className}`.trim()}
    />
  );
}

export function TextSkeleton({
  lines = 3,
  className = '',
  dark = false,
}: {
  lines?: number;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div className={`space-y-2.5 ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          dark={dark}
          rounded="sm"
          className={`h-3.5 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

/** H1 + subtitle centred on a light section (features/help style). */
export function PageHeadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`text-center ${className}`.trim()} aria-hidden="true">
      <Skeleton rounded="lg" className="mx-auto mb-6 h-12 w-2/3 max-w-xl md:h-16" />
      <TextSkeleton lines={2} className="mx-auto max-w-2xl" />
    </div>
  );
}

/** H1 + subtitle on the dark `bg-slate-950` band (about/blog/contact...). */
export function DarkHeadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`text-center ${className}`.trim()} aria-hidden="true">
      <Skeleton dark rounded="lg" className="mx-auto mb-6 h-12 w-1/2 max-w-md md:h-16" />
      <TextSkeleton dark lines={2} className="mx-auto max-w-2xl" />
    </div>
  );
}

/** `bg-slate-50 rounded-[2rem] p-8` card: icon + title + line. */
export function IconCardRowSkeleton({ count = 2 }: { count?: number }) {
  const cols = Math.min(Math.max(count, 2), 3);
  return (
    <div className={`grid grid-cols-1 gap-6 md:grid-cols-${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-slate-50 rounded-[2rem] p-8">
          <Skeleton rounded="lg" className="mb-4 h-8 w-8" />
          <Skeleton rounded="sm" className="mb-2.5 h-5 w-2/3" />
          <Skeleton rounded="sm" className="h-3.5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Legal pages: stacked heading + paragraphs. */
export function ProseSkeleton({ sections = 4 }: { sections?: number }) {
  return (
    <div className="max-w-3xl mx-auto px-6" aria-hidden="true">
      {Array.from({ length: sections }).map((_, s) => (
        <div key={s} className="mb-8">
          <Skeleton rounded="lg" className="mb-4 h-7 w-1/3" />
          <TextSkeleton lines={3} />
        </div>
      ))}
      <Skeleton rounded="sm" className="h-3.5 w-32" />
    </div>
  );
}

/** Card grid on a dark background (download-app). */
export function DarkCardGridSkeleton({ count = 3 }: { count?: number }) {
  const cols = Math.min(Math.max(count, 2), 3);
  return (
    <div className={`grid grid-cols-1 gap-6 md:grid-cols-${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <Skeleton dark rounded="lg" className="mx-auto mb-4 h-8 w-8" />
          <Skeleton dark rounded="sm" className="mx-auto mb-3 h-5 w-1/2" />
          <Skeleton dark rounded="sm" className="mx-auto h-3.5 w-3/4" />
          <Skeleton dark rounded="xl" className="mt-6 h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

/** `/` — landing: header, split hero, marketing bands, footer. */
export function HomeSkeleton() {
  return (
    <div className="min-h-screen w-full bg-white" dir="rtl">
      <header className="border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton rounded="xl" className="h-9 w-9" />
            <Skeleton rounded="sm" className="h-5 w-24" />
          </div>
          <div className="hidden md:flex items-center gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} rounded="sm" className="h-3.5 w-20" />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Skeleton rounded="sm" className="h-4 w-12" />
            <Skeleton rounded="xl" className="h-9 w-28" />
          </div>
        </div>
      </header>

      {/* Hero: copy on the right, dashboard mockup on the left */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-10 md:gap-8 items-center">
          <div className="order-2 md:order-1 text-center md:text-right">
            <Skeleton rounded="lg" className="mb-3 md:mb-5 h-11 sm:h-14 md:h-16 w-[90%]" />
            <Skeleton rounded="lg" className="mb-6 md:mb-8 h-11 sm:h-14 md:h-16 w-[70%]" />
            <TextSkeleton lines={2} className="max-w-xl md:mx-0 mx-auto mb-6 md:mb-8" />
            <div className="flex flex-col sm:flex-row items-center md:items-start gap-3">
              <Skeleton rounded="xl" className="h-12 w-full sm:w-56" />
              <Skeleton rounded="xl" className="h-12 w-full sm:w-48" />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="rounded-3xl overflow-hidden border border-slate-200/80 bg-white">
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 border-b border-slate-200/80">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <Skeleton rounded="md" className="mx-auto h-6 w-40" />
              </div>
              <Skeleton rounded="none" className="h-72 sm:h-96 w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Marketing sections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-16">
        <div>
          <Skeleton rounded="lg" className="mb-8 h-8 w-64" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 p-6">
                <Skeleton rounded="xl" className="mb-4 h-12 w-12" />
                <Skeleton rounded="sm" className="mb-2.5 h-4 w-2/3" />
                <TextSkeleton lines={2} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <Skeleton rounded="lg" className="mb-8 h-8 w-56" />
          <Skeleton rounded="2xl" className="h-72 w-full" />
        </div>
        <div>
          <Skeleton rounded="lg" className="mb-8 h-8 w-48" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 p-6">
                <Skeleton rounded="xl" className="mb-4 h-10 w-10" />
                <Skeleton rounded="sm" className="mb-2 h-4 w-3/4" />
                <Skeleton rounded="sm" className="h-3.5 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-slate-50">
        <div className="max-w-7xl mx-auto grid gap-8 px-4 sm:px-6 py-12 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton rounded="lg" className="mb-4 h-5 w-28" />
              <TextSkeleton lines={4} />
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}

/** `/login`, `/signup` — centred auth card. */
export function AuthSkeleton({ withSplit = false }: { withSplit?: boolean }) {
  return (
    <div className="min-h-[80vh] w-full bg-white px-4 py-16" dir="rtl">
      <div
        className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        aria-hidden="true"
      >
        <Skeleton rounded="xl" className="mx-auto mb-6 h-16 w-16" />
        <Skeleton rounded="lg" className="mx-auto mb-3 h-7 w-40" />
        <Skeleton rounded="sm" className="mx-auto mb-8 h-4 w-56" />
        <div className="space-y-5">
          <div>
            <Skeleton rounded="sm" className="mb-2 h-3.5 w-20" />
            <Skeleton rounded="xl" className="h-12 w-full" />
          </div>
          <div>
            <Skeleton rounded="sm" className="mb-2 h-3.5 w-24" />
            <Skeleton rounded="xl" className="h-12 w-full" />
          </div>
          {withSplit && (
            <div className="grid grid-cols-2 gap-4">
              <Skeleton rounded="xl" className="h-12 w-full" />
              <Skeleton rounded="xl" className="h-12 w-full" />
            </div>
          )}
          <Skeleton rounded="xl" className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
