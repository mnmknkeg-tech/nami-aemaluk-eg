/**
 * أدوات الاستيراد الحقيقي للوححة: قراءة ملفات Excel/CSV عبر SheetJS،
 * مطابقة أعمدة عربية/إنجليزية، تحقق صف-بصف، ورفع مجزّأ للباك-إند.
 */
import * as XLSX from 'xlsx';

export interface ParsedTable {
  headers: string[];
  /** صفوف خام (قيم نصية/رقمية) مرتبة حسب الترويسة */
  rows: unknown[][];
}

/** يقرأ ملف xlsx/xls/csv ويرجّع الترويسة والصفوف */
export async function parseSpreadsheetFile(file: File): Promise<ParsedTable> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', codepage: 65001 });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error('الملف فارغ أو غير صالح');
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: true });
  if (aoa.length < 2)
    throw new Error('الملف لا يحتوي على صفوف بيانات (ترويسة + صف واحد على الأقل)');
  const headers = (aoa[0] as unknown[]).map((h) => String(h ?? '').trim());
  if (headers.every((h) => !h)) throw new Error('الصف الأول يجب أن يكون ترويسة الأعمدة');
  const rows = (aoa.slice(1) as unknown[][]).filter((r) =>
    r.some((c) => String(c ?? '').trim() !== '')
  );
  if (rows.length === 0) throw new Error('لا توجد صفوف بيانات في الملف');
  return { headers, rows };
}

/** يطابق اسم عمود مع قائمة بدائل (case-insensitive، يتجاهل المسافات) */
function matchColumn(headers: string[], candidates: string[]): number {
  const norm = (s: string) =>
    String(s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  for (const candidate of candidates) {
    const i = headers.findIndex((h) => norm(h) === norm(candidate));
    if (i >= 0) return i;
  }
  // مطابقة جزئية: العمود يبدأ باحد البدائل
  for (const candidate of candidates) {
    const i = headers.findIndex((h) => norm(h).startsWith(norm(candidate)));
    if (i >= 0) return i;
  }
  return -1;
}

/** يحوّل نص/رقم إلى سعر صالح (يتقبل فواصل الآلاف والفاصلة العشرية العربية) */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  let s = String(value ?? '').trim();
  if (!s) return null;
  // أرقام عربية-هندية → لاتينية
  s = s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  s = s.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  s = s.replace(/[^\d.,-]/g, '');
  if (!s) return null;
  // "1,299.50" أو "1.299,50"
  if (s.includes(',') && s.includes('.')) {
    s =
      s.lastIndexOf(',') > s.lastIndexOf('.')
        ? s.replace(/\./g, '').replace(',', '.')
        : s.replace(/,/g, '');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* ============ استيراد المنتجات ============ */

const PRODUCT_FIELDS: Record<string, string[]> = {
  name: ['name', 'اسم المنتج', 'الاسم', 'المنتج', 'الصنف', 'product name', 'product'],
  price: ['price', 'السعر', 'سعر', 'سعر المنتج', 'سعر البيع'],
  stock: ['stock', 'الكمية', 'كمية', 'المخزون', 'العدد', 'qty', 'quantity'],
  category: ['category', 'الفئة', 'فئة', 'التصنيف', 'تصنيف', 'القسم'],
  description: ['description', 'الوصف', 'وصف', 'التفاصيل', 'details', 'desc'],
  unit: ['unit', 'الوحدة', 'وحدة', 'وحدة القياس'],
};

export interface ProductImportRow {
  rowNumber: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  description: string | null;
  unit: string | null;
}

export interface ProductImportInvalidRow {
  rowNumber: number;
  name: string;
  reason: string;
}

export interface ProductImportPreview {
  valid: ProductImportRow[];
  invalid: ProductImportInvalidRow[];
  headers: string[];
  /** العمود المطابق لكل حقل (أو null لو مش موجود) */
  columnMap: Record<string, string | null>;
  totalRows: number;
  /** الحقول الإلزامية الناقصة من الملف */
  missingRequired: string[];
}

/** يبني معاينة استيراد من جدول مُحلّل: مطابقة أعمدة + تحقق صف-بصف */
export function buildProductImportPreview(table: ParsedTable): ProductImportPreview {
  const { headers, rows } = table;
  const idx: Record<string, number> = {};
  for (const field of Object.keys(PRODUCT_FIELDS)) {
    idx[field] = matchColumn(headers, PRODUCT_FIELDS[field]);
  }

  const missingRequired: string[] = [];
  if (idx.name < 0) missingRequired.push('الاسم (name)');
  if (idx.price < 0) missingRequired.push('السعر (price)');

  const valid: ProductImportRow[] = [];
  const invalid: ProductImportInvalidRow[] = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 2; // +2: صف الترويسة + 1-based
    const name = String(idx.name >= 0 ? (row[idx.name] ?? '') : '').trim();
    if (idx.name < 0 || idx.price < 0) {
      invalid.push({ rowNumber, name, reason: 'الملف ناقص أعمدة إلزامية' });
      return;
    }
    if (!name) {
      invalid.push({ rowNumber, name: '', reason: 'اسم المنتج مطلوب' });
      return;
    }
    const price = toNumber(idx.price >= 0 ? row[idx.price] : null);
    if (price == null || price < 0) {
      invalid.push({ rowNumber, name, reason: 'سعر غير صالح' });
      return;
    }
    const stockRaw = idx.stock >= 0 ? toNumber(row[idx.stock]) : 0;
    if (stockRaw != null && stockRaw < 0) {
      invalid.push({ rowNumber, name, reason: 'الكمية غير صالحة' });
      return;
    }
    const description = idx.description >= 0 ? String(row[idx.description] ?? '').trim() : '';
    const unit = idx.unit >= 0 ? String(row[idx.unit] ?? '').trim() : '';
    valid.push({
      rowNumber,
      name,
      price,
      stock: stockRaw ?? 0,
      category: idx.category >= 0 ? String(row[idx.category] ?? '').trim() || 'عام' : 'عام',
      description: description || null,
      unit: unit || null,
    });
  });

  const columnMap: Record<string, string | null> = {};
  for (const field of Object.keys(PRODUCT_FIELDS)) {
    columnMap[field] = idx[field] >= 0 ? headers[idx[field]] : null;
  }

  return { valid, invalid, headers, columnMap, totalRows: rows.length, missingRequired };
}

