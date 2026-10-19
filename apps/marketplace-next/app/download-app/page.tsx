import { Metadata } from 'next';
import { Download, Smartphone, Apple, Play, ShieldCheck, Zap, Bell, ShoppingBag } from 'lucide-react';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'تحميل التطبيق',
  description: 'حمّل تطبيق من مكانك للاستفادة من جميع المميزات على هاتفك - تسوق، خدمات، وعروض حصرية',
  alternates: { canonical: '/download-app' },
  openGraph: { title: 'تحميل تطبيق من مكانك', description: 'حمّل تطبيق من مكانك للاستفادة من جميع المميزات على هاتفك', url: '/download-app', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'تحميل تطبيق من مكانك', description: 'حمّل تطبيق من مكانك للاستفادة من جميع المميزات على هاتفك' },
};

export default function DownloadAppPage() {
  const features = [
    { title: 'تنبيهات فورية', desc: 'كن أول من يعرف بالعروض والخصومات القريبة منك.', icon: Bell },
    { title: 'تجربة سلسة', desc: 'واجهة مستخدم محسنة وتصفح سريع للمنتجات والمتاجر.', icon: Zap },
    { title: 'أمان كامل', desc: 'معاملات آمنة وحماية لبياناتك الشخصية في كل خطوة.', icon: ShieldCheck },
    { title: 'طلب سهل', desc: 'اطلب ما تحتاجه بضغطة واحدة وتابع حالة طلبك.', icon: ShoppingBag },
  ];

  return (
    <div className="bg-white dark:bg-brand-black min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden border-b border-slate-100 dark:border-white/5">
         {/* Decorative elements */}
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-purple/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
         <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-cyan/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
         
         <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
               
               <div className="lg:w-1/2 text-right space-y-8">
                  <div className="inline-flex items-center gap-2 px-6 py-2 bg-brand-purple/10 text-brand-purple rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-purple/5">
                    <Smartphone className="w-4 h-4" />
                    متوفر الآن على أندرويد
                  </div>
                  <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-tight">
                    عالمك <span className="text-gradient">من مكانك</span> <br />
                    بين يديك
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-xl md:text-2xl leading-relaxed">
                    حمّل التطبيق الآن وانضم لآلاف المستخدمين الذين يستمتعون بتجربة تسوق ذكية وخدمات متكاملة في كل مكان بمصر.
                  </p>
                  
                  <div className="flex flex-wrap gap-4 justify-end pt-4">
                     <a
                        href="https://github.com/Sayedtaha55/ray-eg/releases/latest"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 px-8 py-5 bg-brand-black text-white rounded-[1.5rem] hover:shadow-2xl hover:scale-105 transition-all group"
                     >
                        <div className="text-right">
                           <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">Available on</p>
                           <p className="text-xl font-black">GitHub</p>
                        </div>
                        <Play className="w-8 h-8 text-brand-cyan fill-brand-cyan group-hover:scale-110 transition-transform" />
                     </a>
                     
                     <div className="flex items-center gap-4 px-8 py-5 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-[1.5rem] cursor-not-allowed border border-slate-200 dark:border-white/10 group">
                        <div className="text-right">
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Coming Soon</p>
                           <p className="text-xl font-black opacity-50">App Store</p>
                        </div>
                        <Apple className="w-8 h-8 opacity-30" />
                     </div>
                  </div>
                  
                  <p className="text-slate-400 text-sm font-bold pt-4 flex items-center gap-2 justify-end">
                     نسخة الأندرويد متوفرة حالياً كملف APK مباشر
                     <ShieldCheck className="w-4 h-4 text-green-500" />
                  </p>
               </div>
               
               <div className="lg:w-1/2 relative">
                  {/* Phone Mockup Placeholder */}
                  <div className="relative z-10 bg-brand-gradient p-2 rounded-[3.5rem] shadow-[0_0_100px_rgba(0,210,255,0.2)]">
                     <div className="bg-white dark:bg-brand-black rounded-[3.2rem] overflow-hidden aspect-[9/19.5] w-72 md:w-80 mx-auto border-8 border-brand-black shadow-inner flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-20 h-20 bg-brand-cyan/10 rounded-3xl flex items-center justify-center mb-6">
                           <Download className="w-10 h-10 text-brand-cyan animate-bounce" />
                        </div>
                        <h3 className="text-2xl font-black mb-4">{siteConfig.name} App</h3>
                        <p className="text-slate-500 font-bold text-sm leading-relaxed">تصفح المتاجر، اطلب المنتجات، وتابع العروض بكل سهولة.</p>
                     </div>
                  </div>
                  {/* Decoration circles */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border-2 border-slate-100 dark:border-white/5 rounded-full animate-ping opacity-20 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-slate-50 dark:border-white/5 rounded-full pointer-events-none opacity-50" />
               </div>
            </div>
         </div>
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32">
         <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="text-center mb-20 space-y-4">
               <h2 className="text-3xl md:text-6xl font-black tracking-tight">لماذا تستخدم التطبيق؟</h2>
               <p className="text-slate-500 dark:text-slate-400 font-bold text-lg md:text-xl max-w-2xl mx-auto">صممنا التطبيق ليكون رفيقك اليومي في كل مكان تذهب إليه.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               {features.map((feature, i) => (
                  <div key={i} className="p-10 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-slate-900 hover:shadow-2xl transition-all group text-right">
                     <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:bg-brand-purple group-hover:text-white transition-all">
                        <feature.icon className="w-8 h-8 text-brand-purple group-hover:text-white transition-colors" />
                     </div>
                     <h3 className="text-xl font-black mb-4">{feature.title}</h3>
                     <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{feature.desc}</p>
                  </div>
               ))}
            </div>
         </div>
      </section>
      
      {/* Footer-like CTA */}
      <section className="py-24 bg-brand-black text-white relative overflow-hidden">
         <div className="max-w-4xl mx-auto px-4 md:px-6 text-center space-y-8 relative z-10">
            <h2 className="text-3xl md:text-6xl font-black leading-tight">ابدأ تجربتك <br /> <span className="text-gradient">الذكية</span> اليوم</h2>
            <p className="text-white/50 font-bold text-lg leading-relaxed">
               لا تنتظر أكثر، حمّل تطبيق من مكانك الآن واستكشف عالم المزايا.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
               <a href="https://github.com/Sayedtaha55/ray-eg/releases/latest" className="px-12 py-5 bg-brand-gradient rounded-2xl font-black text-lg hover:shadow-glow-cyan transition-all">
                  حمّل التطبيق مجاناً
               </a>
            </div>
         </div>
      </section>
    </div>
  );
}
