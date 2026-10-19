'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** صفحة الإيرادات اندمجت كتابة في «القوائم المالية» (تابة: الإيرادات والنمو).
 *  الرابط القديم بيتحول تلقائيا — مفيش محتوى مكرر. */
export default function RevenueRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/financial-reports?tab=revenue');
  }, [router]);
  return (
    <div className="p-6 text-center text-sm font-bold text-slate-500">
      صفحة الإيرادات اندمجت في القوائم المالية — جاري التحويل…
    </div>
  );
}
