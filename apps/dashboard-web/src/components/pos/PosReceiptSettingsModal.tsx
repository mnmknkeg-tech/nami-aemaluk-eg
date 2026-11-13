'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { ReceiptTheme } from '@/lib/pos-utils';

type Props = {
  show: boolean;
  onClose: () => void;
  theme: ReceiptTheme;
  onThemeChange: Dispatch<SetStateAction<ReceiptTheme>>;
  onVatRateChange: (v: number) => void;
  onSave: () => void;
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosReceiptSettingsModal({
  show,
  onClose,
  theme,
  onThemeChange,
  onVatRateChange,
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
            className="w-full max-w-md bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-row-reverse">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Settings2 size={18} /> {isArabic ? 'إعدادات الفاتورة' : 'Receipt Settings'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-500">
                  {isArabic ? 'شعار (URL)' : 'Logo URL'}
                </label>
                <input
                  type="text"
                  value={theme.logoUrl || ''}
                  onChange={(e) => onThemeChange((t) => ({ ...t, logoUrl: e.target.value }))}
                  className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500">
                  {isArabic ? 'رسالة علوية' : 'Header message'}
                </label>
                <input
                  type="text"
                  value={theme.headerMessage || ''}
                  onChange={(e) => onThemeChange((t) => ({ ...t, headerMessage: e.target.value }))}
                  className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500">
                  {isArabic ? 'رسالة سفلية' : 'Footer message'}
                </label>
                <input
                  type="text"
                  value={theme.footerMessage || ''}
                  onChange={(e) => onThemeChange((t) => ({ ...t, footerMessage: e.target.value }))}
                  className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-500">
                    {isArabic ? 'نسبة الضريبة %' : 'VAT %'}
                  </label>
                  <input
                    type="number"
                    value={theme.vatRatePercent || 0}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      onThemeChange((t) => ({ ...t, vatRatePercent: v }));
                      onVatRateChange(v);
                    }}
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500">
                    {isArabic ? 'العملة' : 'Currency'}
                  </label>
                  <input
                    type="text"
                    value={theme.currency || 'ج.م'}
                    onChange={(e) => onThemeChange((t) => ({ ...t, currency: e.target.value }))}
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={theme.showCashier !== false}
                    onChange={(e) =>
                      onThemeChange((t) => ({ ...t, showCashier: e.target.checked }))
                    }
                    className="w-4 h-4"
                  />
                  {isArabic ? 'إظهار الكاشير' : 'Show cashier'}
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={theme.showQrCode || false}
                    onChange={(e) => onThemeChange((t) => ({ ...t, showQrCode: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  {isArabic ? 'QR Code' : 'QR Code'}
                </label>
              </div>
              <div>
                <label className="text-xs font-black text-slate-500">
                  {isArabic ? 'عرض الورق' : 'Paper width'}
                </label>
                <select
                  value={theme.paperWidth || '80mm'}
                  onChange={(e) =>
                    onThemeChange((t) => ({ ...t, paperWidth: e.target.value as any }))
                  }
                  className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                >
                  <option value="58mm">58mm</option>
                  <option value="80mm">80mm</option>
                </select>
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
