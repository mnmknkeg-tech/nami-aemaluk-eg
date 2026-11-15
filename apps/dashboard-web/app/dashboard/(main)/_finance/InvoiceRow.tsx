'use client';

import React from 'react';
import { Check, Edit, Send, Trash2, DollarSign } from 'lucide-react';
import { InvRow, InvRowAction } from '@/components/inventory/InventoryShell';
import { formatAmount as formatMoney } from '@/lib/format';
import type { Invoice } from './types';
import { STATUS_CONFIG } from './statusMeta';

type Props = {
  invoice: Invoice;
  isArabic: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onSend: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function InvoiceRow({
  invoice,
  isArabic,
  selected,
  onToggleSelect,
  onEdit,
  onSend,
  onDelete,
}: Props) {
  const statusConfig =
    STATUS_CONFIG[invoice.state] || STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
  const remaining = Math.max(invoice.totalAmount - invoice.paidAmount, 0);
  const canPay =
    invoice.state === 'unpaid' || invoice.state === 'partial' || invoice.state === 'overdue';

  return (
    <InvRow key={invoice.id} muted={invoice.state === 'draft' || invoice.state === 'cancelled'}>
      <div className="col-span-1 flex items-center">
        <button onClick={() => onToggleSelect(invoice.id)} className="p-1">
          {selected ? (
            <Check size={16} className="text-[#00E5FF]" />
          ) : (
            <div className="w-4 h-4 border-2 border-slate-300 rounded" />
          )}
        </button>
      </div>
      <div className="col-span-2 min-w-0">
        <div className="font-bold text-slate-900 text-sm truncate">{invoice.invoiceNumber}</div>
        {invoice.source === 'acc' && (
          <div className="text-[10px] text-slate-400 font-bold">مستند محاسبي</div>
        )}
      </div>
      <div className="col-span-2 min-w-0">
        <div className="text-slate-600 text-sm truncate">{invoice.customerName || '—'}</div>
        <div className="text-[11px] text-slate-400 truncate">{invoice.customerEmail}</div>
      </div>
      <div className="col-span-1">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
            invoice.kind === 'purchase'
              ? 'text-amber-600 bg-amber-50 border-amber-200'
              : 'text-emerald-600 bg-emerald-50 border-emerald-200'
          }`}
        >
          {invoice.kind === 'purchase' ? 'شراء' : 'بيع'}
        </span>
      </div>
      <div className="col-span-1 text-slate-600 text-sm">
        {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('ar-EG') : '—'}
      </div>
      <div className="col-span-2">
        <div className="font-bold text-slate-900 text-sm">
          ج.م {formatMoney(invoice.totalAmount)}
        </div>
        {remaining > 0 && invoice.state !== 'draft' && (
          <div className="text-[11px] text-rose-500 font-bold">
            متبقي ج.م {formatMoney(remaining)}
          </div>
        )}
      </div>
      <div className="col-span-1 text-slate-600 text-sm">ج.م {formatMoney(invoice.paidAmount)}</div>
      <div className="col-span-1">
        <span
          className={`px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 ${statusConfig.color}`}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </span>
      </div>
      <div className="col-span-1 flex items-center gap-1.5">
        {invoice.source === 'legacy' ? (
          <>
            <InvRowAction onClick={() => onEdit(invoice.id)} title={isArabic ? 'تعديل' : 'Edit'}>
              <Edit size={14} />
            </InvRowAction>
            <InvRowAction onClick={() => onSend(invoice.id)} title={isArabic ? 'إرسال' : 'Send'}>
              <Send size={14} />
            </InvRowAction>
            <InvRowAction
              onClick={() => onDelete(invoice.id)}
              title={isArabic ? 'حذف' : 'Delete'}
              danger
            >
              <Trash2 size={14} />
            </InvRowAction>
          </>
        ) : (
          <a
            href="/dashboard/finance/collections"
            title={isArabic ? 'المدفوعات وكشف الحساب' : 'Payments & statement'}
            className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <DollarSign size={14} />
          </a>
        )}
        {canPay && invoice.source === 'legacy' && (
          <a
            href="/dashboard/finance/collections"
            title={isArabic ? 'تسجيل دفعة' : 'Record payment'}
            className="h-8 px-2.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center hover:bg-emerald-100 transition-colors"
          >
            دفعة
          </a>
        )}
      </div>
    </InvRow>
  );
}
