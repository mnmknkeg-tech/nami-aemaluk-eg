'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Tag, X } from 'lucide-react';

type Props = {
  /** The line id being overridden, or null when closed. */
  overrideId: string | null;
  onClose: () => void;
  value: string;
  onValueChange: (v: string) => void;
  onApply: () => void;
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosPriceOverrideModal({
  overrideId,
  onClose,
  value,
  onValueChange,
  onApply,
  isArabic,
}: Props) {
  return (
    <AnimatePresence>
      {overrideId && (
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
                <Tag size={16} className="text-[#BD00FF]" />{' '}
                {isArabic ? 'تعديل السعر' : 'Price Override'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <input
              type="number"
              autoFocus
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onApply();
              }}
              className="w-full bg-white border rounded-2xl py-3 px-4 outline-none text-center text-lg font-black focus:ring-2 focus:ring-[#BD00FF]"
              min={0}
              step="0.01"
            />
            <button
              type="button"
              onClick={onApply}
              className="w-full mt-3 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-black"
            >
              {isArabic ? 'تطبيق' : 'Apply'}
            </button>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
