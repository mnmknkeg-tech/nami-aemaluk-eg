'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart, X } from 'lucide-react';
import PosCartPanel from '@/components/pos/PosCartPanel';

export interface PosMobileCartSheetProps {
  cartPanelProps: React.ComponentProps<typeof PosCartPanel>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isArabic: boolean;
  total: number;
  itemsCount: number;
}

const MotionDiv = motion.div as any;

const PosMobileCartSheet: React.FC<PosMobileCartSheetProps> = ({
  cartPanelProps,
  open,
  onOpenChange,
  isArabic,
  total,
  itemsCount,
}) => {
  return (
    <>
      {/* Mobile cart bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[120] md:hidden pointer-events-none">
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="pointer-events-auto w-full px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
        >
          <div className="mx-auto max-w-[1400px] rounded-[1.6rem] bg-slate-900 text-white shadow-2xl flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 w-10 h-10 rounded-2xl flex items-center justify-center">
                <ShoppingCart size={18} />
              </div>
              <div className="text-right">
                <div className="font-black text-sm">{isArabic ? 'السلة' : 'Cart'}</div>
                <div className="text-xs text-white/70 font-bold">
                  {itemsCount} {isArabic ? 'قطعة' : 'items'}
                </div>
              </div>
            </div>
            <div className="text-left">
              <div className="text-xs text-white/70 font-bold">
                {isArabic ? 'الإجمالي' : 'Total'}
              </div>
              <div className="font-black">ج.م {total.toFixed(2)}</div>
            </div>
          </div>
        </button>
      </div>

      {/* Mobile cart sheet */}
      <AnimatePresence>
        {open && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] md:hidden bg-black/40"
            onClick={() => onOpenChange(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <MotionDiv
            key="pos-cart-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-[140] md:hidden bg-white rounded-t-[2rem] shadow-2xl flex flex-col h-[92vh]"
          >
            <div className="w-full flex justify-center pt-3 pb-2">
              <div className="w-14 h-1.5 rounded-full bg-slate-200" />
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-3 left-3 p-2 rounded-xl hover:bg-slate-100 z-10"
            >
              <X size={20} className="text-slate-400" />
            </button>
            <PosCartPanel {...cartPanelProps} />
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  );
};

export default PosMobileCartSheet;
