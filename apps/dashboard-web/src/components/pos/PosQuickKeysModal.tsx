'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Star, X } from 'lucide-react';

type Props = {
  show: boolean;
  onClose: () => void;
  filteredProducts: any[];
  quickKeyIds: string[];
  onToggle: (id: string) => void;
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosQuickKeysModal({
  show,
  onClose,
  filteredProducts,
  quickKeyIds,
  onToggle,
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
            className="w-full max-w-md bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-row-reverse">
              <h3 className="text-base font-black flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />{' '}
                {isArabic ? 'إضافة أزرار سريعة' : 'Add Quick Keys'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-400 font-bold mb-3">
              {isArabic
                ? 'اضغط على المنتجات لإضافتها للأزرار السريعة'
                : 'Tap products to add them as quick keys'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {filteredProducts.slice(0, 20).map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onToggle(p.id)}
                  className={`p-2.5 rounded-xl text-xs font-black text-right transition-all ${quickKeyIds.includes(p.id) ? 'bg-amber-100 border-2 border-amber-300 text-amber-700' : 'bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100'}`}
                >
                  <div className="flex items-center gap-1.5">
                    {quickKeyIds.includes(p.id) && (
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                    )}
                    <span className="truncate">{p.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
