'use client';

import React from 'react';
import { Loader2, X, Plus } from 'lucide-react';

export interface SalesCreateOrderModalProps {
  creating: boolean;
  setShowCreateModal: React.Dispatch<React.SetStateAction<boolean>>;
  createFormData: any;
  setCreateFormData: React.Dispatch<React.SetStateAction<any>>;
  createOrder: any;
}

const SalesCreateOrderModal: React.FC<SalesCreateOrderModalProps> = ({
  creating,
  setShowCreateModal,
  createFormData,
  setCreateFormData,
  createOrder,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !creating && setShowCreateModal(false)}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 flex-row-reverse">
          <h2 className="text-xl font-black text-slate-900">طلب جديد</h2>
          <button
            onClick={() => !creating && setShowCreateModal(false)}
            className="p-2 hover:bg-slate-50 rounded-lg"
            disabled={creating}
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">اسم العميل</label>
            <input
              type="text"
              value={createFormData.customerName}
              onChange={(e) =>
                setCreateFormData({ ...createFormData, customerName: e.target.value })
              }
              placeholder="اسم العميل"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:ring-0"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">رقم الهاتف</label>
            <input
              type="tel"
              value={createFormData.customerPhone}
              onChange={(e) =>
                setCreateFormData({ ...createFormData, customerPhone: e.target.value })
              }
              placeholder="01xxxxxxxxx"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:ring-0"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">عنوان التوصيل</label>
            <input
              type="text"
              value={createFormData.customerAddress}
              onChange={(e) =>
                setCreateFormData({ ...createFormData, customerAddress: e.target.value })
              }
              placeholder="عنوان التوصيل (اختياري)"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:ring-0"
            />
          </div>
          <button
            onClick={createOrder}
            disabled={creating}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {creating ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesCreateOrderModal;
