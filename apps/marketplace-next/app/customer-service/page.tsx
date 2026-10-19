import { Metadata } from 'next';
import { Headphones, Clock, Phone, Mail, MessageCircle, MapPin, Globe, Sparkles, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'خدمة العملاء',
  description: 'تواصل مع خدمة عملاء من مكانك للرد على استفساراتك - نحن هنا لخدمتك دائماً',
  alternates: { canonical: '/customer-service' },
  openGraph: { title: 'خدمة العملاء - من مكانك', description: 'تواصل مع خدمة عملاء من مكانك للرد على استفساراتك', url: '/customer-service', type: 'website' },
  twitter: { card: 'summary', title: 'خدمة العملاء - من مكانك', description: 'تواصل مع خدمة عملاء من مكانك للرد على استفساراتك' },
};

export default function CustomerServicePage() {
  const contactMethods = [
    { title: 'الخط الساخن', value: '01067461059', sub: 'متاح خلال ساعات العمل الرسمية', icon: Phone, color: 'bg-green-50 text-green-600' },
    { title: 'البريد الإلكتروني', value: 'mnmknk.eg@gmail.com', sub: 'نرد خلال 24 ساعة عمل', icon: Mail, color: 'bg-blue-50 text-blue-600' },
    { title: 'واتساب', value: '01067461059', sub: 'للاستفسارات السريعة', icon: MessageCircle, color: 'bg-emerald-50 text-emerald-600' },
    { title: 'المكتب الرئيسي', value: 'القاهرة، مصر', sub: 'نخدم جميع أنحاء الجمهورية', icon: MapPin, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="bg-white dark:bg-brand-black min-h-screen text-right">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10 text-center">
          <div className="w-20 h-20 bg-brand-cyan/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-cyan/20">
            <Headphones className="w-10 h-10 text-brand-cyan" />
          </div>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">
            خدمة <span className="text-gradient">العملاء</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl font-bold max-w-2xl mx-auto leading-relaxed">
            نسعى دائماً لتقديم أفضل تجربة مستخدم. فريقنا متواجد للرد على كافة استفساراتكم وحل المشكلات بفعالية.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Info Side */}
          <div className="lg:col-span-5 space-y-12">
            <div className="space-y-6">
               <h2 className="text-3xl font-black tracking-tight">نحن في خدمتك</h2>
               <p className="text-lg text-slate-500 font-bold leading-relaxed">
                  سواء كنت تواجه مشكلة في طلبك، أو لديك استفسار عن خدماتنا، فريق خدمة العملاء مستعد للمساعدة.
               </p>
            </div>

            <div className="space-y-6">
               <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex items-center gap-6 justify-end">
                  <div className="text-right">
                    <h3 className="text-xl font-black mb-1">أوقات العمل</h3>
                    <p className="text-slate-500 font-bold">السبت - الخميس: 9 صباحاً - 9 مساءً</p>
                  </div>
                  <div className="w-14 h-14 shrink-0 bg-brand-cyan/10 rounded-2xl flex items-center justify-center text-brand-cyan">
                    <Clock className="w-7 h-7" />
                  </div>
               </div>

               <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex items-center gap-6 justify-end">
                  <div className="text-right">
                    <h3 className="text-xl font-black mb-1">ضمان الاستجابة</h3>
                    <p className="text-slate-500 font-bold">نلتزم بالرد على كافة الرسائل في أسرع وقت ممكن.</p>
                  </div>
                  <div className="w-14 h-14 shrink-0 bg-green-50 dark:bg-green-500/10 rounded-2xl flex items-center justify-center text-green-600">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
               </div>
            </div>
          </div>

          {/* Contact Methods Grid */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {contactMethods.map((method, i) => (
                <div key={i} className="group p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-end gap-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${method.color} group-hover:scale-110 transition-transform`}>
                    <method.icon className="w-8 h-8" />
                  </div>
                  <div className="text-right space-y-2">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">{method.title}</h3>
                    <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{method.value}</p>
                    <p className="text-xs text-slate-500 font-bold">{method.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-10 bg-brand-black text-white rounded-[3rem] text-center overflow-hidden relative">
               <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/20 rounded-full blur-3xl opacity-20" />
               <Sparkles className="w-12 h-12 text-brand-cyan mx-auto mb-6 opacity-30" />
               <h3 className="text-2xl font-black mb-4 relative z-10">هل لديك اقتراح؟</h3>
               <p className="text-white/50 font-bold mb-8 relative z-10">نسعى دائماً لتحسين خدماتنا بناءً على ملاحظاتكم.</p>
               <a href="/suggestions" className="inline-flex px-8 py-4 bg-white text-brand-black rounded-2xl font-black hover:bg-brand-cyan transition-all relative z-10">
                  قدم اقتراحك الآن
               </a>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-white/5">
         <div className="max-w-4xl mx-auto px-4 md:px-6 flex flex-wrap justify-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all">
            <div className="flex items-center gap-3 font-black text-xl"><Globe className="w-8 h-8" /> تغطية كاملة</div>
            <div className="flex items-center gap-3 font-black text-xl"><ShieldCheck className="w-8 h-8" /> حماية وأمان</div>
            <div className="flex items-center gap-3 font-black text-xl"><Headphones className="w-8 h-8" /> دعم متواصل</div>
         </div>
      </section>
    </div>
  );
}
