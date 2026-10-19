import type { ComponentNode } from './types';

// ============================================================
// Product-card shared resolution — single source of truth for
// how product cards render in the editor canvas AND the
// published site (NodeView). Everything is driven by section
// node.props so any change in the inspector applies instantly.
// ============================================================

/** أشكال البطاقة المتاحة (تاب الشكل في الإسبكتور). */
export type ProductCardShape =
  | 'classic' // الصورة أعلى والبيانات أسفل (الشكل الافتراضي)
  | 'minimal' // بدون حدود ولا ظل — نظيف
  | 'overlay' // البيانات متراكبة فوق الصورة
  | 'horizontal' // صورة جانبية + محتوى بجانبها
  | 'compact'; // بطاقات صغيرة كثيفة للعروض

/** شكل زر الشراء. */
export type BuyButtonMode = 'full' | 'icon' | 'hidden';

/** نسخة مُطبَّعة لمقاس واحد. */
export interface NormalizedSize {
  label: string;
  price?: string;
}

export interface ProductCardOptions {
  shape: ProductCardShape;
  showBadge: boolean;
  showPrice: boolean;
  showSpecs: boolean;
  showDescription: boolean;
  showBuyButton: boolean;
  showCtaButton: boolean;
  showStock: boolean;
  showSizes: boolean;
  buyButtonMode: BuyButtonMode;
  buyButtonText: string;
  buyButtonIcon: string;
  ctaText: string;
  badgeText: string;
  /** أحجام احتياطية على مستوى القسم تُستخدم إن لم يحمل المنتج أحجامه الخاصة. */
  defaultSizes: NormalizedSize[];
  /** عدد الأعمدة لكل شاشة داخل شبكة القسم. */
  columnsDesktop: number;
  columnsTablet: number;
  columnsMobile: number;
}

/** تطابق المقاسات من مصادر متعددة (نص | كائن label/name) إلى label+price. */
export function normalizeProductSizes(raw: unknown): NormalizedSize[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s): NormalizedSize | null => {
      if (typeof s === 'string') {
        const label = s.trim();
        return label ? { label } : null;
      }
      if (s && typeof s === 'object') {
        const obj = s as Record<string, any>;
        const label = String(obj.label ?? obj.name ?? obj.title ?? '').trim();
        if (!label) return null;
        const priceRaw = obj.price ?? obj.extraPrice ?? obj.priceDelta;
        const price =
          priceRaw === undefined || priceRaw === null || priceRaw === ''
            ? undefined
            : String(priceRaw);
        return { label, price };
      }
      return null;
    })
    .filter((s): s is NormalizedSize => s !== null);
}

const clampCols = (v: any, fallback: number, max: number): number => {
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
};

/**
 * يجمع كل خيارات شكل/سلوك بطاقة المنتج من props القسم،
 * مع قيم افتراضية محفوظة للتوافق مع المواقع القديمة.
 */
export function resolveProductCardOptions(props: Record<string, any> | undefined): ProductCardOptions {
  const p = props || {};
  const shape: ProductCardShape = (['classic', 'minimal', 'overlay', 'horizontal', 'compact'] as string[]).includes(
    String(p.cardShape)
  )
    ? (p.cardShape as ProductCardShape)
    : 'classic';

  const buyButtonMode: BuyButtonMode = (['full', 'icon', 'hidden'] as string[]).includes(String(p.buyButtonMode))
    ? (p.buyButtonMode as BuyButtonMode)
    : 'full';

  // الإخفاء يتحقق من كل المفاتيح القديمة والجديدة للتوافق.
  const showBadge = !(p.hideBadge || p.badgeHidden);
  const showPrice = !(p.hidePrice || p.priceHidden);
  const showSpecs = !(p.hideSpecs || p.specsHidden);
  const showDescription = !(p.hideDescription || p.descriptionHidden);
  const showCtaButton = !(p.hideCtaBtn || p.hideSecondaryBtn);
  const showStock = p.showStock === true && p.hideStock !== true;
  const showSizes = p.showSizes === true && p.hideSizes !== true;

  return {
    shape,
    showBadge,
    showPrice,
    showSpecs,
    showDescription,
    showBuyButton: buyButtonMode !== 'hidden' && !(p.hideBuyBtn || p.hideBuyButton),
    showCtaButton,
    showStock,
    showSizes,
    buyButtonMode,
    buyButtonText: String(p.buyButtonText || 'إضافة للسلة'),
    buyButtonIcon: String(p.buyButtonIcon || 'ShoppingBag'),
    ctaText: String(p.ctaText || 'تفاصيل وحجز'),
    badgeText: String(p.badge || 'حصري'),
    defaultSizes: normalizeProductSizes(p.sizes || p.defaultSizes),
    columnsDesktop: clampCols(p.columnsDesktop, 3, 4),
    columnsTablet: clampCols(p.columnsTablet, 2, 3),
    columnsMobile: clampCols(p.columnsMobile, 1, 2),
  };
}

