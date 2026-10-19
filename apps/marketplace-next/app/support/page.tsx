import { Metadata } from 'next';
import { LifeBuoy, Search, BookOpen, MessageSquare, Phone, Headphones, HelpCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'مركز المساعدة',
  description: 'مركز المساعدة والدعم الفني لمنصة من مكانك - ابحث عن إجابات لاستفساراتك',
  alternates: { canonical: '/support' },
  openGraph: { title: 'مركز المساعدة - من مكانك', description: 'مركز المساعدة والدعم الفني لمنصة من مكانك', url: '/support', type: 'website' },
  twitter: { card: 'summary', title: 'مركز المساعدة - من مكانك', description: 'مركز المساعدة والدعم الفني لمنصة من مكانك' },
};

export default function SupportPage() {
  const categories = [
    { title: 'البداية', desc: 'كل ما تحتاجه للبدء في استخدام المنصة كعميل أو تاجر.', icon: BookOpen, color: 'text-blue-500' },
    { title: 'الحساب والأمان', desc: 'كيفية إدارة حسابك، تغيير كلمة المرور، وتأمين بياناتك.', icon: HelpCircle, color: 'text-purple-500' },
    { title: 'الطلبات والشحن', desc: 'تتبع طلباتك، سياسة التوصيل، وماذا تفعل عند حدوث مشكلة.', icon: LifeBuoy, color: 'text-green-500' },
    { title: 'خدمات التجار', desc: 'كيفية إضافة المنتجات، إدارة المتجر، وتحليل المبيعات.', icon: Headphones, color: 'text-brand-cyan' },
  ];

  return (
    <div className="bg-white dark:bg-brand-black min-h-screen">
      {/* Header & Search */}
      <section className="relative py-20 md:py-32 bg-brand-black text-white overflow-hidden text-right">
        <div className="absolute inset-0 opacity-20">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-cyan/20 via-transparent to-transparent" />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10 text-center">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <LifeBuoy className="w-10 h-10 text-brand-cyan" />
          </div>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">مركز <span className="text-gradient">المساعدة</span></h1>
          <p className="text-white/60 font-semibold text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            ابحث عن إجابات لاستفساراتك أو تواصل مع فريق الدعم الفني مباشرة.
          </p>
          
          <div className="max-w-2xl mx-auto relative group">
            <input 
              type="text" 
              placeholder="ابحث عن سؤالك هنا..."
              className="w-full bg-white/10 border border-white/20 rounded-xl py-5 pr-14 pl-6 text-white font-semibold text-lg outline-none focus:bg-white/20 focus:border-brand-cyan transition-all text-right shadow-2xl"
            />
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-white/30 group-focus-within:text-brand-cyan transition-colors" />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-20">
        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
          {categories.map((cat, i) => (
            <div key={i} className="group p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-right">
              <div className="w-14 h-14 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand-black group-hover:text-white dark:group-hover:bg-brand-cyan dark:group-hover:text-brand-black transition-all">
                <cat.icon className={`w-7 h-7 ${cat.color} group-hover:text-inherit transition-colors`} />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">{cat.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mb-6">
                {cat.desc}
              </p>
              <button className="flex items-center gap-2 text-sm font-semibold text-brand-cyan group-hover:gap-3 transition-all mr-auto lg:mr-0 justify-end w-full">
                تصفح المقالات
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Contact Support Section */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-10 md:p-16 border border-slate-200 dark:border-white/5 text-right relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl" />
          
          <div className="flex flex-col lg:flex-row gap-12 items-center relative z-10">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">لم تجد ما تبحث عنه؟</h2>
              <p className="text-slate-500 dark:text-slate-400 font-semibold text-lg md:text-xl leading-relaxed">
                فريق الدعم الفني لدينا متواجد لمساعدتك في أي وقت. يمكنك التواصل معنا عبر القنوات التالية.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <Link href="/contact" className="flex items-center gap-4 p-6 bg-white dark:bg-brand-black rounded-xl border border-slate-200 dark:border-white/10 hover:shadow-lg transition-all justify-end group">
                  <div className="text-right">
                    <h4 className="font-bold text-slate-900 dark:text-white">راسلنا</h4>
                    <p className="text-slate-500 text-xs font-semibold">عبر نموذج المراسلة</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-600">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                </Link>
                
                <Link href="/customer-service" className="flex items-center gap-4 p-6 bg-white dark:bg-brand-black rounded-xl border border-slate-200 dark:border-white/10 hover:shadow-lg transition-all justify-end group">
                  <div className="text-right">
                    <h4 className="font-bold text-slate-900 dark:text-white">اتصل بنا</h4>
                    <p className="text-slate-500 text-xs font-semibold">01067461059</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 dark:bg-green-500/10 rounded-lg flex items-center justify-center text-green-600">
                    <Phone className="w-6 h-6" />
                  </div>
                </Link>
              </div>
            </div>
            
            <div className="lg:w-1/3 text-center lg:text-right">
               <div className="w-32 h-32 bg-brand-gradient p-1 rounded-2xl mx-auto lg:ml-0 shadow-2xl">
                  <div className="w-full h-full bg-white dark:bg-brand-black rounded-xl flex items-center justify-center">
                    <LifeBuoy className="w-12 h-12 text-brand-cyan animate-pulse" />
                  </div>
               </div>
               <div className="mt-8 space-y-2">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">دعم 24/7</p>
                  <p className="text-slate-500 font-semibold text-sm">نحن هنا دائماً من أجلك</p>
               </div>
            </div>
          </div>
        </div>

        {/* FAQs Preview */}
        <div className="mt-24 text-right">
          <h2 className="text-3xl font-bold mb-12 flex items-center gap-3 justify-end">
            الأسئلة الشائعة
            <HelpCircle className="w-8 h-8 text-brand-cyan" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'كيف يمكنني إنشاء متجر على المنصة؟',
              'ما هي طرق الدفع المتاحة؟',
              'كيف أتتبع حالة طلبي؟',
              'هل يمكنني استرجاع المنتجات؟',
              'كيف أضمن أمان بياناتي؟',
              'ما هي رسوم الشحن والتوصيل؟'
            ].map((q, i) => (
              <div key={i} className="p-6 bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 rounded-xl hover:border-brand-cyan/30 transition-all cursor-pointer flex items-center justify-between group">
                <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-brand-cyan transition-colors" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{q}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
