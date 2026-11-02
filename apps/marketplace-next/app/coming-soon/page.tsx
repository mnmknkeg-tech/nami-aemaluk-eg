import type { Metadata } from 'next';
import { Rocket, Hammer, Bell, Store, MapPin } from 'lucide-react';
import { siteConfig } from '@/lib/config';

// نُجبر الصفحة تتعمل rendered لكل طلب (مش static prerender) لتفادي أي مشاكل
// prerender مع Next 16، وكمان عشان دايمًا تظهر أحدث نسخة.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'قيد التطوير',
  description:
    'منصة من مكانك قيد التطوير — قريباً توصّل متجرك لعملاء حواليك. سجّل اهتمامك من دلوقتي.',
  robots: { index: true, follow: true },
};

export default function ComingSoonPage() {
  return (
    <main
      dir="rtl"
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0B1220] text-white px-5 py-16"
    >
      {/* خلفية متدرجة ناعمة */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto text-center space-y-8">
        {/* اللوجو / البراند */}
        <div className="flex items-center justify-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30 flex items-center justify-center">
            <MapPin size={26} strokeWidth={2.3} className="text-white" />
          </span>
          <span className="leading-tight text-right">
            <span className="block font-black text-2xl">{siteConfig.nameArabic}</span>
            <span className="block text-xs font-bold text-sky-300 tracking-widest" dir="ltr">
              {siteConfig.name}
            </span>
          </span>
        </div>

        {/* شارة قيد التطوير */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1.5 text-xs font-black text-sky-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
            </span>
            قيد التطوير
          </span>
        </div>

        {/* العنوان */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            بنبنى حاجة{' '}
            <span className="bg-gradient-to-l from-sky-400 to-cyan-300 bg-clip-text text-transparent">
              كبيرة
            </span>
            <br />
            تيجي قريب.
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto font-medium leading-relaxed">
            منصة <span className="font-black text-white">من مكانك</span> قيد التطوير — هنوصّل متاجرك
            لعملاء حواليك على الخريطة، بعروض محلية، وبمبيعات حقيقية. خلّينا نسجّلك من دلوقتي تكون من
            أوّل اللي يجرّبوه.
          </p>
        </div>

        {/* شريط تقدّم */}
        <div className="max-w-md mx-auto space-y-2 pt-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Hammer size={13} className="text-sky-400" />
              جاري التجهيز
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Rocket size={13} className="text-sky-400" />
              الإطلاق قريباً
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-l from-sky-500 to-cyan-400" />
          </div>
        </div>

        {/* فيتشر تيزرات */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {[
            { icon: MapPin, text: 'ظهور متاجرك على الخريطة للزبائن اللي حواليك.' },
            { icon: Store, text: 'متجر إلكتروني جاهز بهويتك الخاصة.' },
            { icon: Bell, text: 'عروض محلية بتوصل للعميل في منطقته.' },
          ].map((t, i) => {
            const Icon = t.icon;
            return (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3 text-right backdrop-blur-xs"
              >
                <span className="shrink-0 w-9 h-9 rounded-xl bg-sky-400/15 text-sky-300 flex items-center justify-center">
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-200 leading-relaxed">
                  {t.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="pt-2">
          <a
            href={siteConfig.businessUrl}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-l from-sky-500 to-cyan-400 hover:from-sky-600 hover:to-cyan-500 text-white font-black text-sm shadow-lg shadow-sky-500/25 transition-transform hover:scale-105 active:scale-95"
          >
            <Bell size={16} strokeWidth={2.4} />
            سجّل اهتمامك من دلوقتي
          </a>
        </div>

        <p className="text-[11px] text-slate-500 font-bold pt-2">
          © {new Date().getFullYear()} {siteConfig.nameArabic}. بنبنيهالك بإتقان.
        </p>
      </div>
    </main>
  );
}
