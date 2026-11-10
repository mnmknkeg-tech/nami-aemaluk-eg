/**
 * أدوات الاستيراد الحقيقي للوححة: قراءة ملفات Excel/CSV عبر SheetJS،
 * مطابقة أعمدة عربية/إنجليزية، تحقق صف-بصف، ورفع مجزّأ للباك-إند.
 */
import * as XLSX from 'xlsx';
import { normalizeImageUrl } from '@ray-eg/shared/utils/image-url';

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
  imageUrl: ['imageUrl', 'image_url', 'رابط الصورة', 'صورة المنتج'],
  images: ['images', 'الصور', 'صور المنتج', 'صور إضافية'],
  colors: ['colors', 'الألوان', 'الالوان'],
  sizes: ['sizes', 'المقاسات', 'المقاسات/الأحجام', 'الأحجام'],
  addons: ['addons', 'الإضافات', 'الاضافات'],
  menuVariants: ['menuVariants', 'متغيرات القائمة', 'أنواع الوجبة'],
  packOptions: ['packOptions', 'خيارات العبوة', 'الباقات'],
  model3dUrl: ['model3dUrl', 'model_3d_url', 'رابط نموذج 3d'],
  spinImages: ['spinImages', 'صور الدوران'],
  extraData: ['extraData', 'بيانات إضافية', 'بيانات اضافية'],
  furnitureMeta: ['furnitureMeta', 'بيانات الأثاث', 'بيانات الاثاث'],
  trackStock: ['trackStock', 'تتبع المخزون'],
  isActive: ['isActive', 'نشط', 'فعال'],
  appActive: ['appActive', 'نشط في التطبيق'],
  isDemo: ['isDemo', 'صف تجريبي', 'هل هذا صف تجريبي؟', 'تجريبي'],
};

const JSON_FIELDS = new Set([
  'images',
  'colors',
  'sizes',
  'addons',
  'menuVariants',
  'packOptions',
  'spinImages',
  'extraData',
  'furnitureMeta',
]);

export type ProductTemplateKind =
  | 'clothing'
  | 'service'
  | 'restaurant'
  | 'digital'
  | 'giftcard'
  | 'bundle'
  | 'bookings';

const TEMPLATE_FIELDS: Record<ProductTemplateKind, string[]> = {
  clothing: ['name', 'price', 'stock', 'category', 'description', 'unit', 'imageUrl', 'images', 'colors', 'sizes', 'packOptions', 'addons', 'extraData', 'trackStock', 'isActive', 'isDemo'],
  service: ['name', 'price', 'category', 'description', 'unit', 'imageUrl', 'extraData', 'trackStock', 'isActive', 'isDemo'],
  restaurant: ['name', 'price', 'category', 'description', 'unit', 'imageUrl', 'menuVariants', 'addons', 'extraData', 'trackStock', 'isActive', 'isDemo'],
  digital: ['name', 'price', 'category', 'description', 'unit', 'imageUrl', 'extraData', 'isActive', 'isDemo'],
  giftcard: ['name', 'price', 'stock', 'category', 'description', 'unit', 'imageUrl', 'extraData', 'trackStock', 'isActive', 'isDemo'],
  bundle: ['name', 'price', 'stock', 'category', 'description', 'unit', 'imageUrl', 'extraData', 'trackStock', 'isActive', 'isDemo'],
  bookings: ['name', 'price', 'category', 'description', 'unit', 'imageUrl', 'extraData', 'isActive', 'isDemo'],
};

const TEMPLATE_HEADERS_AR: Record<string, string> = {
  name: 'اسم المنتج', price: 'السعر', stock: 'المخزون', category: 'التصنيف', description: 'الوصف',
  unit: 'الوحدة', imageUrl: 'رابط الصورة', images: 'صور إضافية', colors: 'الألوان', sizes: 'المقاسات',
  packOptions: 'خيارات العبوة', addons: 'الإضافات', menuVariants: 'متغيرات القائمة', extraData: 'بيانات إضافية',
  trackStock: 'تتبع المخزون؟', isActive: 'نشط؟', isDemo: 'صف تجريبي؟',
};

