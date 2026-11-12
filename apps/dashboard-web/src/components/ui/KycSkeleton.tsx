'use client';

import React from 'react';
import { Bar, SkCard, SkField } from '@/components/ui/Skeleton';

/**
 * هيكل `/onboarding/kyc` — معالج 3 خطوات.
 * الشكل مطابق للصفحة: عنوان + مؤشر خطوات (3 دوائر متصلة) + كارت الحقول.
 */
export function KycSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8" dir="rtl">
      <div className="container mx-auto px-4 max-w-2xl space-y-8">
        <Bar className="h-8 w-56" style={{ opacity: 0.8 }} />

        {/* مؤشر الخطوات */}
        <div className="flex items-center gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <React.Fragment key={i}>
              <Bar className="h-12 w-12 rounded-2xl flex-shrink-0" />
              {i < 2 && <Bar className="h-1 flex-1 rounded-full" style={{ opacity: 0.4 }} />}
            </React.Fragment>
          ))}
        </div>

        {/* كارت الحقول */}
        <SkCard className="p-6 space-y-6">
          <Bar className="h-5 w-44" style={{ opacity: 0.7 }} />
          <SkField labelWidth="w-24" />
          <SkField labelWidth="w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <SkField labelWidth="w-20" />
            <SkField labelWidth="w-24" />
          </div>
        </SkCard>

        {/* أزرار الإرسال */}
        <div className="flex items-center justify-between gap-3">
          <Bar className="h-12 w-28 rounded-xl" style={{ opacity: 0.5 }} />
          <Bar className="h-12 w-40 rounded-xl" style={{ opacity: 0.85 }} />
        </div>
      </div>
    </div>
  );
}

export default KycSkeleton;
