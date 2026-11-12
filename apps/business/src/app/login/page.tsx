'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { dashboardLoginUrl } from '@/lib/appUrls';

function LoginRedirect() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const followShopId = searchParams.get('followShopId');

  useEffect(() => {
    const target = dashboardLoginUrl({ returnTo, followShopId });
    window.location.replace(target);
  }, [returnTo, followShopId]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-700"
      dir="rtl"
    >
      <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
      <h1 className="text-xl font-black mb-2">جاري التحويل لصفحة تسجيل الدخول الموحدة...</h1>
      <p className="text-sm text-slate-400">إذا لم يتم تحويلك تلقائياً، اضغط أدناه</p>
      <a
        href={dashboardLoginUrl({ returnTo, followShopId })}
        className="mt-4 px-6 py-3 rounded-2xl bg-cyan-500 text-slate-900 font-black text-sm hover:bg-cyan-400 transition-all shadow-md"
      >
        الدخول الآن
      </a>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        </div>
      }
    >
      <LoginRedirect />
    </Suspense>
  );
}
