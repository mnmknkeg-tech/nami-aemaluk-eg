'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import BuilderApp from '@/components/website-builder/App';

/**
 * صفحة "الموقع الإلكتروني" — تستضيف مُنشئ المواقع (Builder) داخل اللوحة.
 * البلدر يعتمد على window/localStorage لذا يتم تركيبه بعد الـ mount فقط.
 */
export default function MySitePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">جاري تحميل مُنشئ المواقع…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-slate-100 overflow-hidden">
      <BuilderApp fullScreen onExit={() => router.push('/dashboard')} />
    </div>
  );
}
