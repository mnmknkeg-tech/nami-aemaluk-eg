'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { PriceLevel } from '@/lib/pos-utils';

type Props = {
  show: boolean;
  onClose: () => void;
  current: PriceLevel;
  onSelect: (lvl: PriceLevel) => void;
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosPriceLevelPopover({
  show,
  onClose,
  current,
  onSelect,
  isArabic,
}: Props) {
  return (
    <AnimatePresence>
      {show && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[940]"
          onClick={onClose}
        >
          <div className="absolute bottom-24 right-4 md:right-[460px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 w-48">
            {(['retail', 'wholesale', 'employee'] as PriceLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => onSelect(lvl)}
                className={`w-full text-right px-3 py-2.5 rounded-xl text-xs font-black transition-all ${current === lvl ? 'bg-[#BD00FF]/10 text-[#BD00FF]' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {lvl === 'retail'
                  ? isArabic
                    ? 'سعر التجزئة'
                    : 'Retail'
                  : lvl === 'wholesale'
                    ? isArabic
                      ? 'سعر الجملة (-15%)'
                      : 'Wholesale (-15%)'
                    : isArabic
                      ? 'سعر الموظفين (-10%)'
                      : 'Employee (-10%)'}
              </button>
            ))}
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
