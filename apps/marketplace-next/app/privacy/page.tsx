import { Metadata } from 'next';
import { Shield, Lock, Eye, Server, Smartphone, Globe, Info } from 'lucide-react';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية',
  description: 'سياسة الخصوصية وحماية البيانات في منصة من مكانك - كيف نحمي بياناتك ونحترم خصوصيتك',
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'سياسة الخصوصية - من مكانك', description: 'سياسة الخصوصية وحماية البيانات في منصة من مكانك', url: '/privacy', type: 'article' },
  twitter: { card: 'summary', title: 'سياسة الخصوصية - من مكانك', description: 'سياسة الخصوصية وحماية البيانات في منصة من مكانك' },
};

export default function PrivacyPage() {
  const sections = [
    { 
      title: '1. البيانات التي نجمعها', 
      content: 'نقوم بجمع المعلومات التي تقدمها لنا مباشرة عند إنشاء حساب، مثل اسمك، بريدك الإلكتروني، رقم هاتفك، وتفاصيل نشاطك التجاري. كما نجمع بيانات تقنية تلقائياً مثل عنوان IP ونوع الجهاز لضمان أمان المنصة.',
      icon: Info
    },
    { 
      title: '2. كيف نستخدم بياناتك', 
      content: 'نستخدم بياناتك لتقديم خدماتنا وتحسينها، معالجة الطلبات، التواصل معك بخصوص حسابك، وتخصيص تجربتك على المنصة. لن نقوم ببيع بياناتك لأطراف ثالثة لأغراض تسويقية دون موافقتك.',
      icon: Eye
    },
    { 
      title: '3. حماية وأمن المعلومات', 
      content: 'نطبق معايير أمنية عالية لحماية بياناتك من الوصول غير المصرح به. نستخدم تقنيات التشفير (SSL) لتأمين نقل البيانات الحساسة، ونقوم بمراجعة إجراءاتنا بانتظام لضمان أعلى مستوى من الحماية.',
      icon: Lock
    },
    { 
      title: '4. ملفات تعريف الارتباط (Cookies)', 
      content: 'نستخدم ملفات تعريف الارتباط لتحسين أداء الموقع وتذكر تفضيلاتك. يمكنك التحكم في إعدادات ملفات تعريف الارتباط من خلال متصفحك، ولكن قد يؤثر ذلك على بعض وظائف المنصة.',
      icon: Globe
    },
    { 
      title: '5. حقوقك كمستخدم', 
      content: 'لديك الحق في الوصول إلى بياناتك الشخصية، تعديلها، أو طلب حذفها في أي وقت. يمكنك القيام بذلك من خلال إعدادات حسابك أو بالتواصل مع فريق الدعم لدينا.',
      icon: Smartphone
    },
  ];

  return (
    <div className="bg-white dark:bg-brand-black min-h-screen">
      {/* Header */}
      <section className="py-20 md:py-32 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <div className="w-20 h-20 bg-brand-cyan/10 text-brand-cyan rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-cyan/20">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">سياسة <span className="text-gradient">الخصوصية</span></h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            نحن في "من مكانك" نلتزم بحماية خصوصيتك وضمان أمان بياناتك الشخصية والتجارية في جميع الأوقات.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-20">
        <div className="space-y-12">
          {sections.map((s, i) => (
            <section key={i} className="group relative">
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 shrink-0 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-brand-cyan group-hover:bg-brand-cyan group-hover:text-white transition-all">
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

        <div className="mt-20 p-8 md:p-12 bg-brand-black rounded-[3rem] text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
             <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/30 rounded-full blur-3xl" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black mb-6 relative z-10 text-white">هل لديك أي استفسار؟</h2>
          <p className="text-white/60 font-bold text-lg mb-8 relative z-10">
            إذا كانت لديك أي أسئلة حول سياسة الخصوصية الخاصة بنا، فلا تتردد في التواصل مع فريق حماية البيانات.
          </p>
          <a href="/contact" className="inline-flex px-8 py-4 bg-brand-gradient rounded-2xl font-black text-white hover:shadow-glow-cyan transition-all relative z-10">
            تواصل معنا
          </a>
        </div>

        <div className="mt-12 text-center text-slate-400 text-sm font-bold">
          آخر تحديث: 29 يوليو 2026
        </div>
      </div>
    </div>
  );
}
