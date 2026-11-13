'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownCircle, ArrowUpCircle, X } from 'lucide-react';
import type { CashMovement } from '@/lib/pos-utils';

type Props = {
  show: boolean;
  onClose: () => void;
  type: string;
  onTypeChange: (t: 'in' | 'out') => void;
  amount: number;
  onAmountChange: (v: number) => void;
  reason: string;
  onReasonChange: (v: string) => void;
  onSubmit: () => void;
  movements: CashMovement[];
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosCashMovementModal({
  show,
  onClose,
  type,
  onTypeChange,
  amount,
  onAmountChange,
  reason,
  onReasonChange,
  onSubmit,
  movements,
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
            className="w-full max-w-xs bg-white rounded-[2rem] p-5"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-row-reverse">
              <h3 className="text-base font-black flex items-center gap-2">
                <ArrowDownCircle size={16} /> {isArabic ? 'حركة نقدية' : 'Cash Movement'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => onTypeChange('in')}
                className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 ${type === 'in' ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-600'}`}
              >
                <ArrowUpCircle size={14} /> {isArabic ? 'إيداع' : 'Cash In'}
              </button>
              <button
                type="button"
                onClick={() => onTypeChange('out')}
                className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 ${type === 'out' ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-600'}`}
              >
                <ArrowDownCircle size={14} /> {isArabic ? 'صرف' : 'Cash Out'}
              </button>
            </div>
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
              placeholder={isArabic ? 'المبلغ' : 'Amount'}
              className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center mb-2"
              min={0}
            />
            <input
              type="text"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder={isArabic ? 'السبب' : 'Reason'}
              className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-bold mb-3"
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={amount <= 0 || !reason.trim()}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-sm disabled:opacity-50"
            >
              {isArabic ? 'تأكيد' : 'Confirm'}
            </button>
            {movements.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 max-h-32 overflow-y-auto">
                {movements.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex justify-between text-[10px] font-bold">
                    <span className={m.type === 'in' ? 'text-emerald-600' : 'text-red-500'}>
                      {m.type === 'in' ? '+' : '-'} ج.م {m.amount.toFixed(2)}
                    </span>
                    <span className="text-slate-400 truncate max-w-[100px]">{m.reason}</span>
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
