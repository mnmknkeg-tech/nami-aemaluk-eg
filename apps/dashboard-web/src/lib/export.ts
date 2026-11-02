/**
 * محرك تصدير موحد لكل صفحات اللوحة — يدعم Excel (xlsx) و CSV و JSON.
 * CSV يُكتب دائماً بـ UTF-8 BOM مع escaping صحيح حتى تفتح العربية في Excel.
 */
import * as XLSX from 'xlsx';

export type ExportFormat = 'xlsx' | 'csv' | 'json';

export type ExportCell = string | number | boolean | null | undefined;

export interface ExportPayload {
  /** اسم الملف بدون الامتداد */
  filename: string;
  /** ترويسة الأعمدة */
  headers: string[];
  /** صفوف البيانات بنفس ترتيب الترويسة */
  rows: ExportCell[][];
  /** اسم ورقة Excel */
  sheetName?: string;
}

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  xlsx: 'Excel (.xlsx)',
  csv: 'CSV (.csv)',
  json: 'JSON (.json)',
};

/** ينزّل Blob كملف على جهاز المستخدم */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** يحصّن خلايا النص ضد حقن صيغ Excel (CSV Injection) */
function sanitizeCell(value: ExportCell): ExportCell {
  if (typeof value !== 'string') return value;
  const s = value.trim();
  if (/^[=+@\t\r]/.test(s)) {
    return `'${value}`;
  }
  return value;
}

function csvEscape(value: ExportCell): string {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: ExportCell[][]): string {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((r) => r.map((c) => csvEscape(sanitizeCell(c))).join(',')),
  ];
  return '\ufeff' + lines.join('\r\n');
}

function autoColumnWidths(headers: string[], rows: ExportCell[][]): { wch: number }[] {
  return headers.map((h, i) => {
    let max = String(h ?? '').length;
    for (const row of rows) {
      const len = String(row[i] ?? '').length;
      if (len > max) max = len;
      if (max > 50) break;
    }
    return { wch: Math.min(Math.max(max + 2, 8), 50) };
  });
}

/** يبني Blob جاهز للتنزيل بالصيغة المطلوبة */
export function buildExportBlob(payload: ExportPayload, format: ExportFormat): Blob {
  const { headers, rows, sheetName } = payload;

  if (format === 'json') {
    const objects = rows.map((r) => {
      const obj: Record<string, ExportCell> = {};
      headers.forEach((h, i) => {
        obj[h] = r[i] ?? null;
      });
      return obj;
    });
    return new Blob(
      [
        JSON.stringify(
          { exportedAt: new Date().toISOString(), count: objects.length, data: objects },
          null,
          2
        ),
      ],
      {
        type: 'application/json;charset=utf-8;',
      }
    );
  }

  if (format === 'xlsx') {
    const aoa = [headers, ...rows.map((r) => r.map(sanitizeCell))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = autoColumnWidths(headers, rows);
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    const safeSheet =
      (sheetName || 'البيانات').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1';
    XLSX.utils.book_append_sheet(wb, ws, safeSheet);
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  return new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' });
}

/** يصدّر البيانات وينزّلها فوراً بالصيغة المطلوبة */
export function exportData(payload: ExportPayload, format: ExportFormat) {
  const base = payload.filename.replace(/\.(xlsx|csv|json)$/i, '').replace(/[\\/:*?"<>|]/g, '-');
  const blob = buildExportBlob(payload, format);
  downloadBlob(blob, `${base}.${format}`);
}

/** طابع زمني قصير لأسماء الملفات: 2026-09-20_1430 */
export function fileStamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
}
