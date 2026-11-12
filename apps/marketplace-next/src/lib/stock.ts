import type { Product } from './services';

/**
 * التمييز بين نوعين من الأصناف:
 *
 * 1. أصناف بتتبع مخزون (منتجات تجزئة بالقطع) — trackStock=true:
 *    للعميل سقف كمية = المتبقي في المخزون، ولما يخلص تبقى «نفدت الكمية».
 *
 * 2. أصناف مالهاش مخزون أصلًا (منيو المطاعم/الكافيهات — متتجهز لكل طلب،
 *    والأنشطة/الخدمات) — trackStock=false: العدّاد مفتوح بلا سقف،
 *    والصنف متاح للطلب دايمًا (التحقق النهائي على السيرفر بيكرم track_stock).
 *
 * الـ API العام بيرجّل trackStock/stock على المنتج؛ لو مأجوش نعتبره صنف
 * بلا تتبع (سلوك المطاعم) — آمن أكثر من قفل الطلب بالغلط.
 */
export interface StockState {
  tracked: boolean;
  soldOut: boolean;
  maxQuantity?: number;
}

export function productStockState(
  product: Product | Record<string, any> | null | undefined
): StockState {
  if (!product) return { tracked: false, soldOut: false };
  const raw = product as Record<string, any>;
  const tracked = raw.trackStock === true || raw.track_stock === true;
  if (!tracked) return { tracked: false, soldOut: false };

  const stock = Number(raw.stock);
  if (!Number.isFinite(stock)) return { tracked: true, soldOut: false };
  if (stock <= 0) return { tracked: true, soldOut: true };
  return { tracked: true, soldOut: false, maxQuantity: Math.floor(stock) };
}

/** هل الصنف ممنوع من الطلب فعلًا (ال تاجر علّمه غير متاح، أو بيتبع مخزون وخلص). */
export function isProductOrderable(
  product: Product | Record<string, any> | null | undefined
): boolean {
  if (!product) return false;
  const raw = product as Record<string, any>;
  if (raw.isAvailable === false || raw.isActive === false || raw.is_active === false) return false;
  return !productStockState(raw).soldOut;
}
