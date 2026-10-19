import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الشروط والأحكام',
  description: 'شروط استخدام منصة نمّي أعمالك.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <section className="bg-slate-950 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">الشروط والأحكام</h1>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-black text-slate-900 mb-4">قبول الشروط</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            باستخدامك لمنصة "نمّي أعمالك"، فإنك توافق على هذه الشروط والأحكام. إذا لم توافق، يرجى عدم استخدام المنصة.
          </p>

          <h2 className="text-2xl font-black text-slate-900 mb-4">استخدام المنصة</h2>
          <ul className="text-slate-600 leading-relaxed mb-6 list-disc pr-6 space-y-2">
            <li>يجب استخدام المنصة لأغراض تجارية مشروعة فقط</li>
            <li>يحظر استخدام المنصة لأي أنشطة غير قانونية أو احتيالية</li>
            <li>أنت مسؤول عن دقة البيانات التي تدخلها</li>
            <li>لا يجوز مشاركة حسابك مع آخرين</li>
          </ul>

          <h2 className="text-2xl font-black text-slate-900 mb-4">الرسوم والاشتراكات</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            تتوفر المنصة بباقة مجانية وباقات مدفوعة. الرسوم موضحة في صفحة الأسعار. يمكن إلغاء الاشتراك في أي وقت.
          </p>

          <h2 className="text-2xl font-black text-slate-900 mb-4">المسؤولية</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            تُقدم المنصة "كما هي" دون ضمانات صريحة أو ضمنية. لا نتحمل مسؤولية أي خسائر مباشرة أو غير مباشرة ناتجة عن استخدام المنصة.
          </p>

          <h2 className="text-2xl font-black text-slate-900 mb-4">تعديل الشروط</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات جوهرية.
          </p>

          <p className="text-slate-400 text-sm">آخر تحديث: {new Date().getFullYear()}</p>
        </div>
      </section>
    </div>
  );
}
