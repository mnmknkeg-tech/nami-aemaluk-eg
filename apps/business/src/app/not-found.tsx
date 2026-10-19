import { Home, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4" dir="rtl">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-[#00E5FF]/20 mb-4">404</div>
        <h1 className="text-2xl font-black text-slate-900 mb-3">الصفحة غير موجودة</h1>
        <p className="text-slate-500 font-medium mb-8">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#00E5FF] text-slate-900 rounded-xl font-bold text-sm hover:bg-[#00E5FF]/90 transition-colors"
          >
            <Home className="w-4 h-4" />
            الصفحة الرئيسية
          </Link>
          <Link
            href="/new"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            الجديد
          </Link>
        </div>
      </div>
    </div>
  );
}

