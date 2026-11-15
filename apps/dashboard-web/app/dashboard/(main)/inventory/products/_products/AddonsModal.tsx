'use client';

import { X, Package } from 'lucide-react';

type Props = {
  onClose: () => void;
};

export default function AddonsModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 flex-row-reverse">
          <h2 className="text-xl font-black text-slate-900">إدارة الإضافات</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="text-center py-12">
          <Package size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 font-bold">إدارة الإضافات قيد التطوير</p>
          <p className="text-slate-400 text-sm mt-2">
            ستتمكن قريباً من إضافة وإدارة الإضافات للمنتجات
          </p>
        </div>
      </div>
    </div>
  );
}
