import { Metadata } from 'next';
import {
  Info,
  Target,
  Rocket,
  Cpu,
  Users,
  ShieldCheck,
  Globe,
  Zap,
  Sparkles,
  Heart,
} from 'lucide-react';
import { siteConfig } from '@/lib/config';
import { serializeJsonLd } from '@/lib/jsonld';

export const metadata: Metadata = {
  title: 'حول من مكانك',
  description: 'تعرف على منصة من مكانك ورسالتنا ورؤيتنا وقصتنا في تمكين التجارة والخدمات في مصر',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'حول من مكانك',
    description: 'تعرف على منصة من مكانك ورسالتنا ورؤيتنا',
    url: '/about',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'حول من مكانك',
    description: 'تعرف على منصة من مكانك ورسالتنا ورؤيتنا',
  },
};

export default function AboutPage() {
  const aboutLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'حول من مكانك',
    url: `${siteConfig.url}/about`,
    description: 'تعرف على منصة من مكانك ورسالتنا ورؤيتنا',
    mainEntity: {
      '@type': 'Organization',
      name: siteConfig.name,
      alternateName: siteConfig.nameArabic,
      url: siteConfig.url,
      logo: `${siteConfig.url}/brand/logo.png`,
      foundingDate: '2024',
      foundingLocation: 'Egypt',
    },
  };

  return (
    <div className="overflow-hidden bg-white dark:bg-brand-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(aboutLd) }}
      />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 border-b border-slate-100 dark:border-white/5 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-cyan/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-purple/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-2 bg-brand-black text-white rounded-full font-semibold text-xs mb-8 shadow-xl shadow-brand-black/20">
            <Info className="w-4 h-4 text-brand-cyan" />
            قصتنا ورؤيتنا
          </div>
          <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-8 leading-tight">
            نحن نعيد تعريف <br />
            <span className="text-gradient">التجارة المحلية</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xl md:text-2xl font-semibold max-w-3xl mx-auto leading-relaxed">
            من مكانك هي منصة مصرية متكاملة تهدف لتمكين أصحاب الأعمال من التحول الرقمي والوصول
            لعملائهم بطرق مبتكرة وفعالة.
          </p>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 md:py-32 bg-slate-50 dark:bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-xl transition-all group">
              <div className="w-16 h-16 bg-brand-cyan/10 rounded-xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Target className="w-8 h-8 text-brand-cyan" />
              </div>
              <h2 className="text-3xl font-bold mb-4">رسالتنا</h2>
              <p className="text-slate-500 dark:text-slate-400 font-semibold text-lg leading-relaxed">
                توفير بنية تحتية رقمية ذكية لكل تاجر وصاحب عمل في مصر، لنزيل حواجز التقنية ونجعل
                النمو ممكناً للجميع.
              </p>
            </div>

            <div className="p-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-xl transition-all group">
              <div className="w-16 h-16 bg-brand-purple/10 rounded-xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Rocket className="w-8 h-8 text-brand-purple" />
              </div>
              <h2 className="text-3xl font-bold mb-4">رؤيتنا</h2>
              <p className="text-slate-500 dark:text-slate-400 font-semibold text-lg leading-relaxed">
                أن نكون المحرك الأساسي للاقتصاد الرقمي المحلي، حيث يجد كل مستخدم ما يحتاجه "من
                مكانه" بكل سهولة وأمان.
              </p>
            </div>

            <div className="p-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-xl transition-all group">
              <div className="w-16 h-16 bg-brand-cyan/10 rounded-xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-3xl font-bold mb-4">قيمنا</h2>
              <p className="text-slate-500 dark:text-slate-400 font-semibold text-lg leading-relaxed">
                الابتكار، الشفافية، ودعم المجتمع المحلي هي الركائز التي نبني عليها كل ميزة في
                منصتنا.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            <div className="lg:w-1/2 space-y-10 text-right">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-cyan/10 text-brand-cyan rounded-full font-semibold text-xs">
                <Sparkles className="w-3 h-3" />
                لماذا من مكانك؟
              </div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                أكثر من مجرد <br />
                <span className="text-brand-cyan">دليل تجاري</span>
              </h2>
              <div className="space-y-8">
                {[
                  {
                    icon: Cpu,
                    title: 'ذكاء اصطناعي متكامل',
                    desc: 'نستخدم الذكاء الاصطناعي لمساعدة التجار في بناء مواقعهم وتحليل بياناتهم.',
                  },
                  {
                    icon: Globe,
                    title: 'وصول لا محدود',
                    desc: 'نفتح لعملك آفاقاً جديدة للوصول للعملاء في منطقتك وخارجها.',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'أمان وموثوقية',
                    desc: 'نضمن بيئة آمنة للمبيعات والتعاملات التجارية لجميع الأطراف.',
                  },
                  {
                    icon: Zap,
                    title: 'سرعة وسهولة',
                    desc: 'واجهات بسيطة وقوية تضمن أفضل تجربة للمستخدم والتاجر.',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 items-start justify-end">
                    <div className="text-right">
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    <div className="w-14 h-14 shrink-0 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-brand-cyan">
                      <item.icon className="w-6 h-6" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              <div className="relative z-10 bg-brand-gradient p-1 rounded-2xl shadow-2xl">
                <div className="bg-white dark:bg-brand-black rounded-xl overflow-hidden p-8 md:p-12 text-center">
                  <Users className="w-16 h-16 text-brand-cyan mx-auto mb-6" />
                  <h3 className="text-3xl font-bold mb-4">مجتمع من مكانك</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-semibold text-lg leading-relaxed mb-8">
                    نحن نفخر بكوننا جزءاً من نجاح آلاف المشروعات الصغيرة والمتوسطة في مصر.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-xl">
                      <div className="text-3xl font-bold text-brand-cyan">1000+</div>
                      <div className="text-xs font-semibold text-slate-500 mt-1">متجر نشط</div>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-xl">
                      <div className="text-3xl font-bold text-brand-purple">50K+</div>
                      <div className="text-xs font-semibold text-slate-500 mt-1">مستخدم شهري</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative circles */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border border-slate-100 dark:border-white/5 rounded-full pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] border border-slate-50 dark:border-white/5 rounded-full pointer-events-none opacity-50" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-brand-black text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-cyan/20 via-transparent to-transparent" />
        </div>
        <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-7xl font-bold tracking-tight mb-8">
            كن جزءاً من <span className="text-gradient">المستقبل</span>
          </h2>
          <p className="text-white/60 text-xl md:text-2xl font-semibold mb-12 leading-relaxed">
            ابدأ رحلتك معنا اليوم واكتشف كيف يمكن لـ من مكانك أن يغير قواعد اللعبة لعملك.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={`${siteConfig.businessUrl}/signup`}
              className="w-full sm:w-auto px-10 py-5 bg-brand-gradient rounded-xl font-semibold text-lg hover:shadow-glow-cyan transition-all"
            >
              ابدأ الآن مجاناً
            </a>
            <a
              href="/contact"
              className="w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/10 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              تحدث إلينا
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
