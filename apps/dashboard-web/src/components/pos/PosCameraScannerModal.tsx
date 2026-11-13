'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X } from 'lucide-react';
import type { RefObject } from 'react';

type Props = {
  show: boolean;
  onClose: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  error: string;
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosCameraScannerModal({ show, onClose, videoRef, error, isArabic }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[950] bg-black/80 flex items-center justify-center p-4"
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
                <Camera size={18} /> {isArabic ? 'مسح الباركود' : 'Scan Barcode'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            {error ? (
              <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold text-center">
                {error}
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-3/4 h-1 bg-[#00E5FF] shadow-[0_0_12px_#00E5FF]" />
                </div>
              </div>
            )}
            <p className="text-center text-xs text-slate-400 font-bold mt-3">
              {isArabic ? 'وجّه الكاميرا نحو الباركود' : 'Point the camera at the barcode'}
            </p>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
