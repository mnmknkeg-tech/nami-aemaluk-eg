'use client';

import { UtensilsCrossed, ArrowRight, X, Loader2, Save } from 'lucide-react';

interface PageHeaderProps {
  editId: string;
  saving: boolean;
  loadingProduct: boolean;
  onSave: () => void;
  onBack: () => void;
  onCancel: () => void;
}

export default function PageHeader({
  editId,
  saving,
  loadingProduct,
  onSave,
  onBack,
  onCancel,
}: PageHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
        <UtensilsCrossed size={26} />
      </div>
      <div className="text-right flex-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          {editId ? 'تعديل منتج أكل ومشروبات' : 'إضافة أكل ومشروبات'}
        </h1>
        <p className="text-sm font-bold text-slate-400 mt-1">
          منتجات غذائية ومشروبات جاهزة للطلب السريع — مع خيارات الأحجام، الإضافات، ونموذج الطلب
        </p>
      </div>
      <button
        onClick={onBack}
        className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shrink-0"
        title="رجوع إلى المنتجات"
      >
        <ArrowRight size={18} />
      </button>
      <button
        onClick={onCancel}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
      >
        <X size={18} />
        <span>إلغاء</span>
      </button>
      <button
        onClick={onSave}
        disabled={saving || loadingProduct}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all disabled:opacity-50"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        <span>{editId ? 'حفظ التعديلات' : 'حفظ'}</span>
      </button>
    </div>
  );
}
