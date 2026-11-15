'use client';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Arabic section name shown in the heading, e.g. «المبيعات» */
  section?: string;
};

/**
 * Shared per-section error boundary UI. Each dashboard section renders this
 * through its own error.tsx, so a crash inside one section keeps the rest of
 * the dashboard (sidebar + other sections) fully alive.
 */
export default function SectionError({ error, reset, section }: Props) {
  useEffect(() => {
    // keep the failure observable in the console without crashing the shell
    console.error(`[${section || 'section'}] render error:`, error);
  }, [error, section]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="bg-white border border-red-100 rounded-xl py-12 px-6 flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
          <AlertTriangle size={22} />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">
            {section ? `حصلت مشكلة في قسم ${section}` : 'حصلت مشكلة في تحميل القسم'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            جرب إعادة المحاولة — لو المشكلة استمرت ابعتلنا
          </p>
          {error?.digest && (
            <p className="text-[10px] text-slate-300 mt-2 font-mono">#{error.digest}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-lg font-semibold text-xs hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={14} />
            إعادة المحاولة
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg font-semibold text-xs hover:bg-slate-50 transition-colors"
          >
            <Home size={14} />
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
