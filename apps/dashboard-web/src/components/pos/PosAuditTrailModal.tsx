'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, X } from 'lucide-react';
import type { AuditEntry } from '@/lib/pos-utils';

type Props = {
  show: boolean;
  onClose: () => void;
  entries: AuditEntry[];
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosAuditTrailModal({ show, onClose, entries, isArabic }: Props) {
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
            className="w-full max-w-md bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-row-reverse">
              <h3 className="text-lg font-black flex items-center gap-2">
                <BarChart3 size={18} /> {isArabic ? 'سجل العمليات' : 'Audit Trail'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            {entries.length === 0 ? (
              <div className="text-center text-slate-400 py-8 font-bold text-sm">
                {isArabic ? 'لا توجد عمليات' : 'No entries'}
              </div>
            ) : (
              <div className="space-y-2">
                {entries.slice(0, 50).map((a) => (
                  <div key={a.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between text-xs font-black flex-row-reverse">
                      <span className="text-slate-900">{a.action}</span>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(a.ts).toLocaleString('ar-EG')}
                      </span>
                    </div>
                    {a.detail && (
                      <div className="text-[10px] text-slate-500 font-bold mt-1">{a.detail}</div>
                    )}
                    {a.amount != null && (
                      <div className="text-[10px] text-[#BD00FF] font-black mt-0.5">
                        ج.م {Number(a.amount).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
