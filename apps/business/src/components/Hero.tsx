'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function Hero() {
  return (
    <section className="biz-hero relative overflow-hidden">
      {/* سحاب زي صفحة "جديد" */}
      <span className="biz-cloud biz-cloud-top" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="biz-cloud biz-cloud-right" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-10 md:gap-8 items-center">
          {/* Text content - right side (RTL) */}
          <div className="order-2 md:order-1 text-center md:text-right">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-3 md:mb-5 leading-[1.1] text-slate-900">
              تجارتك على أرض الواقع..
              <br />
              <span className="bl-gradient-text">وإدارتها في إيدك.</span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-lg md:text-xl max-w-xl md:mx-0 mx-auto mb-6 md:mb-8 leading-relaxed">
              من أول محل.. لأكبر منظومة. أدوات تساعدك تبيع، تدير، تتابع وتكبّر — كل ده في مكان واحد.
            </p>

            <div className="flex flex-col sm:flex-row items-center md:items-start gap-3">
              <Link
                href="/signup"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0057FF] text-white px-8 py-3.5 rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              >
                ابدأ تجارتك بشكل أذكى
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/features"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-slate-800 px-8 py-3.5 rounded-2xl font-bold text-sm sm:text-base border border-slate-200 shadow-sm hover:bg-slate-50 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              >
                تعرّف على الحلول
              </Link>
            </div>
          </div>

          {/* Visual - left side */}
          <div className="order-1 md:order-2 relative">
            <div
              className="absolute -inset-4 bg-gradient-to-br from-[#00E5FF]/20 to-[#0057FF]/20 rounded-[2.5rem] blur-2xl"
              aria-hidden
            />
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-blue-600/25 border border-slate-200/80 bg-white">
              {/* شريط متصفح */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 border-b border-slate-200/80">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span
                  className="mx-auto flex items-center h-6 px-4 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-400"
                  dir="ltr"
                >
                  app.bluora.com/dashboard
                </span>
                <span className="w-10" aria-hidden />
              </div>
              <img
                src="/images/hero-dashboard.png"
                alt="لوحة تحكم Bluora — مبيعات وطلبات ومخزون في مكان واحد"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
