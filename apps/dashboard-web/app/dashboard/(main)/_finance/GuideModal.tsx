'use client';

import React from 'react';
import { X, Info, FileText } from 'lucide-react';

type Props = {
  onClose: () => void;
  isArabic: boolean;
};

export default function InvoiceGuideModal({ onClose, isArabic }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 flex-row-reverse">
          <h2 className="text-xl font-black text-slate-900">
            {isArabic ? 'دليل الفواتير' : 'Invoice Guide'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="space-y-6 text-right">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Info size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900">
                {isArabic ? 'وظيفة الصفحة' : 'Page Function'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isArabic
                ? 'إدارة فواتير العملاء وتتبع المدفوعات مع محرر بنود كامل.'
                : 'Manage customer invoices and track payments with full line item editor.'}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900">{isArabic ? 'الميزات' : 'Features'}</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
              <li>
                •{' '}
                {isArabic
                  ? 'إنشاء فواتير جديدة مع محرر بنود كامل'
                  : 'Create new invoices with full line item editor'}
              </li>
              <li>
                •{' '}
                {isArabic
                  ? 'إدارة البنود (إضافة/حذف/تعديل)'
                  : 'Manage line items (add/delete/edit)'}
              </li>
              <li>
                •{' '}
                {isArabic
                  ? 'حسابات تلقائية (المجموع، الخصم، الضريبة، الإجمالي)'
                  : 'Automatic calculations (subtotal, discount, tax, total)'}
              </li>
              <li>
                •{' '}
                {isArabic
                  ? 'طباعة احترافية مع تصميم HTML جميل'
                  : 'Professional printing with beautiful HTML design'}
              </li>
              <li>• {isArabic ? 'تصدير PDF عبر iframe' : 'PDF export via iframe'}</li>
              <li>
                •{' '}
                {isArabic
                  ? 'دعم RTL كامل للعربية والإنجليزية'
                  : 'Full RTL support for Arabic and English'}
              </li>
              <li>
                •{' '}
                {isArabic
                  ? 'ضريبة القيمة المضافة (VAT) مع نسبة مئوية قابلة للتعديل'
                  : 'VAT with adjustable percentage'}
              </li>
              <li>
                •{' '}
                {isArabic ? 'تصميم الإيصال مع Receipt Theme' : 'Receipt design with Receipt Theme'}
              </li>
              <li>
                •{' '}
                {isArabic
                  ? 'تتبع الحالة (مسودة، مرسلة، مدفوعة، متأخرة)'
                  : 'Status tracking (draft, sent, paid, overdue)'}
              </li>
              <li>• {isArabic ? 'إحصائيات شاملة للفواتير' : 'Comprehensive invoice statistics'}</li>
              <li>• {isArabic ? 'تصدير تقارير الفواتير' : 'Export invoice reports'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
