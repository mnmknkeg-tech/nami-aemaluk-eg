'use client';

import { X } from 'lucide-react';

type Props = {
  newName: string;
  setNewName: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export default function QuickCategoryModal({ newName, setNewName, onConfirm, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between flex-row-reverse">
          <h3 className="text-lg font-black text-slate-900">إضافة تصنيف جديد</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">اسم التصنيف *</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="مثال: ملابس صيفية"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
          />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-all"
          >
            إضافة التصنيف
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
