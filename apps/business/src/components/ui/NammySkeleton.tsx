import { Skeleton, TextSkeleton } from './Skeleton';

/**
 * هياكل التحميل (Skeletons) لصفحات «نمّي أعمالك» — على روح التصميم الجديد:
 * نفس هندسة DesktopHeader / NammyPageShell / CenterLauncher عشان الانتقال
 * من التحميل للمحتوى ما يعملش قفزة في التخطيط (CLS).
 *
 * بتعيد استخدام bl-skeleton في globals.css (sweep + احترام prefers-reduced-motion).
 */

/** طبقة خلفية بنفس مكان خلفية نمّي (تدرّج خفيف بدل الصورة الثقيلة لحد ما تنزل) */
function SkeletonShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="relative min-h-screen w-full flex flex-col overflow-x-hidden"
    >
      <div aria-hidden="true" className="fixed inset-0 -z-20 bg-gradient-to-b from-sky-100 via-indigo-50 to-amber-50" />
      <div aria-hidden="true" className="fixed inset-0 -z-10 ambient-glow pointer-events-none" />
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** نفس صفوف DesktopHeader: لوجو + سطرَي الاسم، وقرص اللغة + الزرّين */
function HeaderBarSkeleton() {
  return (
    <header aria-hidden="true" className="w-full px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Skeleton rounded="xl" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0" />
        <div className="space-y-1">
          <Skeleton rounded="sm" className="h-3.5 w-24" />
          <Skeleton rounded="sm" className="h-2.5 w-16" />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-2.5">
        <Skeleton rounded="full" className="h-8 w-8 sm:h-9 sm:w-9" />
        <Skeleton rounded="full" className="h-8 w-20 sm:w-24" />
        <Skeleton rounded="full" className="h-8 w-24 sm:w-28" />
      </div>
    </header>
  );
}

/** نفس إطار NammyPageShell (النافذة البيضاء + شريطها العلوي) */
function WindowFrameSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <main aria-hidden="true" className="flex-1 flex items-start justify-center px-2 sm:px-4 md:px-6 pt-1 pb-8 sm:pt-2">
      <div className="w-full max-w-5xl min-h-[88vh] flex flex-col rounded-3xl border border-slate-200/90 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.35)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 sm:py-3 border-b border-slate-100">
          <Skeleton rounded="full" className="h-9 w-9" />
          <div className="flex items-center gap-2">
            <Skeleton rounded="full" className="h-7 w-24" />
            <Skeleton rounded="md" className="h-8 w-8" />
          </div>
        </div>
        <div className="flex-1 p-4 sm:p-8 md:p-10 space-y-8 bg-[#FAFAFA]/60">{children}</div>
      </div>
    </main>
  );
}

/** عنوان الصفحة: شارة + عنوان كبير + سطر تعريفي (نفس تسلسل *PageView) */
function PageHeadingSkeleton() {
  return (
    <div className="text-center space-y-4">
      <Skeleton rounded="full" className="mx-auto h-6 w-40" />
      <Skeleton rounded="lg" className="mx-auto h-10 w-full max-w-md sm:h-12" />
      <TextSkeleton lines={2} className="mx-auto max-w-xl" />
    </div>
  );
}

/** شبكة كروت (أيقونة + عنوان + سطرين) — نفس كروت الحلول/الأنشطة/الأسعار */
function CardGridSkeleton({ count, cols }: { count: number; cols: 2 | 3 }) {
  const gridClass =
    cols === 3
      ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3'
      : 'grid grid-cols-1 gap-6 sm:grid-cols-2';
  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <Skeleton rounded="lg" className="mb-4 h-10 w-10" />
          <Skeleton rounded="sm" className="mb-2.5 h-4 w-2/3" />
          <TextSkeleton lines={2} />
        </div>
      ))}
    </div>
  );
}

