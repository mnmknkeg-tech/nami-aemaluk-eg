'use client';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-50 dark:bg-slate-950">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3">حدث خطأ حرج</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
              عذراً، حدث مشكلة غير متوقعة. يرجى المحاولة مرة أخرى.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-cyan text-brand-black rounded-xl font-bold text-sm hover:bg-brand-cyan/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                <Home className="w-4 h-4" />
                الصفحة الرئيسية
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

