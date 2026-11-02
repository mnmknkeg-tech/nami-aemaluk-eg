'use client';

/**
 * زر تصدير بقائمة صيغ (Excel / CSV / JSON) — يستخدمه كل صفحات اللوحة.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileJson, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { exportData, EXPORT_FORMAT_LABELS, fileStamp, type ExportFormat } from '@/lib/export';

export interface ExportMenuProps {
  /** اسم الملف بدون امتداد (يُلحق به طابع زمني) */
  filename: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  sheetName?: string;
  disabled?: boolean;
  /** الصيغ المتاحة — الافتراضي الثلاثة كلها */
  formats?: ExportFormat[];
  /** طابع زمني في اسم الملف (افتراضي: نعم) */
  timestamp?: boolean;
  label?: string;
  /** بديل عن headers/rows: يجلب البيانات كاملة لحظة التصدير (كل الصفحات) */
  loadData?: () => Promise<{
    headers: string[];
    rows: (string | number | boolean | null | undefined)[][];
    sheetName?: string;
  }>;
}

const FORMAT_ICONS: Record<
  ExportFormat,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  xlsx: FileSpreadsheet,
  csv: FileText,
  json: FileJson,
};

export default function ExportMenu({
  filename,
  headers,
  rows,
  sheetName,
  disabled,
  formats = ['xlsx', 'csv', 'json'],
  timestamp = true,
  label = 'تصدير',
  loadData,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    try {
      let data: {
        headers: string[];
        rows: (string | number | boolean | null | undefined)[][];
        sheetName?: string;
      } = { headers, rows, sheetName };
      if (loadData) {
        data = await loadData();
      }
      const name = timestamp ? `${filename}-${fileStamp()}` : filename;
      exportData(
        { filename: name, headers: data.headers, rows: data.rows, sheetName: data.sheetName },
        format
      );
    } catch (err) {
      console.error('export failed', err);
    } finally {
      setExporting(null);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
      >
        {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-11 left-0 z-40 w-52 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5">
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400">
            {loadData ? 'اختر صيغة الملف' : `${rows.length} صف — اختر الصيغة`}
          </div>
          {formats.map((format) => {
            const Icon = FORMAT_ICONS[format];
            return (
              <button
                key={format}
                type="button"
                onClick={() => handleExport(format)}
                disabled={exporting !== null}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-right text-[12px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Icon size={14} />
                </span>
                <span className="flex-1">{EXPORT_FORMAT_LABELS[format]}</span>
                {format === 'xlsx' && (
                  <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-md">
                    موصى به
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
