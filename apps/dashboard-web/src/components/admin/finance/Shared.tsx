'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/admin/ui';
import { cn } from '@/lib/cn';
import type { Tone } from '@/components/admin/ui';

const ICON: Record<Tone, string> = {
  cyan: 'bg-cyan-50 text-cyan-600',
  purple: 'bg-purple-50 text-purple-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  sky: 'bg-sky-50 text-sky-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  slate: 'bg-slate-100 text-slate-500',
};

const TEXT: Record<Tone, string> = {
  cyan: 'text-cyan-600',
  purple: 'text-purple-600',
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  sky: 'text-sky-600',
  indigo: 'text-indigo-600',
  slate: 'text-slate-500',
};

/** كارت رقم واحد — مستخدم في كل تبويبات المالية. */
export function Kpi({
  label,
  value,
  icon: IconComponent,
  tone = 'slate',
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ size?: number }>;
  tone?: Tone;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', ICON[tone])}>
        <IconComponent size={17} />
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={cn('text-base md:text-lg font-black tabular-nums', TEXT[tone])}>{value}</p>
    </div>
  );
}

/**
 * رسالة موحّدة للأقسام غير المربوطة بالـ backend.
 * موجودة هنا مرة واحدة بدل تكرار نفس الـ placeholder في كل تبويب.
 */
export function NotWired({ what }: { what: string }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="بانتظار ربط الـ backend"
      subtitle={`${what} غير متاح بعد — الـ endpoint لم يُضف في الـ backend، لذلك لا نعرض أي أرقام تقديرية.`}
    />
  );
}
