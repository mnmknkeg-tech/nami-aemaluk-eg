'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Eraser } from 'lucide-react';
import type { RefObject } from 'react';

type Props = {
  show: boolean;
  onClose: () => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onClear: () => void;
  onSave: () => void;
  hasSignature: boolean;
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosSignatureModal({
  show,
  onClose,
  canvasRef,
  onClear,
  onSave,
  hasSignature,
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
                <Users size={18} /> {isArabic ? 'توقيع العميل' : 'Customer Signature'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              className="w-full bg-white border-2 border-slate-200 rounded-2xl touch-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              <button
                type="button"
                onClick={onClear}
                className="py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center gap-1.5"
              >
                <Eraser size={14} /> {isArabic ? 'مسح' : 'Clear'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-xs"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={onSave}
                className="py-2 rounded-xl bg-slate-900 text-white font-black text-xs"
              >
                {isArabic ? 'حفظ' : 'Save'}
              </button>
            </div>
            {hasSignature && (
              <p className="text-[10px] text-emerald-600 font-black mt-2 text-center">
                ✓ {isArabic ? 'يوجد توقيع محفوظ' : 'Signature on file'}
              </p>
            )}
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