export const PRODUCT_TEMPLATE_LABELS: Record<ProductTemplateKind, string> = {
  clothing: 'منتج ملابس',
  service: 'خدمة حسب الطلب',
  restaurant: 'أكل ومشروبات',
  digital: 'منتج رقمي',
  giftcard: 'بطاقة رقمية',
  bundle: 'مجموعة منتجات',
  bookings: 'حجوزات',
};

function parseOptionalJSON(value: unknown, field: string): any {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`قيمة ${TEMPLATE_HEADERS_AR[field] || field} يجب أن تكون بصيغة JSON صحيحة`);
  }
}

function normalizeImportedImageValue(value: any): any {
  if (typeof value === 'string') {
    if (!value.trim()) return value;
    const normalized = normalizeImageUrl(value);
    if (!normalized) {
      throw new Error('رابط الصورة غير صالح؛ استخدم رابط صورة عامًا يبدأ بـ https://');
    }
    return normalized;
  }
  if (Array.isArray(value)) return value.map(normalizeImportedImageValue);
  if (!value || typeof value !== 'object') return value;

  const result = { ...value };
  for (const key of ['url', 'src', 'imageUrl', 'image_url', 'image']) {
    if (typeof result[key] === 'string') result[key] = normalizeImportedImageValue(result[key]);
  }
  return result;
}

function toBoolean(value: unknown): boolean | undefined {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return undefined;
  if (['true', '1', 'yes', 'نعم', 'مفعل', 'فعال'].includes(raw)) return true;
  if (['false', '0', 'no', 'لا', 'غير مفعل', 'غير فعال'].includes(raw)) return false;
  return undefined;
}

export interface ProductImportRow {
  rowNumber: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  description: string | null;
  unit: string | null;
  imageUrl?: string | null;
  images?: any[];
  colors?: any[];
  sizes?: any[];
  addons?: any[];
  menuVariants?: any[];
  packOptions?: any[];
  model3dUrl?: string | null;
  spinImages?: any[];
  extraData?: Record<string, any>;
  furnitureMeta?: Record<string, any>;
  trackStock?: boolean;
  isActive?: boolean;
  appActive?: boolean;
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
  if (idx.name < 0) missingRequired.push('اسم المنتج');
  if (idx.price < 0) missingRequired.push('السعر');

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
    if (idx.isDemo >= 0 && toBoolean(row[idx.isDemo]) === true) return;
    try {
      const parsed: Record<string, any> = {};
      for (const field of JSON_FIELDS) {
        const fieldIdx = idx[field];
        if (fieldIdx >= 0) parsed[field] = parseOptionalJSON(row[fieldIdx], field);
      }
      const rawImageUrl = idx.imageUrl >= 0 ? String(row[idx.imageUrl] ?? '').trim() : '';
      const imageUrl = rawImageUrl ? normalizeImportedImageValue(rawImageUrl) : '';
      for (const field of ['images', 'spinImages']) {
        if (parsed[field] !== undefined) parsed[field] = normalizeImportedImageValue(parsed[field]);
      }
      valid.push({
        rowNumber,
        name,
        price,
        stock: stockRaw ?? 0,
        category: idx.category >= 0 ? String(row[idx.category] ?? '').trim() || 'عام' : 'عام',
        description: description || null,
        unit: unit || null,
        imageUrl: imageUrl || null,
        model3dUrl: idx.model3dUrl >= 0 ? String(row[idx.model3dUrl] ?? '').trim() || null : null,
        trackStock: idx.trackStock >= 0 ? toBoolean(row[idx.trackStock]) : undefined,
        isActive: idx.isActive >= 0 ? toBoolean(row[idx.isActive]) : undefined,
        appActive: idx.appActive >= 0 ? toBoolean(row[idx.appActive]) : undefined,
        ...parsed,
      });
    } catch (err: any) {
      invalid.push({ rowNumber, name, reason: err?.message || 'بيانات JSON غير صالحة' });
    }
  });

  const columnMap: Record<string, string | null> = {};
  for (const field of Object.keys(PRODUCT_FIELDS)) {
    columnMap[field] = idx[field] >= 0 ? headers[idx[field]] : null;
  }

  return { valid, invalid, headers, columnMap, totalRows: rows.length, missingRequired };
}

