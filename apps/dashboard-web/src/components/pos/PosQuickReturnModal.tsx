'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X, Minus, Plus, Loader2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

type Props = {
  order: any | null;
  onClose: () => void;
  qtys: Record<string, number>;
  onQtysChange: Dispatch<SetStateAction<Record<string, number>>>;
  toStock: boolean;
  onToStockChange: (v: boolean) => void;
  reason: string;
  onReasonChange: (v: string) => void;
  total: number;
  submitting: boolean;
  onSubmit: () => void;
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosQuickReturnModal({
  order,
  onClose,
  qtys,
  onQtysChange,
  toStock,
  onToStockChange,
  reason,
  onReasonChange,
  total,
  submitting,
  onSubmit,
  isArabic,
}: Props) {
  return (
    <AnimatePresence>
      {order && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[960] bg-black/40 flex items-center justify-center p-4"
          onClick={() => !submitting && onClose()}
        >
          <MotionDiv
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            className="w-full max-w-md bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1 flex-row-reverse">
              <h3 className="text-base font-black flex items-center gap-2">
                <RotateCcw size={16} className="text-red-500" />{' '}
                {isArabic ? 'مرتجع سريع' : 'Quick Return'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mb-3">
              {isArabic
                ? `فاتورة #${String(order.id || '').slice(0, 8)} — حدّد الكمية المرتجعة من كل صنف`
                : `Invoice #${String(order.id || '').slice(0, 8)}`}
            </p>
            <div className="space-y-2 mb-3">
              {(Array.isArray(order.items) ? order.items : []).map((it: any) => {
                const qty = qtys[String(it.id)] || 0;
                const orig = Number(it.quantity) || 0;
                return (
                  <div
                    key={it.id}
                    className={`border rounded-xl p-2.5 flex items-center justify-between gap-2 ${qty > 0 ? 'border-red-200 bg-red-50/40' : 'border-slate-100'}`}
                  >
                    <div className="min-w-0 text-right">
                      <div className="text-xs font-black text-slate-900 truncate">
                        {it.productName || it.productId}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">
                        ج.م {Number(it.price || 0).toFixed(2)} × {orig}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onQtysChange((prev) => ({
                            ...prev,
                            [String(it.id)]: Math.max(0, (prev[String(it.id)] || 0) - 1),
                          }))
                        }
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:border-red-400 hover:text-red-500"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-black text-sm">{qty}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onQtysChange((prev) => ({
                            ...prev,
                            [String(it.id)]: Math.min(orig, (prev[String(it.id)] || 0) + 1),
                          }))
                        }
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:border-red-400 hover:text-red-500"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <label className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 mb-2 cursor-pointer">
              <span className="text-xs font-black text-slate-600">
                {isArabic ? 'إرجاع الأصناف للمخزون' : 'Return items to stock'}
              </span>
              <input
                type="checkbox"
                checked={toStock}
                onChange={(e) => onToStockChange(e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder={isArabic ? 'السبب (اختياري)' : 'Reason (optional)'}
              className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-xs font-bold mb-3"
            />
            <div className="flex items-center justify-between bg-red-50 rounded-xl px-3 py-2.5 mb-3">
              <span className="text-xs font-black text-red-600">
                {isArabic ? 'إجمالي المرتجع' : 'Return total'}
              </span>
              <span className="text-sm font-black text-red-600">ج.م {total.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={onSubmit}
              disabled={total <= 0 || submitting}
              className="w-full py-3 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {isArabic ? 'تأكيد المرتجع' : 'Confirm Return'}
            </button>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
