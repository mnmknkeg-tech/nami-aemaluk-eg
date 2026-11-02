'use client';

import React from 'react';
import { Bar } from '@/components/ui/Skeleton';

/**
 * هيكل صفحات المصادقة: `/login` و `/signup` (على تطبيق الـ business).
 *
 * الشكل مطابق للصفحة الحقيقية: شعار مربع بحواف كبيرة، عنوان،
 * سطر وصفي، حقول بحواف `rounded-2xl`، وزر داكن — فمفيش layout shift
 * لما المحتوى يوصل.
 */
export function AuthSkeleton({
  title = 'w-72',
  fields = 2,
  showForgotRow = true,
  showSplit = false,
}: {
  title?: string;
  fields?: number;
  showForgotRow?: boolean;
  showSplit?: boolean;
}) {
  return (
    <div
      className="max-w-[1400px] mx-auto px-6 py-20 flex items-center justify-center min-h-[80vh]"
      dir="rtl"
    >
      <div className="w-full max-w-md text-center">
        {/* الشعار + العنوان */}
        <div className="flex flex-col items-center text-center mb-12">
          <Bar className="w-20 h-20 rounded-[2rem] mb-6" />
          <Bar className={['h-10', title].join(' ')} style={{ opacity: 0.75 }} />
          <Bar className="h-3.5 w-72 mt-4" style={{ opacity: 0.5 }} />
        </div>

        {/* الحقول */}
        <div className="space-y-6 text-right">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div
                className="flex items-center justify-between"
                style={showForgotRow && i === 1 ? undefined : { justifyContent: 'flex-start' }}
              >
                <Bar className="h-3 w-28" style={{ opacity: 0.5 }} />
                {showForgotRow && i === 1 && <Bar className="h-3 w-28" style={{ opacity: 0.4 }} />}
              </div>
              <Bar className="h-14 w-full rounded-2xl" style={{ opacity: 0.75 }} />
            </div>
          ))}

          {/* حقول مقسومة (التسجيل: اسم/تليفون) */}
          {showSplit && (
            <div className="grid grid-cols-2 gap-4">
              <Bar className="h-14 w-full rounded-2xl" style={{ opacity: 0.75 }} />
              <Bar className="h-14 w-full rounded-2xl" style={{ opacity: 0.75 }} />
            </div>
          )}

          {/* الزر الأساسي */}
          <Bar className="h-14 w-full rounded-[1.5rem]" style={{ opacity: 0.85 }} />

          {/* فاصل + دخول جوجل */}
          <div className="flex items-center gap-4 pt-2">
            <Bar className="h-px flex-1" style={{ opacity: 0.3 }} />
            <Bar className="h-3 w-16" style={{ opacity: 0.4 }} />
            <Bar className="h-px flex-1" style={{ opacity: 0.3 }} />
          </div>
          <Bar className="h-14 w-full rounded-[1.5rem]" style={{ opacity: 0.6 }} />

          {/* رابط التذييل */}
          <div className="pt-4 flex items-center justify-center gap-2">
            <Bar className="h-3 w-24" style={{ opacity: 0.4 }} />
            <Bar className="h-3 w-24" style={{ opacity: 0.5 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthSkeleton;