/** سطح مكتب نمّي ('/'): الهيدر + الأيقونات الجانبية + اللانشر + شريط المحمول السفلي */
export function NammyDesktopSkeleton() {
  return (
    <SkeletonShell label="جارٍ تحميل سطح مكتب نمّي">
      <HeaderBarSkeleton />

      {/* الأيقونات العائمة (نفس hidden lg:flex في DesktopShortcuts) */}
      <div aria-hidden="true" className="hidden lg:flex flex-col gap-6 absolute top-24 left-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton rounded="md" className="h-7 w-7" />
            <Skeleton rounded="full" className="h-4 w-16" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="hidden lg:flex flex-col gap-6 absolute top-24 right-6">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton rounded="md" className="h-7 w-7" />
            <Skeleton rounded="full" className="h-4 w-16" />
          </div>
        ))}
      </div>

      <main
        aria-hidden="true"
        className="flex-1 flex flex-col items-center justify-start pt-5 sm:pt-9 md:pt-12 pb-16 sm:pb-8 px-3"
      >
        <div className="w-full max-w-2xl flex flex-col items-center">
          {/* صف الأيقونات الستة */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-7 flex-wrap mb-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Skeleton rounded="md" className="h-9 w-9 sm:h-10 sm:w-10" />
                <Skeleton rounded="full" className="h-4 w-14" />
              </div>
            ))}
          </div>

          {/* حقل البحث (Search Pill) + مقترحاته */}
          <div className="w-full max-w-xl">
            <Skeleton rounded="full" className="h-12 w-full sm:h-14" />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} rounded="full" className="h-5 w-24" />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* شريط الاختصارات السفلي على المحمول */}
      <div aria-hidden="true" className="lg:hidden fixed bottom-3 inset-x-2 flex justify-center">
        <div className="glass-panel flex items-center gap-2 p-1.5 rounded-full overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} rounded="full" className="h-7 w-20 shrink-0" />
          ))}
        </div>
      </div>
    </SkeletonShell>
  );
}

/** صفحة نمّي داخل إطار النافذة (/home, /solutions, /activities, /men-makanak, /pricing, /faq) */
export function NammyWindowSkeleton({ label = 'جارٍ تحميل الصفحة' }: { label?: string }) {
  return (
    <SkeletonShell label={label}>
      <HeaderBarSkeleton />
      <WindowFrameSkeleton>
        <PageHeadingSkeleton />
        <CardGridSkeleton count={3} cols={3} />
        <div className="space-y-4">
          <Skeleton rounded="lg" className="mx-auto h-8 w-56" />
          <CardGridSkeleton count={6} cols={3} />
        </div>
      </WindowFrameSkeleton>
    </SkeletonShell>
  );
}

/** محاور الذكاء الاصطناعي في /ai-chat (نفس تسلسل AiResponseWorkspace) */
export function NammyAiChatSkeleton({ label = 'جارٍ تحميل محاور نمّي الذكي' }: { label?: string }) {
  return (
    <SkeletonShell label={label}>
      <HeaderBarSkeleton />
      <WindowFrameSkeleton>
        <div className="space-y-6 pt-2">
          {/* فقاعة سؤال المستخدم */}
          <div className="flex justify-start">
            <Skeleton rounded="xl" className="h-11 w-60 max-w-[80%]" />
          </div>

          {/* بطاقة الرد: عنوان + وصف + 3 مؤشرات + تفاصيل + زر إجراء */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 space-y-5">
            <div className="space-y-3">
              <Skeleton rounded="full" className="h-6 w-32" />
              <Skeleton rounded="md" className="h-7 w-full max-w-lg" />
            </div>
            <TextSkeleton lines={3} className="max-w-2xl" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-200/80 p-4 space-y-2">
                  <Skeleton rounded="sm" className="h-3 w-20" />
                  <Skeleton rounded="md" className="h-6 w-24" />
                </div>
              ))}
            </div>
            <TextSkeleton lines={2} />
            <Skeleton rounded="full" className="h-10 w-44" />
          </div>

          {/* مقترحات المتابعة */}
          <div className="flex flex-wrap gap-2 justify-end">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} rounded="full" className="h-7 w-28" />
            ))}
          </div>
        </div>
      </WindowFrameSkeleton>
    </SkeletonShell>
  );
}

/** النبذة والصفحات القانونية داخل النافذة (/nammy/about، /nammy/privacy، /nammy/terms) */
export function NammyLegalSkeleton({ label = 'جارٍ تحميل الصفحة' }: { label?: string }) {
  return (
    <SkeletonShell label={label}>
      <HeaderBarSkeleton />
      <WindowFrameSkeleton>
        <PageHeadingSkeleton />
        {[0, 1, 2].map((section) => (
          <div key={section} className="space-y-3">
            <Skeleton rounded="md" className="h-6 w-1/3" />
            <TextSkeleton lines={4} />
          </div>
        ))}
        <CardGridSkeleton count={2} cols={2} />
      </WindowFrameSkeleton>
    </SkeletonShell>
  );
}


