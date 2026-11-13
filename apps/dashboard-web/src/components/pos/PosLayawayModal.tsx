'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X } from 'lucide-react';
import type { LayawayPlan } from '@/lib/pos-utils';

type Props = {
  show: boolean;
  onClose: () => void;
  total: number;
  cartLength: number;
  deposit: number;
  onDepositChange: (v: number) => void;
  onCreate: () => void;
  layaways: LayawayPlan[];
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosLayawayModal({
  show,
  onClose,
  total,
  cartLength,
  deposit,
  onDepositChange,
  onCreate,
  layaways,
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
            className="w-full max-w-md bg-white rounded-[2rem] p-5"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-row-reverse">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Clock size={18} className="text-amber-500" />{' '}
                {isArabic ? 'بيع بالتقسيط' : 'Layaway'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50">
                <div className="flex justify-between text-xs font-black">
                  <span className="text-slate-500">
                    {isArabic ? 'إجمالي الطلب' : 'Order total'}
                  </span>
                  <span className="text-[#BD00FF]">ج.م {total.toFixed(2)}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-500">
                  {isArabic ? 'العربون (مقدم)' : 'Deposit'}
                </label>
                <input
                  type="number"
                  value={deposit || ''}
                  onChange={(e) => onDepositChange(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center mt-1"
                  min={0}
                  max={total}
                />
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div className="flex justify-between text-xs font-black text-amber-700">
                  <span>{isArabic ? 'المتبقي' : 'Remaining'}</span>
                  <span>ج.م {Math.max(0, total - deposit).toFixed(2)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onCreate}
                disabled={cartLength === 0 || total <= 0}
                className="w-full py-3 rounded-2xl bg-amber-500 text-white font-black text-sm disabled:opacity-50"
              >
                {isArabic ? 'إنشاء عقد التقسيط' : 'Create layaway'}
              </button>
              {layaways.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-black text-slate-400">
                    {isArabic ? 'العقود النشطة' : 'Active plans'} (
                    {layaways.filter((l) => l.status === 'active').length})
                  </div>
                  {layaways
                    .filter((l) => l.status === 'active')
                    .slice(0, 5)
                    .map((l) => (
                      <div
                        key={l.id}
                        className="flex justify-between text-[10px] font-bold p-2 rounded-lg bg-slate-50"
                      >
                        <span>{l.id.slice(0, 12)}</span>
                        <span className="text-amber-600">
                          ج.م {l.paid}/{l.total}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