/** ينزّل ملف قالب استيراد المنتجات مع الحقول الأساسية والمتقدمة */
export async function downloadProductTemplate(kind: ProductTemplateKind = 'clothing') {
  const headers = TEMPLATE_FIELDS[kind];
  const defaults: Record<string, any> = {
    name: 'مثال فقط - لا يتم رفعه', price: 100, stock: 0, category: 'عام', description: 'هذا صف تجريبي للشرح فقط', unit: 'قطعة',
    imageUrl: '', images: '', colors: '', sizes: '', packOptions: '', addons: '', menuVariants: '',
    extraData: '{}', trackStock: 'true', isActive: 'true', isDemo: 'true',
  };
  // Keep the examples aligned with each activity's product unit and payload shape.
  const unitByKind: Record<ProductTemplateKind, string> = {
    clothing: 'قطعة', service: 'custom_service', restaurant: 'food', digital: 'digital',
    giftcard: 'giftcard', bundle: 'bundle', bookings: 'booking',
  };
  const example = headers.map((field) => defaults[field] ?? '');
  const unitIndex = headers.indexOf('unit');
  if (unitIndex >= 0) example[unitIndex] = unitByKind[kind];
  const stockIndex = headers.indexOf('stock');
  if (stockIndex >= 0) example[stockIndex] = kind === 'giftcard' ? 10 : 0;
  for (const field of ['images', 'colors', 'sizes', 'packOptions', 'addons', 'menuVariants']) {
    const i = headers.indexOf(field);
    if (i >= 0) example[i] = '[]';
  }
  const extraIndex = headers.indexOf('extraData');
  if (extraIndex >= 0) example[extraIndex] = JSON.stringify({ activityTemplate: kind });
  const rows = [example];
  const { exportData } = await import('@/lib/export');
  exportData(
    {
      filename: `قالب-استيراد-${PRODUCT_TEMPLATE_LABELS[kind]}`,
      sheetName: 'المنتجات',
      headers: headers.map((field) => TEMPLATE_HEADERS_AR[field] || field),
      rows,
      additionalSheets: [{
        sheetName: 'تعليمات الاستخدام',
        headers: ['البند', 'الشرح'],
        rows: [
          ['مهم', 'الصف الموجود في ورقة المنتجات تجريبي للشرح فقط ولن يتم رفعه لأن صف تجريبي؟ قيمته نعم.'],
          ['الصفوف الجديدة', 'أضف منتجاتك في صفوف أسفل المثال، واجعل صف تجريبي؟ فارغًا أو اكتب لا.'],
          ['السعر والمخزون', 'اكتب أرقامًا فقط. في البطاقة الرقمية يمثل المخزون عدد الأكواد المتاحة.'],
          ['الصور والقوائم', 'ضع رابط الصورة المباشر. الحقول التي تحتوي أكثر من قيمة تكتب بصيغة JSON.'],
          ['مثال JSON', 'الألوان: [{"name":"أسود","value":"#000000"}]، وإذا لم تستخدم الحقل اتركه فارغًا.'],
          ['البيانات الإضافية', 'استخدم JSON صالحًا فقط، ولا تضع نصًا عاديًا داخل هذه الخانة.'],
          ['طريقة الرفع', 'بعد حفظ الملف اختر استيراد من لوحة المنتجات، راجع المعاينة، ثم اضغط تأكيد الاستيراد.'],
        ],
      }],
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
  imageUrl?: string | null;
  images?: any[];
  colors?: any[];
  sizes?: any[];
  addons?: any[];
  menuVariants?: any[];
  packOptions?: any[];
  model3dUrl?: string | null;
  spinImages?: any[];
  extraData?: Record<string, any>;
  furnitureMeta?: Record<string, any>;
  trackStock?: boolean;
  isActive?: boolean;
  appActive?: boolean;
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
              imageUrl: it.imageUrl,
              images: it.images,
              colors: it.colors,
              sizes: it.sizes,
              addons: it.addons,
              menuVariants: it.menuVariants,
              packOptions: it.packOptions,
              model3dUrl: it.model3dUrl,
              spinImages: it.spinImages,
              extraData: it.extraData,
              furnitureMeta: it.furnitureMeta,
              trackStock: it.trackStock,
              isActive: it.isActive,
              appActive: it.appActive,
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
