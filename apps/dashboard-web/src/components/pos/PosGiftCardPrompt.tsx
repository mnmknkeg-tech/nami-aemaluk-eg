'use client';

import { Gift, X } from 'lucide-react';

type Props = {
  code: string;
  applied: boolean;
  error: string;
  isArabic: boolean;
  onApply: () => void;
  onDismiss: () => void;
};

/** Inline toast-prompt shown when a gift-card code is entered but not yet applied. */
export default function PosGiftCardPrompt({
  code,
  applied,
  error,
  isArabic,
  onApply,
  onDismiss,
}: Props) {
  if (!code || applied) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[900] bg-white border border-slate-200 rounded-2xl shadow-xl p-3 flex items-center gap-2">
      <Gift size={16} className="text-emerald-500" />
      <span className="text-xs font-black text-slate-700">{code}</span>
      <button
        type="button"
        onClick={onApply}
        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black"
      >
        {isArabic ? 'تطبيق' : 'Apply'}
      </button>
      <button type="button" onClick={onDismiss} className="text-slate-400">
        <X size={14} />
      </button>
      {error && <span className="text-[10px] text-red-500 font-bold">{error}</span>}
    </div>
  );
}
