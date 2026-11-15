'use client';

interface QuickCategoryModalProps {
  value: string;
  onValueChange: (v: string) => void;
  onClose: () => void;
  onAdd: () => void;
}

export default function QuickCategoryModal({
  value,
  onValueChange,
  onClose,
  onAdd,
}: QuickCategoryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-xl">
        <h3 className="text-sm font-black text-slate-900">إضافة تصنيف جديد سريع</h3>
        <input
          type="text"
          placeholder="اسم التصنيف..."
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          autoFocus
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
          >
            إضافة
          </button>
        </div>
      </div>
    </div>
  );
}
