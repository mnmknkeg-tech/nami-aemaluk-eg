'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, X } from 'lucide-react';
import type { DrawerDeclaration } from '@/lib/pos-utils';

type Props = {
  show: boolean;
  onClose: () => void;
  expectedCash: number;
  declaredCash: number;
  onDeclaredCashChange: (v: number) => void;
  note: string;
  onNoteChange: (v: string) => void;
  onSubmit: () => void;
  declarations: DrawerDeclaration[];
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosDrawerDeclarationModal({
  show,
  onClose,
  expectedCash,
  declaredCash,
  onDeclaredCashChange,
  note,
  onNoteChange,
  onSubmit,
  declarations,
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
                <Calculator size={16} /> {isArabic ? 'جرد الصندوق' : 'Drawer Declaration'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 mb-3">
              <div className="flex justify-between text-xs font-black">
                <span className="text-amber-600">{isArabic ? 'المتوقع' : 'Expected'}</span>
                <span className="text-amber-700">ج.م {expectedCash.toFixed(2)}</span>
              </div>
            </div>
            <input
              type="number"
              value={declaredCash || ''}
              onChange={(e) => onDeclaredCashChange(Number(e.target.value) || 0)}
              placeholder={isArabic ? 'العدد الفعلي للصندوق' : 'Declared cash'}
              className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center mb-2"
              min={0}
            />
            <input
              type="text"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={isArabic ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
              className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-bold mb-3"
            />
            {declaredCash > 0 && (
              <div
                className={`p-2 rounded-xl text-center text-xs font-black mb-3 ${Math.abs(declaredCash - expectedCash) < 0.01 ? 'bg-emerald-50 text-emerald-600' : declaredCash > expectedCash ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}
              >
                {isArabic ? 'الفرق' : 'Difference'}: ج.م {(declaredCash - expectedCash).toFixed(2)}
              </div>
            )}
            <button
              type="button"
              onClick={onSubmit}
              disabled={declaredCash <= 0}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-sm disabled:opacity-50"
            >
              {isArabic ? 'تأكيد الجرد' : 'Confirm Declaration'}
            </button>
            {declarations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 max-h-24 overflow-y-auto">
                {declarations.slice(0, 3).map((d) => (
                  <div key={d.id} className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-500">
                      {new Date(d.ts).toLocaleDateString('ar-EG')}
                    </span>
                    <span
                      className={
                        Math.abs(d.difference) < 0.01 ? 'text-emerald-600' : 'text-red-500'
                      }
                    >
                      ± ج.م {d.difference.toFixed(2)}
                    </span>
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
