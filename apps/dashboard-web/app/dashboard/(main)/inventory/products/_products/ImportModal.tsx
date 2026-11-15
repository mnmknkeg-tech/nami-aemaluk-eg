'use client';

import { Upload, Download, Loader2, CheckCircle2, X } from 'lucide-react';
import {
  downloadProductTemplate,
  type ProductImportPreview as ImportPreview,
  type ImportProgress,
} from '@/lib/importer';

type Props = {
  preview: ImportPreview;
  progress: ImportProgress | null;
  running: boolean;
  fileName: string;
  onClose: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
};

export default function ImportModal({
  preview,
  progress,
  running,
  fileName,
  onClose,
  onConfirm,
  onDismiss,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 flex-row-reverse">
          <h2 className="text-xl font-black text-slate-900">استيراد المنتجات</h2>
          <button
            onClick={onClose}
            disabled={running}
            className="p-2 hover:bg-slate-50 rounded-lg disabled:opacity-40"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* المرحلة 1: معاينة الملف */}
        {!progress && (
          <>
            <div className="mb-4 text-xs text-slate-500 font-semibold">
              الملف: <span className="text-slate-900">{fileName}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-xl border border-slate-200 p-3 text-center">
                <div className="text-lg font-black text-slate-900">{preview.totalRows}</div>
                <div className="text-[10px] font-bold text-slate-400">صفوف في الملف</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                <div className="text-lg font-black text-emerald-700">{preview.valid.length}</div>
                <div className="text-[10px] font-bold text-emerald-600">جاهزة للاستيراد</div>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                <div className="text-lg font-black text-red-600">{preview.invalid.length}</div>
                <div className="text-[10px] font-bold text-red-500">صفوف غير صالحة</div>
              </div>
            </div>

            {/* مطابقة الأعمدة */}
            <div className="mb-4">
              <div className="text-[11px] font-bold text-slate-500 mb-1.5">مطابقة الأعمدة:</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(preview.columnMap).map(([field, col]) => (
                  <span
                    key={field}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      col
                        ? 'bg-slate-100 text-slate-700'
                        : field === 'name' || field === 'price'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {field}: {col || 'غير موجود'}
                  </span>
                ))}
              </div>
            </div>

            {/* أخطاء الصفوف */}
            {preview.invalid.length > 0 && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <div className="text-[11px] font-bold text-red-600 mb-1.5">
                  صفوف سيتم تجاهلها ({preview.invalid.length}):
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {preview.invalid.slice(0, 8).map((r) => (
                    <div key={r.rowNumber} className="text-[10px] text-red-500 font-semibold">
                      صف {r.rowNumber}
                      {r.name ? ` — ${r.name}` : ''}: {r.reason}
                    </div>
                  ))}
                  {preview.invalid.length > 8 && (
                    <div className="text-[10px] text-red-400 font-bold">
                      و{preview.invalid.length - 8} أخطاء أخرى…
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 justify-start">
              <button
                onClick={onConfirm}
                disabled={preview.valid.length === 0}
                className="h-11 px-6 rounded-full bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-700 disabled:opacity-40 flex items-center gap-2"
              >
                <Upload size={15} />
                استيراد {preview.valid.length} منتج
              </button>
              <button
                onClick={() => downloadProductTemplate()}
                className="h-11 px-5 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Download size={14} />
                تنزيل القالب
              </button>
            </div>
          </>
        )}

        {/* المرحلة 2: شريط التقدم */}
        {progress && running && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Loader2 size={16} className="animate-spin text-slate-700" />
              <span className="text-sm font-bold text-slate-900">
                جاري الاستيراد… {progress.sent} من {preview.valid.length} منتج
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-l from-teal-400 to-cyan-500 transition-all duration-300"
                style={{
                  width: `${Math.round((progress.sent / Math.max(1, preview.valid.length)) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-2 text-[11px] font-semibold text-slate-400">
              دفعة {progress.doneChunks} من {progress.totalChunks} — جديد: {progress.createdCount} /
              محدّث: {progress.updatedCount}
            </div>
          </div>
        )}

        {/* المرحلة 3: النتيجة */}
        {progress && !running && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={20} className="text-emerald-600" />
              <span className="text-base font-black text-slate-900">انتهى الاستيراد</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                <div className="text-lg font-black text-emerald-700">{progress.createdCount}</div>
                <div className="text-[10px] font-bold text-emerald-600">منتج جديد</div>
              </div>
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-center">
                <div className="text-lg font-black text-cyan-700">{progress.updatedCount}</div>
                <div className="text-[10px] font-bold text-cyan-600">تم تحديثه</div>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                <div className="text-lg font-black text-red-600">{progress.failedCount}</div>
                <div className="text-[10px] font-bold text-red-500">فشل</div>
              </div>
            </div>
            {progress.errors.length > 0 && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 max-h-40 overflow-y-auto">
                {progress.errors.slice(0, 10).map((e, i) => (
                  <div key={i} className="text-[10px] text-red-500 font-semibold">
                    صف {e.row}
                    {e.name ? ` — ${e.name}` : ''}: {e.reason}
                  </div>
                ))}
                {progress.errors.length > 10 && (
                  <div className="text-[10px] text-red-400 font-bold">
                    و{progress.errors.length - 10} أخطاء أخرى…
                  </div>
                )}
              </div>
            )}
            <button
              onClick={onDismiss}
              className="h-11 px-6 rounded-full bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-700"
            >
              تم
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
