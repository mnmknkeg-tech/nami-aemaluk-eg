'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

type Props = {
  delta: number;
  onDeltaChange: (n: number) => void;
  reason: string;
  onReasonChange: (v: string) => void;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function LoyaltyAdjustModal({
  delta,
  onDeltaChange,
  reason,
  onReasonChange,
  saving,
  onConfirm,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-slate-900">تعديل نقاط الولاء للعميل</h3>
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">
            النقاط (موجب للإضافة، سالب للخصم)
          </label>
          <input
            type="number"
            value={delta}
            onChange={(e) => onDeltaChange(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">السبب</label>
          <input
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="مثلاً: هدية تسجيل أو تعويض"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving || !delta || !reason.trim()}
            className="px-4 py-2 rounded-xl bg-[#492770] text-white text-xs font-bold hover:bg-[#3d1f5e] flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            تأكيد التعديل
          </button>
        </div>
      </div>
    </div>
  );
}
