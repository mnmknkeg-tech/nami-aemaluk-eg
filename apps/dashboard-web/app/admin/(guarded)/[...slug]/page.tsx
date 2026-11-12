'use client';

import React from 'react';
import Link from 'next/link';
import { Construction, LayoutDashboard } from 'lucide-react';

export default function AdminCatchAll() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-12 text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-3xl bg-amber-50 flex items-center justify-center">
          <Construction size={28} className="text-amber-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">الصفحة قيد التطوير</h1>
        <p className="text-slate-500 font-bold text-sm mb-8">
          هذه الصفحة غير موجودة أو لم تُبنَ بعد — كل الأدوات متاحة من القائمة الجانبية.
        </p>
        <Link
          href="/admin/dashboard"
          prefetch
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-700 transition-colors"
        >
          <LayoutDashboard size={16} /> العودة للوحة التحكم
        </Link>
      </div>
    </div>
  );
}
