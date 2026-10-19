import { Metadata } from 'next';
import { Bike, DollarSign, Clock, MapPin, ShieldCheck, Zap, ArrowLeft, Heart } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'كن كورير',
  description: 'انضم لفريق الكورير وابدأ رحلتك في توصيل الطلبات وكسب المال - عمل مرن ودخل ممتاز',
  alternates: { canonical: '/courier' },
  openGraph: { title: 'كن كورير مع من مكانك', description: 'انضم لفريق الكورير وابدأ رحلتك في توصيل الطلبات وكسب المال', url: '/courier', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'كن كورير مع من مكانك', description: 'انضم لفريق الكورير وابدأ رحلتك في توصيل الطلبات وكسب المال' },
};

export default function CourierPage() {
  const benefits = [
    { title: 'دخل ممتاز', desc: 'اربح مبالغ مجزية عن كل طلب تقوم بتوصيله مع حوافز أسبوعية.', icon: DollarSign, color: 'text-green-500' },
    { title: 'ساعات عمل مرنة', desc: 'أنت مدير نفسك، اختر الأوقات التي تناسبك للعمل بكل حرية.', icon: Clock, color: 'text-brand-cyan' },
    { title: 'تأمين ودعم', desc: 'نوفر لك بيئة عمل آمنة ودعم فني متواصل خلال رحلاتك.', icon: ShieldCheck, color: 'text-brand-purple' },
    { title: 'تغطية واسعة', desc: 'اعمل في منطقتك المفضلة واستكشف أماكن جديدة كل يوم.', icon: MapPin, color: 'text-red-500' },
  ];

  return (
    <div className="bg-white dark:bg-brand-black min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-white/5">
        <div className="absolute inset-0 opacity-10">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-cyan/20 via-transparent to-transparent" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10 text-center">
          <div className="w-20 h-20 bg-brand-cyan/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-cyan/20">
            <Bike className="w-10 h-10 text-brand-cyan" />
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-tight">
            ابدأ رحلة <span className="text-gradient">نجاحك</span> <br />
            كشريك توصيل
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xl md:text-2xl max-w-2xl mx-auto mb-12 leading-relaxed">
            انضم لآلاف الكوريرز في "من مكانك" واستمتع بدخل إضافي وعمل مرن يناسب أسلوب حياتك.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-brand-gradient text-white font-black text-lg hover:shadow-glow-cyan transition-all hover:scale-105 active:scale-95"
            >
              سجل الآن للعمل معنا
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </Link>
            <Link
               href="/support"
               className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl font-black text-lg hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
            >
               تعرف على المتطلبات
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-6xl font-black tracking-tight mb-6 text-right">لماذا تنضم إلينا؟</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-lg md:text-xl max-w-2xl ml-auto text-right leading-relaxed">
               نحن نؤمن بأن الكورير هو الركيزة الأساسية لخدماتنا، ولذلك نوفر لك أفضل المميزات في السوق المصري.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="p-10 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl transition-all group text-right">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-brand-cyan group-hover:text-white transition-all">
                  <benefit.icon className={`w-8 h-8 ${benefit.color} group-hover:text-white transition-colors`} />
                </div>
                <h3 className="text-xl font-black mb-4">{benefit.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Safety Section */}
      <section className="py-24 bg-brand-black text-white relative overflow-hidden">
         <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-cyan/20 via-transparent to-transparent" />
         </div>
         
         <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16">
               <div className="lg:w-1/2 space-y-8 text-right">
                  <h2 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">سلامتك هي <br /> <span className="text-gradient">أولويتنا</span></h2>
                  <p className="text-white/60 font-bold text-lg md:text-xl leading-relaxed">
                     نحن لا نهتم فقط بالتوصيل، بل نهتم بمن يقوم بالتوصيل. نوفر لك دعم فني على مدار الساعة خلال رحلاتك لضمان سلامتك وسهولة عملك.
                  </p>
                  <ul className="space-y-4 pt-4">
                     {[
                        'نظام تتبع ذكي لضمان الأمان',
                        'دعم فني مباشر عبر الهاتف والواتساب',
                        'حوافز إضافية للقيادة الآمنة',
                        'مجتمع كوريرز متصل لتبادل الخبرات'
                     ].map((item, i) => (
                        <li key={i} className="flex items-center gap-4 justify-end font-bold text-lg">
                           {item}
                           <ShieldCheck className="w-6 h-6 text-brand-cyan" />
                        </li>
                     ))}
                  </ul>
               </div>
               
               <div className="lg:w-1/2 relative">
                  <div className="p-10 md:p-16 bg-white/5 rounded-[3.5rem] border border-white/10 backdrop-blur-sm text-center">
                     <Zap className="w-16 h-16 text-amber-400 mx-auto mb-8 animate-pulse" />
                     <h3 className="text-3xl font-black mb-6 italic">"بدأت ككورير بدوام جزئي، والآن أنا شريك أساسي وأحقق دخلاً ممتازاً كل شهر."</h3>
                     <div className="flex items-center gap-4 justify-center">
                        <div>
                           <p className="font-black text-xl">أحمد محمد</p>
                           <p className="text-white/40 font-bold">كورير متميز منذ 2024</p>
                        </div>
                        <div className="w-14 h-14 bg-brand-cyan/20 rounded-full flex items-center justify-center">
                           <Heart className="w-6 h-6 text-brand-cyan" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 text-center">
         <div className="max-w-3xl mx-auto px-4 md:px-6 space-y-10">
            <h2 className="text-3xl md:text-6xl font-black tracking-tight">هل أنت مستعد للانطلاق؟</h2>
            <p className="text-slate-500 font-bold text-lg md:text-xl leading-relaxed">
               عملية التسجيل لا تستغرق أكثر من 5 دقائق. سجل بياناتك وسيتواصل معك فريقنا في أقرب وقت ممكن.
            </p>
            <div className="flex justify-center">
               <Link href="/signup" className="px-16 py-6 bg-brand-gradient text-white rounded-3xl font-black text-xl hover:shadow-glow-cyan transition-all hover:scale-105">
                  سجل بياناتك الآن
               </Link>
            </div>
         </div>
      </section>
    </div>
  );
}
