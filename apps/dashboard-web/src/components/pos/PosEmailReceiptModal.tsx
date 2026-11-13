'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X, Send } from 'lucide-react';

type Props = {
  show: boolean;
  onClose: () => void;
  email: string;
  onEmailChange: (v: string) => void;
  onSend: () => void;
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosEmailReceiptModal({
  show,
  onClose,
  email,
  onEmailChange,
  onSend,
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
                <Mail size={16} /> {isArabic ? 'إرسال الفاتورة' : 'Email Receipt'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="customer@email.com"
              className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-bold focus:ring-2 focus:ring-[#BD00FF]"
            />
            <button
              type="button"
              onClick={onSend}
              disabled={!email.trim()}
              className="w-full mt-3 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send size={14} /> {isArabic ? 'إرسال' : 'Send'}
            </button>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
