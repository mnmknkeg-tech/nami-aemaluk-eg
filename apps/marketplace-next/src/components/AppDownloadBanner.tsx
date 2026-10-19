'use client';

import Image from 'next/image';

function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M3.6 1.8c-.4.4-.6 1-.6 1.7v17c0 .7.2 1.3.6 1.7l.1.1 9.5-9.5v-.2L3.7 1.7l-.1.1z" fill="#00C4FF" />
      <path d="M16.7 15.3 13.6 12.2v-.2l3.1-3.1.1.1 3.7 2.1c1.1.6 1.1 1.6 0 2.2l-3.7 2.1-.1-.1z" fill="#FFCE00" />
      <path d="m16.8 15.2-3.2-3.2-9.6 9.6c.4.4.9.4 1.6.1l11.2-6.5" fill="#FF3A44" />
      <path d="M16.8 8.8 5.6 2.4c-.7-.4-1.2-.3-1.6.1l9.6 9.6 3.2-3.3z" fill="#00E676" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.54c-.03-2.5 2.04-3.7 2.13-3.76-1.16-1.7-2.97-1.93-3.61-1.96-1.54-.16-3 .9-3.78.9-.78 0-1.98-.88-3.25-.86-1.67.03-3.21.97-4.07 2.47-1.74 3.01-.44 7.47 1.25 9.91.83 1.2 1.82 2.54 3.12 2.49 1.25-.05 1.72-.8 3.23-.8s1.93.8 3.25.78c1.34-.03 2.19-1.22 3.01-2.42.95-1.39 1.34-2.73 1.36-2.8-.03-.01-2.6-1-2.64-3.95zM14.56 5.2c.69-.83 1.15-1.99 1.02-3.14-.99.04-2.18.66-2.89 1.49-.63.73-1.19 1.91-1.04 3.04 1.1.09 2.23-.56 2.91-1.39z" />
    </svg>
  );
}

export function AppDownloadBanner() {
  return (
    <section className="px-4 md:px-6 py-6 md:pt-28 md:pb-10 lg:pt-32">
      <div className="max-w-[1400px] mx-auto">
        <div className="relative rounded-2xl md:rounded-3xl bg-gradient-to-l from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-800/60 dark:to-slate-800 border border-slate-200/70 dark:border-slate-700/50 shadow-sm">
          <div className="grid md:grid-cols-2 items-center gap-6 md:gap-4">

            {/* النصوص والأزرار */}
            <div className="order-2 md:order-1 px-6 pb-8 md:pb-0 md:py-12 md:pr-14 text-center md:text-right">
              <h2 className="text-2xl md:text-4xl font-bold text-brand-black dark:text-white mb-2 md:mb-3">
                حمّل تطبيق <span className="text-gradient">من مكانك</span>
              </h2>
              <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-semibold mb-4 md:mb-6">
                تجربة موثوقة وسهلة للتسوّق — كل ما تحتاجه في جيبك
              </p>

              <div className="flex flex-wrap gap-3 md:gap-4 justify-center md:justify-start">
                {/* Google Play */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="التطبيق قريباً على متجر جوجل بلاي"
                  className="relative flex items-center gap-3 px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md select-none cursor-default"
                >
                  <GooglePlayIcon className="w-6 h-6 md:w-8 md:h-8 shrink-0 opacity-70" />
                  <span className="text-right leading-tight">
                    <span className="block text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-semibold">حمّل التطبيق من</span>
                    <span className="block text-sm md:text-lg font-bold text-brand-black dark:text-white">متجر جوجل بلاي</span>
                  </span>
                  {/* شريط قريباً */}
                  <span className="absolute -top-2.5 -left-2 md:-left-3 px-2.5 md:px-3 py-0.5 rounded-full bg-brand-gradient text-white text-[9px] md:text-[10px] font-bold shadow-md rotate-[-6deg]">
                    قريباً
                  </span>
                </div>

                {/* App Store */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="التطبيق قريباً على متجر أبُل ستور"
                  className="relative flex items-center gap-3 px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md select-none cursor-default"
                >
                  <AppleIcon className="w-6 h-6 md:w-8 md:h-8 shrink-0 text-brand-black dark:text-white opacity-70" />
                  <span className="text-right leading-tight">
                    <span className="block text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-semibold">حمّل التطبيق من</span>
                    <span className="block text-sm md:text-lg font-bold text-brand-black dark:text-white">متجر أبُل ستور</span>
                  </span>
                  {/* شريط قريباً */}
                  <span className="absolute -top-2.5 -left-2 md:-left-3 px-2.5 md:px-3 py-0.5 rounded-full bg-brand-gradient text-white text-[9px] md:text-[10px] font-bold shadow-md rotate-[-6deg]">
                    قريباً
                  </span>
                </div>
              </div>
            </div>

            {/* صورة الموبايل — على الديسكتوب: في أقصى اليسار طالعة من فوق البنر */}
            <div className="order-1 md:order-2 relative w-[160px] h-[230px] sm:w-[190px] sm:h-[270px] md:w-[250px] md:h-[calc(100%+80px)] lg:w-[300px] lg:h-[calc(100%+110px)] mt-4 md:mt-0 md:absolute md:bottom-0 md:left-0 md:pointer-events-none">
              <Image
                src="/images/app-mockup.png"
                alt="تطبيق من مكانك على الموبايل"
                fill
                sizes="(max-width: 768px) 200px, 340px"
                className="object-cover object-top drop-shadow-2xl"
                priority
              />
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
