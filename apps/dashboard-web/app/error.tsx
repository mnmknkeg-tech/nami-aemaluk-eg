'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-3">حدث خطأ غير متوقع</h1>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
          عذراً، حدثت مشكلة في تحميل الصفحة. يمكنك المحاولة مرة أخرى أو العودة إلى لوحة التحكم.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-[var(--brand-primary)] rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors"
          >
            <Home className="w-4 h-4" />
            لوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  );
}