/** ينزّل ملف قالب استيراد المنتجات (xlsx مع صفين مثال) */
export async function downloadProductTemplate() {
  const { exportData } = await import('@/lib/export');
  exportData(
    {
      filename: 'قالب-استيراد-المنتجات',
      sheetName: 'المنتجات',
      headers: ['name', 'price', 'stock', 'category', 'description', 'unit'],
      rows: [
        ['تيشيرت قطن', 250, 40, 'ملابس', 'تيشيرت قطن 100% مقاسات متعددة', 'قطعة'],
        ['قهوة مختصة 250جم', 180, 15, 'مشروبات', '', 'عبوة'],
      ],
    },
    'xlsx'
  );
}

/* ============ الرفع المجزّأ ============ */

export interface ImportDraftItemPayload {
  name: string;
  price: number;
  stock: number;
  category: string;
  description?: string | null;
  unit?: string | null;
}

export interface ImportDraftResult {
  created: { id: string; name: string }[];
  updated: { id: string; name: string }[];
  failed: { row: number; name?: string; reason: string }[];
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  total: number;
}

export interface ImportProgress {
  doneChunks: number;
  totalChunks: number;
  sent: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  errors: { row: number; name?: string; reason: string }[];
}

export const IMPORT_CHUNK_SIZE = 500;

type ApiRequestFn = <T = any>(path: string, options?: RequestInit) => Promise<T>;

/**
 * يرفع المنتجات على دفعات إلى endpoint الاستيراد ويبلّغ بالتقدم بعد كل دفعة.
 * الدفعات مستقلة: فشل دفعة (شبكة مثلاً) مايلغي الباقي ويُسجّل كأخطاء.
 */
export async function importProductsInChunks(
  shopId: string,
  items: ProductImportRow[],
  apiRequest: ApiRequestFn,
  onProgress?: (p: ImportProgress) => void,
  chunkSize = IMPORT_CHUNK_SIZE
): Promise<ImportProgress> {
  const chunks: ProductImportRow[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  const progress: ImportProgress = {
    doneChunks: 0,
    totalChunks: chunks.length,
    sent: 0,
    createdCount: 0,
    updatedCount: 0,
    failedCount: 0,
    errors: [],
  };

  for (const chunk of chunks) {
    try {
      const res = await apiRequest<ImportDraftResult>(
        `/products/manage/by-shop/${encodeURIComponent(shopId)}/import-drafts`,
        {
          method: 'POST',
          body: JSON.stringify({
            source: 'excel_bulk',
            items: chunk.map((it) => ({
              name: it.name,
              price: it.price,
              stock: it.stock,
              category: it.category,
              description: it.description,
              unit: it.unit,
            })),
          }),
        }
      );
      progress.createdCount += res?.createdCount ?? res?.created?.length ?? 0;
      progress.updatedCount += res?.updatedCount ?? res?.updated?.length ?? 0;
      const failed = res?.failed ?? [];
      progress.failedCount += failed.length ?? 0;
      if (failed.length) {
        // الباك-إند يرقّم الصفوف داخل الدفعة — نحوّلها لأرقام صفوف الملف
        const base = chunk[0]?.rowNumber ?? 1;
        progress.errors.push(
          ...failed.map((f) => ({
            row: typeof f.row === 'number' && f.row > 0 ? base + f.row - 1 : base,
            name: f.name,
            reason: f.reason,
          }))
        );
      }
    } catch (err: any) {
      progress.failedCount += chunk.length;
      progress.errors.push({
        row: chunk[0]?.rowNumber ?? 0,
        reason: err?.message || 'فشل إرسال الدفعة',
      });
    } finally {
      progress.doneChunks += 1;
      progress.sent += chunk.length;
      onProgress?.({ ...progress });
    }
  }

  return progress;
}
