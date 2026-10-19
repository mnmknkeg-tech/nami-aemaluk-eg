import type { Metadata } from 'next';
import Link from 'next/link';
import { Newspaper, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'المدونة',
  description: 'أحدث المقالات والنصائح لإدارة وتنمية أعمالك.',
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <section className="bg-slate-950 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">المدونة</h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            نصائح ومقالات لتطوير أعمالك وزيادة مبيعاتك
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">قريباً</h2>
          <p className="text-slate-500 mb-8">نحن نعمل على إعداد محتوى مفيد لك. ابقَ على تواصل!</p>
          <Link href="/" className="inline-flex items-center gap-2 text-cyan-600 font-bold hover:text-cyan-700 transition-colors">
            العودة للرئيسية <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
