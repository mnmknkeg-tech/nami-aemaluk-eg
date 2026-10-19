import { Metadata } from 'next';
import { Lightbulb, Sparkles, MessageSquare, Star, Zap, Heart } from 'lucide-react';
import SuggestionsForm from './SuggestionsForm';

export const metadata: Metadata = {
  title: 'الاقتراحات',
  description: 'شاركنا اقتراحاتك لتحسين منصة من مكانك - رأيك يساهم في بناء مستقبل التجارة الذكية',
  alternates: { canonical: '/suggestions' },
  openGraph: { title: 'الاقتراحات - من مكانك', description: 'شاركنا اقتراحاتك لتحسين منصة من مكانك', url: '/suggestions', type: 'website' },
  twitter: { card: 'summary', title: 'الاقتراحات - من مكانك', description: 'شاركنا اقتراحاتك لتحسين منصة من مكانك' },
};

export default function SuggestionsPage() {
  const highlights = [
    { title: 'رأيك يفرق', desc: 'كل اقتراح ندرسه بعناية ونحاول تطبيقه لتحسين تجربتكم.', icon: Heart, color: 'text-red-500' },
    { title: 'تطوير مستمر', desc: 'بفضل اقتراحاتكم، نطلق ميزات جديدة كل شهر.', icon: Zap, color: 'text-amber-500' },
    { title: 'مجتمع متفاعل', desc: 'شارك في بناء أكبر منصة تجارية في مصر.', icon: Star, color: 'text-brand-cyan' },
  ];

  return (
    <div className="bg-white dark:bg-brand-black min-h-screen text-right">
      {/* Header Section */}
      <section className="relative py-20 md:py-32 overflow-hidden bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10 text-center">
          <div className="w-20 h-20 bg-amber-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/20">
            <Lightbulb className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">
            شاركنا <span className="text-gradient">بأفكارك</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl font-bold max-w-2xl mx-auto leading-relaxed">
            نحن نبني "من مكانك" من أجلك، ولذلك يهمنا جداً سماع رأيك واقتراحاتك لتطوير المنصة للأفضل.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          
          {/* Info Side */}
          <div className="lg:col-span-5 space-y-12">
            <div className="space-y-8">
               <h2 className="text-3xl font-black tracking-tight">لماذا تشاركنا؟</h2>
               <p className="text-lg text-slate-500 font-bold leading-relaxed">
                  نحن نؤمن بأن الابتكار يأتي من مستخدمينا. اقتراحك اليوم قد يكون الميزة الأساسية غداً.
               </p>
            </div>

            <div className="space-y-6">
               {highlights.map((item, i) => (
                  <div key={i} className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex items-start gap-6 justify-end group hover:shadow-xl transition-all">
                     <div className="text-right">
                        <h3 className="text-xl font-black mb-2">{item.title}</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{item.desc}</p>
                     </div>
                     <div className="w-14 h-14 shrink-0 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                        <item.icon className={`w-7 h-7 ${item.color}`} />
                     </div>
                  </div>
               ))}
            </div>

            <div className="p-10 bg-brand-black rounded-[3rem] text-white overflow-hidden relative">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-cyan/20 to-transparent opacity-20" />
               <MessageSquare className="w-12 h-12 text-brand-cyan mb-6 opacity-30" />
               <h3 className="text-2xl font-black mb-4 relative z-10">هل تواجه مشكلة؟</h3>
               <p className="text-white/60 font-bold mb-8 relative z-10">إذا كنت تواجه عطلاً فنياً، يفضل التواصل مع الدعم الفني مباشرة.</p>
               <a href="/support" className="inline-flex px-8 py-4 bg-white/10 border border-white/20 rounded-2xl font-black hover:bg-white/20 transition-all relative z-10">
                  مركز الدعم
               </a>
            </div>
          </div>

          {/* Form Side */}
          <div className="lg:col-span-7 relative">
            <div className="sticky top-24">
               <div className="absolute -inset-4 bg-brand-gradient opacity-5 blur-3xl rounded-[3rem] pointer-events-none" />
               <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden">
                  <div className="p-8 md:p-12">
                    <div className="flex items-center gap-3 mb-10 justify-end">
                       <h2 className="text-3xl font-black">نموذج الاقتراحات</h2>
                       <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                    </div>
                    <SuggestionsForm />
                    <p className="mt-8 text-center text-slate-400 text-sm font-bold">
                       شكراً لثقتك بنا ووقتك الثمين.
                    </p>
                  </div>
               </div>
            </div>
          </div>

        </div>
      </div>

      {/* Success Badge Section */}
      <section className="py-24 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-950/30 text-center">
         <div className="max-w-4xl mx-auto px-4 md:px-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-cyan/10 text-brand-cyan rounded-full font-black text-xs uppercase tracking-widest mb-8">
               <Sparkles className="w-4 h-4" />
               نحن نكبر معكم
            </div>
            <h2 className="text-4xl font-black mb-6">أكثر من 50 ميزة تم إطلاقها <br /> بناءً على اقتراحاتكم</h2>
            <p className="text-slate-500 font-bold text-lg md:text-xl leading-relaxed">
               فريقنا التقني يعمل على مدار الساعة لتحويل أفكاركم إلى واقع ملموس يخدم المجتمع التجاري في مصر.
            </p>
         </div>
      </section>
    </div>
  );
}
