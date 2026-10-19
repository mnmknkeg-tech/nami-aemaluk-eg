'use client';

/**
 * هيكل صفحات الموارد البشرية الموحّد — يعيد استخدام بلوكات هيكل المخزون
 * (InventoryShell) حرفياً لضمان تطابق التصميم مع صفحات المنتجات والطلبات:
 * هيدر أبيض (عنوان + وصف + إجراءات) ← تابات بعدّادات ← بطاقة بحث/فلاتر
 * ← جدول grid-cols-12 ← ترقيم صفحات.
 * مرجع التصميم: app/dashboard/(main)/inventory/products/page.tsx
 */
import React from 'react';
import { X } from 'lucide-react';

export {
  INV_PAGE_FONT as HR_PAGE_FONT,
  SectionTabs as HrSectionTabs,
  useInvSectionTab as useHrSectionTab,
  InvControlsCard as HrControlsCard,
  InvToolbar as HrToolbar,
  InvToolButton as HrToolButton,
  InvLoading as HrLoading,
  InvEmpty as HrEmpty,
  InventoryPage as HrPageShell,
  InvTableCard as HrTableCard,
  InvRow as HrRow,
  InvRowAction as HrRowAction,
  InvStatusPill as HrStatusPill,
  InvPagination as HrPagination,
} from '@/components/inventory/InventoryShell';

export type {
  InvTab as HrTab,
  InvColumn as HrColumn,
} from '@/components/inventory/InventoryShell';

/** العملة المعتمدة في صفحات HR */
export const HR_CURRENCY = 'ج.م';

/** تنسيق المبالغ — نفس أسلوب بقية الأقسام */
export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value || 0);
  return `${HR_CURRENCY} ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** كلاسات حقول النماذج داخل المودالات — نفس ستايل محرر المنتجات */
export const HR_INPUT_CLS =
  'w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors';

/** كلاسات select الفلاتر داخل بطاقة التحكم — نفس ستايل صفحة المنتجات */
export const HR_FILTER_SELECT_CLS =
  'h-10 px-3 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 focus:outline-none focus:border-slate-400';

/** حقول التاريخ داخل النماذج */
export const HR_DATE_INPUT_CLS = HR_INPUT_CLS;

/**
 * المودال الموحد لصفحات HR — نفس بنية مودالات صفحة المنتجات:
 * طبقة سوداء + لوحة بيضاء rounded-2xl قابلة للتمرير.
 */
export function HrModal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl ${maxWidth} w-full max-h-[85vh] overflow-y-auto p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-black text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        {footer && <div className="flex items-center gap-2 mt-6">{footer}</div>}
      </div>
    </div>
  );
}

/** حقل نموذج موحد — تسمية فوق المحتوى */
export function HrField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 mb-1.5 block">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

/** أزرار الحفظ/الإلغاء الموحدة أسفل المودالات */
export function HrModalActions({
  onCancel,
  onSubmit,
  submitLabel = 'حفظ',
  submitting,
  submitDisabled,
}: {
  onCancel: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  submitting?: boolean;
  submitDisabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="h-10 px-4 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        إلغاء
      </button>
      <button
        type={onSubmit ? 'button' : 'submit'}
        onClick={onSubmit}
        disabled={submitting || submitDisabled}
        className="h-10 px-5 rounded-xl bg-slate-900 text-white text-[12px] font-bold hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {submitting && (
          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        )}
        {submitting ? 'جاري الحفظ...' : submitLabel}
      </button>
    </div>
  );
}

/** تسميات عربية موحدة لحالات الموظفين */
export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  inactive: 'غير نشط',
};

/** pill حالة الموظف */
export function employeeStatusTone(status: string): 'emerald' | 'slate' {
  return String(status || 'active').toLowerCase() === 'active' ? 'emerald' : 'slate';
}
