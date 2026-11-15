'use client';

import { ArrowRight, Check } from 'lucide-react';

interface PageHeaderProps {
  editId: string;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
  onCancel: () => void;
}

export default function PageHeader({ editId, saving, onSave, onBack, onCancel }: PageHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 h-16 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
            title="رجوع لاختيار النوع"
          >
            <ArrowRight size={18} />
          </button>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
                {editId ? 'تعديل خدمة حجز ومواعيد' : 'إضافة حجز ومواعيد'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[11px] font-bold shrink-0">
                خدمة حجز
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              حدّد المواعيد، ونظّم الطاقة الاستيعابية والتقويم من مكان واحد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 sm:px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-4 sm:px-5 py-2 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>{editId ? 'حفظ التعديلات' : 'حفظ ونشر الحجز'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
