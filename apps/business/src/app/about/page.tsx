import type { Metadata } from 'next';
import Link from 'next/link';
import { Target, Eye, Users, Heart, Zap, Shield, Award, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'من نحن',
  description: 'تعرف على منصة نمّي أعمالك — رسالتنا، رؤيتنا، وقيمنا.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <section className="bg-slate-950 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">من نحن</h1>
          <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto">
            منصة عربية متكاملة لإدارة وتنمية أعمالك التجارية — بدأنا لنسهّل على كل تاجر مصري إدارة متجره وتنمية نشاطه.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-50 rounded-[2.5rem] p-8">
              <Target className="w-10 h-10 text-cyan-500 mb-4" />
              <h2 className="text-2xl font-black text-slate-900 mb-3">رسالتنا</h2>
              <p className="text-slate-600 leading-relaxed">
                تمكين كل تاجر وصاحب عمل في مصر من إدارة نشاطه بسهولة واحترافية، عبر منصة واحدة تجمع كل الأدوات اللازمة للمبيعات والمخزون والحجوزات والتسويق.
              </p>
            </div>
            <div className="bg-slate-50 rounded-[2.5rem] p-8">
              <Eye className="w-10 h-10 text-cyan-500 mb-4" />
              <h2 className="text-2xl font-black text-slate-900 mb-3">رؤيتنا</h2>
              <p className="text-slate-600 leading-relaxed">
                أن نكون المنصة العربية الأولى لإدارة الأعمال، يدعمها الذكاء الاصطناعي، وتخدم ملايين التجار في المنطقة العربية.
              </p>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-black text-slate-900 mb-8 text-center">قيمنا</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: Users, title: 'العميل أولاً', desc: 'كل قرار نأخده يبدأ من احتياج التاجر' },
                { icon: Zap, title: 'البساطة', desc: 'أدوات قوية بواجهة بسيطة وسهلة' },
                { icon: Shield, title: 'الثقة', desc: 'بياناتك آمنة معنا دائماً' },
                { icon: TrendingUp, title: 'النمو', desc: 'نكبر معك ونساعدك تكبر' },
              ].map((v, i) => (
                <div key={i} className="text-center p-6 rounded-[2rem] border border-slate-100">
                  <v.icon className="w-8 h-8 text-cyan-500 mx-auto mb-3" />
                  <h3 className="font-black text-slate-900 mb-1">{v.title}</h3>
                  <p className="text-slate-500 text-sm">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black mb-4">جاهز تبدأ؟</h2>
          <p className="text-white/60 mb-8">انضم لآلاف التجار الذين يثقون في منصتنا</p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-cyan-500 text-slate-900 font-black text-lg hover:bg-cyan-400 transition-all">
            ابدأ مجاناً الآن
          </Link>
        </div>
      </section>
    </div>
  );
}
