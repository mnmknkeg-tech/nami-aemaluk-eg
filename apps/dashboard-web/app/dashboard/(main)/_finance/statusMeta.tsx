import React from 'react';
import { FileText, Clock, AlertTriangle, Send, Eye, CheckCircle2, XCircle } from 'lucide-react';

export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: { label: 'مسودة', color: 'bg-slate-50 text-slate-600', icon: <FileText size={12} /> },
  unpaid: { label: 'غير مدفوعة', color: 'bg-blue-50 text-blue-600', icon: <Clock size={12} /> },
  partial: {
    label: 'مدفوعة جزئيًا',
    color: 'bg-amber-50 text-amber-600',
    icon: <AlertTriangle size={12} />,
  },
  sent: { label: 'مرسلة', color: 'bg-blue-50 text-blue-600', icon: <Send size={12} /> },
  viewed: { label: 'تمت المشاهدة', color: 'bg-cyan-50 text-cyan-600', icon: <Eye size={12} /> },
  paid: {
    label: 'مدفوعة',
    color: 'bg-green-50 text-green-600',
    icon: <CheckCircle2 size={12} />,
  },
  overdue: {
    label: 'متأخرة',
    color: 'bg-red-50 text-red-700',
    icon: <AlertTriangle size={12} />,
  },
  cancelled: { label: 'ملغاة', color: 'bg-red-50 text-red-600', icon: <XCircle size={12} /> },
};
