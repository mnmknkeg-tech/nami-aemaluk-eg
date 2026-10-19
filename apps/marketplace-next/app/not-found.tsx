import { Home, Search } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4" dir="rtl">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-brand-cyan/20 mb-4">404</div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3">الصفحة غير موجودة</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-cyan text-brand-black rounded-xl font-bold text-sm hover:bg-brand-cyan/90 transition-colors"
          >
            <Home className="w-4 h-4" />
            الصفحة الرئيسية
          </Link>
          <Link
            href="/dalil"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            <Search className="w-4 h-4" />
            البحث في الدليل
          </Link>
        </div>
      </div>
    </div>
  );
}

