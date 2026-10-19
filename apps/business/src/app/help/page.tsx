import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpCircle, Mail, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'المساعدة',
  description: 'دليل الاستخدام والأسئلة الشائعة لمساعدتك في استخدام المنصة.',
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <section className="bg-slate-950 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">المساعدة</h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            محتاج مساعدة؟ احنا هنا عشانك
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/#faq" className="bg-slate-50 rounded-[2rem] p-8 hover:bg-slate-100 transition-all">
              <HelpCircle className="w-8 h-8 text-cyan-500 mb-4" />
              <h3 className="font-black text-slate-900 text-lg mb-1">الأسئلة الشائعة</h3>
              <p className="text-slate-500 text-sm">إجابات لأكثر الأسئلة شيوعاً عن المنصة</p>
            </Link>
            <Link href="/contact" className="bg-slate-50 rounded-[2rem] p-8 hover:bg-slate-100 transition-all">
              <Mail className="w-8 h-8 text-cyan-500 mb-4" />
              <h3 className="font-black text-slate-900 text-lg mb-1">تواصل مع الدعم</h3>
              <p className="text-slate-500 text-sm">تواصل مباشر مع فريق الدعم الفني</p>
            </Link>
          </div>

          <div className="mt-12 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-cyan-600 font-bold hover:text-cyan-700 transition-colors">
              العودة للرئيسية <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
