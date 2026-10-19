/**
 * لَبنة skeleton موحّدة لصفحات الداشبورد.
 *
 * كل صفحة ليها `loading.tsx` بياخد من هنا، فالتايباغ ظاهر في كل مكان
 * واللمسة (شدة الرمادي + سرعة) واحدة في كل المشروع.
 */
import React from 'react';
import { cn } from '@/lib/cn';

/** شريط/مستطيل أساسي — الأساس بتاع كل حاجة. */
export function Bar({
  className,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('rounded-lg bg-slate-200/70 animate-pulse', className)}
      style={style}
      {...rest}
    />
  );
}

/** كارت أبيض بحواف — الغلاف القياسي لأي كتلة. */
export function SkCard({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-white rounded-2xl border border-slate-100 p-4 md:p-5', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/** عنوان صفحة + زر إجراء — فوق كل صفحة في الداشبورد. */
export function SkHeader({
  titleWidth = 'w-44',
  subWidth = 'w-64',
  action = true,
}: {
  titleWidth?: string;
  subWidth?: string;
  action?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Bar className={cn('h-6', titleWidth)} />
        <Bar className={cn('h-3.5', subWidth)} style={{ opacity: 0.6 }} />
      </div>
      {action && <Bar className="h-9 w-28 rounded-xl" />}
    </div>
  );
}

/** صف كروت إحصائية — الشكل المتكرر فوق صفحات الداشبورد. */
export function SkStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkCard key={i} className="space-y-3">
          <Bar className="h-3.5 w-20" style={{ opacity: 0.6 }} />
          <Bar className="h-7 w-28" />
          <Bar className="h-3 w-16" style={{ opacity: 0.45 }} />
        </SkCard>
      ))}
    </div>
  );
}

/** جدول بسيط — عدد صفوف محدد عشان الشكل يطلع زي الجدول الحقيقي. */
export function SkTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <SkCard className="p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Bar key={i} className="h-3 flex-1" style={{ opacity: 0.5 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="px-4 py-4 flex gap-4 border-b border-slate-50 last:border-0"
          style={{ opacity: 1 - r * 0.12 }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Bar key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </SkCard>
  );
}

/** حقل فورم واحد: label + input — مطابق لاستايل الحقول في الكود. */
export function SkField({ labelWidth = 'w-20' }: { labelWidth?: string }) {
  return (
    <div className="space-y-2">
      <Bar className={cn('h-3 w-24', labelWidth)} style={{ opacity: 0.55 }} />
      <Bar className="h-14 w-full rounded-2xl" />
    </div>
  );
}
