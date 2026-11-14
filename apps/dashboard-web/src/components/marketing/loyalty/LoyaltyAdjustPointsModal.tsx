'use client';

import React from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import type { CustomerItem } from './types';

export interface LoyaltyAdjustPointsModalProps {
  setAdjustModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCustomer: CustomerItem | null;
  adjustError: string;
  fmt: any;
  setAdjustType: React.Dispatch<React.SetStateAction<'add' | 'deduct'>>;
  adjustType: 'add' | 'deduct';
  adjustPoints: number;
  setAdjustPoints: React.Dispatch<React.SetStateAction<number>>;
  adjustReason: string;
  setAdjustReason: React.Dispatch<React.SetStateAction<string>>;
  adjustStaff: string;
  setAdjustStaff: React.Dispatch<React.SetStateAction<string>>;
  handleAdjustPoints: any;
  adjustSubmitting: boolean;
}

const LoyaltyAdjustPointsModal: React.FC<LoyaltyAdjustPointsModalProps> = ({
  setAdjustModalOpen,
  selectedCustomer,
  adjustError,
  fmt,
  setAdjustType,
  adjustType,
  adjustPoints,
  setAdjustPoints,
  adjustReason,
  setAdjustReason,
  adjustStaff,
  setAdjustStaff,
  handleAdjustPoints,
  adjustSubmitting,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in"
      onClick={() => setAdjustModalOpen(false)}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-sm text-slate-900">تعديل رصيد نقاط العميل</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedCustomer.name} ({selectedCustomer.phone})
            </p>
          </div>
          <button
            onClick={() => setAdjustModalOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {adjustError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{adjustError}</span>
          </div>
        )}

        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
          <span className="text-xs font-bold text-amber-800">الرصيد الحالي للعميل:</span>
          <span className="text-sm font-black text-amber-900">
            {fmt(selectedCustomer.loyaltyBalance)} نقطة
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نوع العملية</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustType('add')}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${adjustType === 'add' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                + إضافة نقاط مكافأة
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('deduct')}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${adjustType === 'deduct' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                - خصم نقاط (استبدال/تعديل)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">عدد النقاط</label>
            <input
              type="number"
              min="1"
              value={adjustPoints}
              onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">سبب التعديل</label>
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="مثال: تعويض عن تأخير طلب، مكافأة مسابقة..."
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم الموظف أو المسؤول
            </label>
            <input
              type="text"
              value={adjustStaff}
              onChange={(e) => setAdjustStaff(e.target.value)}
              placeholder="مدير المتجر"
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setAdjustModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleAdjustPoints}
            disabled={adjustSubmitting}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {adjustSubmitting && <Loader2 size={14} className="animate-spin" />}
            تأكيد وتسجيل الحركة في السجل
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyAdjustPointsModal;