/** كلاسات شبكة متجاوبة حسب أعداد الأعمدة المختارة لكل شاشة. */
export function productGridClass(o: ProductCardOptions): string {
  const t = o.columnsTablet === 1 ? 'sm:grid-cols-1' : o.columnsTablet === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  const d =
    o.columnsDesktop === 1
      ? 'lg:grid-cols-1'
      : o.columnsDesktop === 2
      ? 'lg:grid-cols-2'
      : o.columnsDesktop === 4
      ? 'lg:grid-cols-4'
      : 'lg:grid-cols-3';
  const m = o.columnsMobile === 2 ? 'grid-cols-2' : 'grid-cols-1';
  return `grid ${m} ${t} ${d}`;
}

export interface ProductCardInput {
  id?: string | number;
  title?: string;
  price?: number | string;
  image?: string;
  hoverImage?: string;
  images?: string[];
  badge?: string;
  specs?: string[];
  description?: string;
  subtitle?: string;
  sizes?: any[];
  stock?: number;
  hideBuyBtn?: boolean;
}

/** توافق مع قسم 'card' مفرد — نفس الخيارات لكن بقيم افتراضية محفوظة. */
export function resolveCardNodeOptions(node: ComponentNode): ProductCardOptions {
  return resolveProductCardOptions(node.props);
}

export interface ResolvedProductCard {
  title: string;
  img: string;
  hoverImg?: string;
  badge: string;
  rawPrice: number;
  formattedPrice: string;
  productSizes: NormalizedSize[];
  specs: string[];
  description: string;
  stock?: number;
  href: string;
  hideBuyBtn: boolean;
}

export function parsePriceValue(price: number | string | undefined, fallback = 100): { raw: number; formatted: string } {
  const raw = typeof price === 'number' ? price : parseInt(String(price ?? '').replace(/[^0-9]/g, ''), 10) || fallback;
  const formatted = typeof price === 'string' && price.trim() ? price : `${raw.toLocaleString()} ج.م`;
  return { raw, formatted };
}

/** يبني بيانات العرض لمنتج واحد مع fallback للكتالوج الحقيقي. */
export function resolveCardDisplay(
  item: ProductCardInput | undefined,
  index: number,
  options: ProductCardOptions,
  realProducts?: Array<Record<string, any>>,
): ResolvedProductCard {
  const list = realProducts || [];
  const fallbackItem = list.length > 0 ? list[Math.min(Math.max(0, index), list.length - 1)] : undefined;
  const src: Record<string, any> = { ...(fallbackItem || {}), ...((item || {}) as Record<string, any>) };
  const title = String(src.title ?? `منتج ${index + 1}`);
  const { raw, formatted } = parsePriceValue(src.price as any, 100);
  const stockRaw = src.stock;
  const stockNum = stockRaw === undefined || stockRaw === null || stockRaw === '' ? undefined : Number(stockRaw);
  const cardProductId = src.id ?? src.productId ?? '';
  return {
    title,
    img: String(src.image ?? ''),
    hoverImg: src.hoverImage || (Array.isArray(src.images) && src.images[1]) || undefined,
    badge: String(src.badge ?? options.badgeText),
    rawPrice: raw,
    formattedPrice: formatted,
    productSizes: normalizeProductSizes(src.sizes),
    specs: Array.isArray(src.specs) ? src.specs.map(String) : [],
    description: String(src.description ?? src.subtitle ?? ''),
    stock: stockNum === undefined || Number.isNaN(stockNum) ? undefined : stockNum,
    href: cardProductId ? `/product/${cardProductId}` : '#',
    hideBuyBtn: Boolean(src.hideBuyBtn),
  };
}