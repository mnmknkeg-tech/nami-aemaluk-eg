import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, Monitor, Smartphone, Apple } from 'lucide-react';

export const metadata: Metadata = {
  title: 'تحميل التطبيق',
  description: 'حمّل تطبيق نمّي أعمالك لسطح المكتب لإدارة عملك من أي مكان.',
};

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white" dir="rtl">
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl">
          <Download className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">حمّل تطبيق نمّي أعمالك</h1>
        <p className="text-white/60 text-lg mb-12 max-w-xl mx-auto">
          إدارة متجرك أو نشاطك من سطح المكتب — مبيعات، مخزون، حجوزات، تقارير وتسويق في تطبيق واحد.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:bg-white/10 transition-all">
            <Monitor className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
            <h3 className="font-black text-lg mb-2">سطح المكتب</h3>
            <p className="text-white/40 text-sm">تطبيق ويندوز لإدارة عملك من الكمبيوتر</p>
            <Link href="https://github.com/Sayedtaha55/ray-eg/releases" className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 text-slate-900 font-black text-sm hover:bg-cyan-400 transition-all">
              <Download className="w-4 h-4" /> تحميل للويندوز
            </Link>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:bg-white/10 transition-all">
            <Smartphone className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
            <h3 className="font-black text-lg mb-2">الموبايل</h3>
            <p className="text-white/40 text-sm">قريباً على متجر التطبيقات وجوجل بلاي</p>
            <span className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white/40 font-black text-sm cursor-not-allowed">
              قريباً
            </span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:bg-white/10 transition-all">
            <Apple className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
            <h3 className="font-black text-lg mb-2">ماك</h3>
            <p className="text-white/40 text-sm">قريباً على أجهزة ماك</p>
            <span className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white/40 font-black text-sm cursor-not-allowed">
              قريباً
            </span>
          </div>
        </div>

        <Link href="/" className="text-white/40 hover:text-cyan-400 font-bold text-sm transition-colors">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
