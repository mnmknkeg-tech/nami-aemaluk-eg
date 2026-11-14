'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

type PageBackProps = {
  /** وجهة الرجوع الاحتياطية (الصفحة الرئيسية للسيكشن) لو مفيش تاريخ رجوع */
  fallback: string;
  /** نص الـ tooltip / accessibility */
  title?: string;
  /** حجم الأيقونة */
  size?: number;
};

/**
 * زر الرجوع الموحّد لكل صفحات الـ dashboard الفرعية.
 * نفس ستايل زر "رجوع إلى المنتجات" الموجود في إضافة المنتج — دائرة بيضاء بحدود slate.
 * في RTL السهم بيشاور يمين (اتجاه الرجوع الطبيعي في الواجهة العربية).
 */
export default function PageBack({ fallback, title = 'رجوع', size = 18 }: PageBackProps) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="h-10 w-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
      title={title}
      aria-label={title}
    >
      <ArrowRight size={size} />
    </button>
  );
}
