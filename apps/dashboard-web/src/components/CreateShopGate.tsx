'use client';

import React, { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { apiRequest } from '@/lib/auth';

/**
 * بوابة التحقق من حالة المتجر:
 * تقوم بالتحقق مما إذا كان المتجر موقوفاً فقط لعرض تنبيه الإيقاف.
 * توجه المستخدم دائماً للوحة التحكم بدون حجبها بصفحات تسجيل مكررة أو وهمية.
 */
export default function CreateShopGate({
  children,
  skip = false,
}: {
  children: React.ReactNode;
  skip?: boolean;
}) {
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    if (skip) return;
    let cancelled = false;
    (async () => {
      try {
        const shop = await apiRequest('/shops/me', { cache: 'no-store' });
        if (cancelled) return;
        if (shop?.id && String(shop.status).toUpperCase() === 'SUSPENDED') {
          setIsSuspended(true);
        }
      } catch {
        // أي خطأ يتم تجاوزه والتوجه للوحة
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [skip]);

  if (isSuspended) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-slate-50 p-4"
        style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
        dir="rtl"
      >
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <Store size={26} />
          </div>
          <h1 className="text-lg font-black text-slate-900 mb-2">متجرك موقوف حالياً</h1>
          <p className="text-sm text-slate-500 font-semibold leading-relaxed">
            تم إيقاف متجرك من إدارة المنصة. تواصل مع الدعم لمعرفة التفاصيل وإعادة تفعيل حسابك.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
