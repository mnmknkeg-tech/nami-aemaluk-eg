'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { LoyaltyConfig } from '@/lib/pos-utils';

type Props = {
  show: boolean;
  onClose: () => void;
  cfg: LoyaltyConfig;
  onCfgChange: Dispatch<SetStateAction<LoyaltyConfig>>;
  onSave: () => void;
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosLoyaltySettingsModal({
  show,
  onClose,
  cfg,
  onCfgChange,
  onSave,
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
                <Crown size={18} className="text-amber-500" />{' '}
                {isArabic ? 'نقاط الولاء' : 'Loyalty Points'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-black text-slate-600">
                  {isArabic ? 'تفعيل' : 'Enable'}
                </span>
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={(e) => onCfgChange((c) => ({ ...c, enabled: e.target.checked }))}
                  className="w-5 h-5"
                />
              </label>
              <div>
                <label className="text-xs font-black text-slate-500">
                  {isArabic ? 'نقاط لكل ج.م' : 'Points per EGP'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cfg.pointsPerEgp}
                  onChange={(e) =>
                    onCfgChange((c) => ({ ...c, pointsPerEgp: Number(e.target.value) || 0 }))
                  }
                  className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500">
                  {isArabic ? 'قيمة النقطة (ج.م)' : 'Redeem rate (EGP/pt)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cfg.redeemRate}
                  onChange={(e) =>
                    onCfgChange((c) => ({ ...c, redeemRate: Number(e.target.value) || 0 }))
                  }
                  className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                />
              </div>
              <button
                type="button"
                onClick={onSave}
                className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-sm"
              >
                {isArabic ? 'حفظ' : 'Save'}
              </button>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
