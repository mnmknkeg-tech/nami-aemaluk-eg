import { Metadata } from 'next';
import { Book, Scale, UserCheck, ShieldAlert, CreditCard, MessageSquare, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'الشروط والأحكام',
  description: 'الشروط والأحكام لاستخدام منصة من مكانك - القواعد والمسؤوليات لمستخدمينا وتجارنا',
  alternates: { canonical: '/terms' },
  openGraph: { title: 'الشروط والأحكام - من مكانك', description: 'الشروط والأحكام لاستخدام منصة من مكانك', url: '/terms', type: 'article' },
  twitter: { card: 'summary', title: 'الشروط والأحكام - من مكانك', description: 'الشروط والأحكام لاستخدام منصة من مكانك' },
};

export default function TermsPage() {
  const sections = [
    { 
      title: '1. قبول الشروط', 
      content: 'باستخدامك لمنصة "من مكانك"، فإنك تقر بأنك قرأت وفهمت ووافقت على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، يرجى عدم استخدام المنصة.',
      icon: UserCheck
    },
    { 
      title: '2. أهلية الاستخدام', 
      content: 'يجب أن تكون قد بلغت السن القانوني (18 عاماً فأكثر) لتتمكن من إنشاء حساب أو ممارسة الأنشطة التجارية على المنصة. أنت مسؤول عن دقة كافة المعلومات المقدمة.',
      icon: Scale
    },
    { 
      title: '3. مسؤولية الحساب', 
      content: 'أنت مسؤول بشكل كامل عن الحفاظ على سرية معلومات حسابك وكلمة المرور. كافة الأنشطة التي تتم من خلال حسابك تقع تحت مسؤوليتك الشخصية.',
      icon: ShieldAlert
    },
    { 
      title: '4. الأنشطة المحظورة', 
      content: 'يُحظر استخدام المنصة لأي أغراض غير قانونية، أو نشر محتوى مسيء، أو محاولة اختراق أنظمة المنصة، أو التلاعب ببيانات التجار والعملاء الآخرين.',
      icon: AlertCircle
    },
    { 
      title: '5. المعاملات المالية', 
      content: 'تعمل المنصة كوسيط تقني بين التاجر والعميل. نحن نبذل قصارى جهدنا لضمان أمان المعاملات، ولكن تظل العلاقة التجارية المباشرة مسؤولية الأطراف المعنية.',
      icon: CreditCard
    },
    { 
      title: '6. الملكية الفكرية', 
      content: 'كافة حقوق الملكية الفكرية للمنصة ومحتواها البرمجي والتصميمي مملوكة لـ "من مكانك". لا يجوز نسخ أو إعادة استخدام أي جزء من المنصة دون إذن كتابي.',
      icon: Book
    },
  ];

  return (
    <div className="bg-white dark:bg-brand-black min-h-screen">
      {/* Header */}
      <section className="py-20 md:py-32 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <div className="w-20 h-20 bg-brand-purple/10 text-brand-purple rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-purple/20">
            <Book className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">الشروط <span className="text-gradient">& الأحكام</span></h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            يرجى قراءة هذه الشروط بعناية قبل استخدام خدماتنا لضمان أفضل تجربة لجميع المستخدمين.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-20">
        <div className="space-y-12">
          {sections.map((s, i) => (
            <section key={i} className="group relative">
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 shrink-0 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-brand-purple group-hover:bg-brand-purple group-hover:text-white transition-all">
                  <s.icon className="w-6 h-6" />
                </div>
                <div className="space-y-4 text-right">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{s.title}</h2>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg font-bold">
                    {s.content}
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-20 p-8 md:p-12 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 text-center">
          <MessageSquare className="w-12 h-12 text-brand-purple mx-auto mb-6 opacity-30" />
          <h2 className="text-2xl font-black mb-4">هل لديك استفسار قانوني؟</h2>
          <p className="text-slate-500 font-bold text-lg mb-8 max-w-lg mx-auto">
            إذا كنت بحاجة إلى توضيح بشأن أي من هذه البنود، يرجى التواصل مع فريقنا القانوني.
          </p>
          <a href="/contact" className="inline-flex items-center gap-2 text-brand-purple font-black hover:gap-3 transition-all">
            تواصل معنا عبر البريد
            <AlertCircle className="w-4 h-4 rotate-180" />
          </a>
        </div>

        <div className="mt-12 text-center text-slate-400 text-sm font-bold">
          آخر تحديث: 29 يوليو 2026
        </div>
      </div>
    </div>
  );
}
