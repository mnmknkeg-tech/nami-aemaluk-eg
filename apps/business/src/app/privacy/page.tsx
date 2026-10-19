import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية',
  description: 'كيف نحمي بياناتك ونحترم خصوصيتك.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <section className="bg-slate-950 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">سياسة الخصوصية</h1>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 prose prose-slate">
          <h2 className="text-2xl font-black text-slate-900 mb-4">مقدمة</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            منصة "نمّي أعمالك" تحترم خصوصية مستخدميها وتلتزم بحماية بياناتهم الشخصية. توضح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا لبياناتك.
          </p>

          <h2 className="text-2xl font-black text-slate-900 mb-4">البيانات التي نجمعها</h2>
          <ul className="text-slate-600 leading-relaxed mb-6 list-disc pr-6 space-y-2">
            <li>البيانات الأساسية: الاسم، البريد الإلكتروني، رقم الهاتف</li>
            <li>بيانات المتجر: اسم المتجر، العنوان، مواعيد العمل، الوصف</li>
            <li>بيانات الاستخدام: كيفية تفاعلك مع المنصة</li>
          </ul>

          <h2 className="text-2xl font-black text-slate-900 mb-4">كيف نستخدم بياناتك</h2>
          <ul className="text-slate-600 leading-relaxed mb-6 list-disc pr-6 space-y-2">
            <li>لتقديم خدمات المنصة وتحسينها</li>
            <li>للتواصل معك بخصوص حسابك أو خدماتنا</li>
            <li>لتحليل أداء المنصة وتطويرها</li>
          </ul>

          <h2 className="text-2xl font-black text-slate-900 mb-4">حماية البيانات</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            نستخدم إجراءات أمنية مناسبة لحماية بياناتك من الوصول غير المصرح به أو التعديل أو الإفصاح.
          </p>

          <h2 className="text-2xl font-black text-slate-900 mb-4">حقوقك</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            لديك الحق في الوصول إلى بياناتك وتصحيحها أو حذفها. يمكنك طلب حذف حسابك في أي وقت.
          </p>

          <p className="text-slate-400 text-sm">آخر تحديث: {new Date().getFullYear()}</p>
        </div>
      </section>
    </div>
  );
}
