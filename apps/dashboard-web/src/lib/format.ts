/**
 * مركز تنسيق الأرقام والتواريخ — مرجع واحد بدل التعريفات المكررة في كل صفحة.
 *
 * الدلالات هنا مطابقة تماماً للتعريفات القديمة المنتشرة في الملفات:
 * - formatEGP  → نمط واجهة الأدمن (ج.م + أرقام عربية + تقريب)
 * - formatMoney → نمط HR (أرقام لاتينية مجمعة + عملة اختيارية)
 * - formatAmount → نمط المالية/السلة المتروكة (رقم مجرد منزلتين)
 * - formatDate → تاريخ عربي مع «-» عند الفشل
 */

/** «ج.م 1٬234» — بالأرقام العربية ومقرب لأقرب رقم صحيح */
export function formatEGP(n: unknown): string {
  const v = Number(n || 0);
  return `ج.م ${Math.round(Number.isFinite(v) ? v : 0).toLocaleString('ar-EG')}`;
}

/** «ج.م 1,234.5» أو «1,234.5» بدون عملة — أرقام لاتينية مجمعة حتى منزلتين */
export function formatMoney(value: unknown, currency = ''): string {
  const n = Number(value || 0);
  const grouped = n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return currency ? `${currency} ${grouped}` : grouped;
}

/** «1234.50» — رقم مجرد منزلتين بدون فاصل آلاف ولا عملة */
export function formatAmount(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

/** «١٥ يناير 2026» أو «-» لو التاريخ غير صالح */
export function formatDate(d: unknown): string {
  const dt = new Date(String(d));
  return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('ar-EG');
}
