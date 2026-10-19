import { Metadata } from 'next';
import { RotateCcw, PackageCheck, Clock, ShieldCheck, AlertCircle, ShoppingBag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'سياسة الاسترجاع',
  description: 'سياسة الاسترجاع والاستبدال في منصة من مكانك - حقوقك وشروط إعادة المنتجات',
  alternates: { canonical: '/return-policy' },
  openGraph: { title: 'سياسة الاسترجاع - من مكانك', description: 'سياسة الاسترجاع والاستبدال في منصة من مكانك', url: '/return-policy', type: 'article' },
  twitter: { card: 'summary', title: 'سياسة الاسترجاع - من مكانك', description: 'سياسة الاسترجاع والاستبدال في منصة من مكانك' },
};

export default function ReturnPolicyPage() {
  const policies = [
    {
      title: 'مدة الاسترجاع والاستبدال',
      content: 'يمكنك طلب استرجاع أو استبدال المنتجات خلال 14 يوماً من تاريخ استلام الطلب، وذلك وفقاً لقانون حماية المستهلك المصري.',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      title: 'حالة المنتج',
      content: 'يجب أن يكون المنتج في حالته الأصلية، غير مستخدم، وفي غلافه الأصلي مع كافة الملحقات والبطاقات التعريفية (Tags).',
      icon: PackageCheck,
      color: 'bg-green-50 text-green-600'
    },
    {
      title: 'المنتجات المستثناة',
      content: 'لا يمكن استرجاع بعض المنتجات لأسباب صحية أو وقائية، مثل الملابس الداخلية، منتجات التجميل المستخدمة، أو المنتجات التي تم تصنيعها بناءً على طلب خاص.',
      icon: AlertCircle,
      color: 'bg-amber-50 text-amber-600'
    },
    {
      title: 'إجراءات الاسترجاع',
      content: 'يتم تقديم طلب الاسترجاع عبر حسابك على المنصة أو بالتواصل مع التاجر مباشرة. سيتم فحص المنتج خلال 3 أيام عمل من وصوله إلينا.',
      icon: RotateCcw,
      color: 'bg-purple-50 text-purple-600'
    },
    {
      title: 'استرداد الأموال',
      content: 'يتم رد المبلغ بنفس طريقة الدفع الأصلية. قد تستغرق عملية استرداد المبلغ عبر البطاقات الائتمانية من 7 إلى 14 يوم عمل حسب سياسة البنك.',
      icon: ShieldCheck,
      color: 'bg-emerald-50 text-emerald-600'
    }
  ];

  return (
    <div className="bg-white dark:bg-brand-black min-h-screen">
      {/* Header */}
      <section className="py-20 md:py-32 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <div className="w-20 h-20 bg-orange-500/10 text-orange-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-orange-500/20">
            <RotateCcw className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">سياسة <span className="text-gradient">الاسترجاع</span></h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-lg md:text-xl max-w-2xl mx-auto leading-relaxed text-right">
            نحن نضمن حقوقك في تجربة تسوق آمنة ومريحة. تعرف على شروط وإجراءات استرجاع واستبدال المنتجات عبر منصتنا.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {policies.map((policy, i) => (
            <div key={i} className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all group">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${policy.color} group-hover:scale-110 transition-transform`}>
                <policy.icon className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black mb-4 text-slate-900 dark:text-white text-right">{policy.title}</h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed text-right">
                {policy.content}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-20 p-10 bg-brand-black rounded-[3rem] text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="w-20 h-20 shrink-0 bg-white/10 rounded-[2rem] flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-orange-400" />
            </div>
            <div className="text-right flex-1">
              <h2 className="text-2xl md:text-3xl font-black mb-2">تسوق بكل ثقة</h2>
              <p className="text-white/60 font-bold text-lg leading-relaxed">
                في "من مكانك"، رضاك هو أولويتنا. إذا واجهت أي مشكلة في طلبك، فريق الدعم الفني متواجد لمساعدتك في أي وقت.
              </p>
            </div>
            <a href="/contact" className="px-8 py-4 bg-white text-brand-black rounded-2xl font-black hover:bg-orange-400 hover:text-white transition-all">
              اطلب مساعدة
            </a>
          </div>
        </div>

        <div className="mt-12 text-center text-slate-400 text-sm font-bold">
          آخر تحديث: 29 يوليو 2026
        </div>
      </div>
    </div>
  );
}
