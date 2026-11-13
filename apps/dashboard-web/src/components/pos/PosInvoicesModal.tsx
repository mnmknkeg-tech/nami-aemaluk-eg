'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, X, Loader2, Printer, RotateCcw, Sliders } from 'lucide-react';

type Props = {
  show: boolean;
  onClose: () => void;
  invoices: any[];
  loading: boolean;
  statusStyle: (status: string) => string;
  onReprint: (inv: any) => void;
  onReturn: (inv: any) => void;
  onEdit: (inv: any) => void;
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosInvoicesModal({
  show,
  onClose,
  invoices,
  loading,
  statusStyle,
  onReprint,
  onReturn,
  onEdit,
  isArabic,
}: Props) {
  return (
    <AnimatePresence>
      {show && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <MotionDiv
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            className="w-full max-w-2xl bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-row-reverse">
              <h3 className="text-base font-black flex items-center gap-2">
                <Receipt size={16} className="text-[#0098a8]" />{' '}
                {isArabic ? 'فواتير الكاشير' : 'Cashier Invoices'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-300">
                  <Loader2 size={28} className="animate-spin" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                  <Receipt size={48} className="mb-3 opacity-30" />
                  <p className="font-black text-sm">
                    {isArabic ? 'لا توجد فواتير كاشير بعد' : 'No cashier invoices yet'}
                  </p>
                </div>
              ) : (
                invoices.map((inv: any) => {
                  const returned =
                    String(inv?.status || '').toUpperCase() === 'RETURNED' ||
                    String(inv?.status || '').toUpperCase() === 'REFUNDED';
                  return (
                    <div
                      key={inv.id}
                      className={`border rounded-2xl p-3 ${returned ? 'border-red-100 bg-red-50/40' : 'border-slate-100 bg-white'}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 flex-row-reverse">
                        <div className="text-right min-w-0">
                          <div className="text-xs font-black text-slate-900 flex items-center gap-2 justify-end">
                            <span>#{String(inv.id || '').slice(0, 8)}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${statusStyle(inv.status)}`}
                            >
                              {returned ? 'مرتجعة' : 'مكتملة'}
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                            {String(inv.createdAt || '')
                              .replace('T', ' ')
                              .slice(0, 16)}
                            {inv.customerPhone ? ` • ${inv.customerPhone}` : ''}
                          </div>
                        </div>
                        <span className="text-sm font-black text-slate-900 shrink-0">
                          ج.م {Number(inv.total || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-row-reverse">
                        <button
                          type="button"
                          onClick={() => onReprint(inv)}
                          className="flex-1 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1"
                        >
                          <Printer size={12} /> {isArabic ? 'طباعة' : 'Print'}
                        </button>
                        <button
                          type="button"
                          disabled={returned}
                          onClick={() => onReturn(inv)}
                          className="flex-1 py-2 rounded-xl bg-red-50 border border-red-100 text-[10px] font-black text-red-600 hover:bg-red-100 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <RotateCcw size={12} /> {isArabic ? 'مرتجع سريع' : 'Return'}
                        </button>
                        <button
                          type="button"
                          disabled={returned}
                          onClick={() => onEdit(inv)}
                          className="flex-1 py-2 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[10px] font-black text-[#0098a8] hover:bg-[#00E5FF]/20 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Sliders size={12} /> {isArabic ? 'تعديل' : 'Edit'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
