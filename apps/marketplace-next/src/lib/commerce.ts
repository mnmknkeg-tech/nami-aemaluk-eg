// كيف المتجر بيبيع — القرار بييجي من التاجر مش من القسم.
//
// كل بطاقة في الماركت بترسم نفسها حسب resolveCommerce()، والأولوية بالترتيب ده:
//   1) اختيار التاجر الصريح في layoutConfig.commerce   ← الأعلى
//   2) بيانات المنتج نفسه (فيه سعر ولا لأ)
//   3) وضع القسم كـ fallback للمتاجر القديمة اللي ماخدتش قرار لسه
//
// مكان التخزين: layoutConfig.commerce — عمود JSONB موجود أصلاً في جدول shops
// بيتحدّث من PUT /shops/me وبيتبعت مع بيانات المتجر في الـ API، فمفيش migration.
//   {
//     "pricing":  "priced" | "hidden",              // إظهار السعر ولا إخفاؤه
//     "ordering": "cart" | "booking24h" | "appointment" | "contact",
//     "bookingWindowHours": 24,                      // "احجز 24 ساعة"
//     "queueEnabled": true                            // "كام واحد قدامي"
//   }

import type { Product, Shop } from './services';
import type { ActivityMode, MarketActivity } from './activity-catalog';

export type PricingMode = 'priced' | 'hidden';
export type OrderingMode = 'cart' | 'booking24h' | 'appointment' | 'contact';
export type BookingKind = 'none' | '24h' | 'appointment';

export type ShopCommerceConfig = {
  pricing?: PricingMode;
  ordering?: OrderingMode;
  /** مدة الاستجابة المعلنة (ساعات) — الافتراضي 24 */
  bookingWindowHours?: number;
  /** يعرض ترتيب الحاجزين (كام واحد قدامي) */
  queueEnabled?: boolean;
};

export type CommerceDecision = {
  pricing: PricingMode;
  ordering: OrderingMode;
  booking: BookingKind;
  /** يعرض السعر ولا لأ (لازم يكون مخفي لو التاجر طلب إخفاءه) */
  showPrice: boolean;
  /** يعرض السلة */
  showCart: boolean;
  /** يعرض زر "أضف للسلة" */
  showAddToCart: boolean;
  bookingWindowHours: number;
  queueEnabled: boolean;
  ctaKind: 'cart' | 'booking' | 'contact';
  ctaLabel: string;
};

/** وضع القسم بيتحوّل لطريقة طلب افتراضية (fallback بس — التاجر هو اللي بيقرر). */
const ORDERING_BY_MODE: Record<ActivityMode, OrderingMode> = {
  products: 'cart',
  menu: 'cart',
  booking: 'appointment',
  request_quote: 'booking24h',
  services: 'booking24h',
  classifieds: 'contact',
};

const CTA_LABELS: Record<OrderingMode, string> = {
  cart: 'أضف للسلة',
  booking24h: 'احجز 24 ساعة',
  appointment: 'احجز موعد',
  contact: 'تواصل مع المتجر',
};

const VALID_PRICING: PricingMode[] = ['priced', 'hidden'];
const VALID_ORDERING: OrderingMode[] = ['cart', 'booking24h', 'appointment', 'contact'];

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * يقرأ layoutConfig.commerce بتوع التاجر بشكل آمن.
 * أي حقل ناقص أو قيمة مش معروفة بتتجاهل بدل ما تكسر الصفحة.
 */
export function readShopCommerce(
  shop: Pick<Shop, 'layoutConfig'> | null | undefined
): ShopCommerceConfig {
  const commerce = asRecord(asRecord(shop?.layoutConfig)?.commerce);
  if (!commerce) return {};

  const out: ShopCommerceConfig = {};

  if (
    typeof commerce.pricing === 'string' &&
    VALID_PRICING.includes(commerce.pricing as PricingMode)
  ) {
    out.pricing = commerce.pricing as PricingMode;
  }
  if (
    typeof commerce.ordering === 'string' &&
    VALID_ORDERING.includes(commerce.ordering as OrderingMode)
  ) {
    out.ordering = commerce.ordering as OrderingMode;
  }
  const hours = commerce.bookingWindowHours;
  if (typeof hours === 'number' && Number.isFinite(hours) && hours > 0 && hours <= 72) {
    out.bookingWindowHours = hours;
  }
  if (typeof commerce.queueEnabled === 'boolean') {
    out.queueEnabled = commerce.queueEnabled;
  }

  return out;
}

/**
 * القرار النهائي لعنصر واحد (منتج/صنف) عند متجر معيّن.
 * لو الـ shop مش موجود (مثلاً في قسم مفيش قائمة متاجر محمّلة) بيشتغل على البيانات المتاحة بس.
 */
export function resolveCommerce(input: {
  product?: Pick<Product, 'price'> | null;
  shop?: Pick<Shop, 'layoutConfig'> | null;
  activity?: Pick<MarketActivity, 'mode'> | null;
}): CommerceDecision {
  const { product, shop, activity } = input;
  const config = readShopCommerce(shop);

  // السعر: اختيار التاجر أولاً، وإلا بنستنتجه من وجود سعر على المنتج.
  const hasPrice = typeof product?.price === 'number' && product.price > 0;
  const pricing: PricingMode = config.pricing ?? (hasPrice ? 'priced' : 'hidden');

  // طريقة الطلب: اختيار التاجر أولاً، وإلا نستخدم وضع القسم.
  const fallback = ORDERING_BY_MODE[activity?.mode ?? 'products'] ?? 'cart';
  const ordering: OrderingMode = config.ordering ?? fallback;

  const booking: BookingKind =
    ordering === 'booking24h' ? '24h' : ordering === 'appointment' ? 'appointment' : 'none';

  return {
    pricing,
    ordering,
    booking,
    // لو التاجر قالب "مhidden" ما نعرضش السعر حتى لو المنتج عليه سعر.
    showPrice: pricing === 'priced' && hasPrice,
    showCart: ordering === 'cart',
    showAddToCart: ordering === 'cart' && hasPrice,
    bookingWindowHours: config.bookingWindowHours ?? 24,
    // العيادات بطبعاً بتعرض الطابور، والبقية بس لو التاجر طلبه.
    queueEnabled: config.queueEnabled ?? booking === 'appointment',
    ctaKind: ordering === 'cart' ? 'cart' : ordering === 'contact' ? 'contact' : 'booking',
    ctaLabel: CTA_LABELS[ordering],
  };
}

/** خريطة shopId -> بيانات المتجر، عشان نلاقي قرار كل منتج بسرعة. */
export function indexShopsById(shops: Shop[]): Map<string, Shop> {
  const map = new Map<string, Shop>();
  for (const shop of shops ?? []) {
    if (shop?.id) map.set(shop.id, shop);
  }
  return map;
}

/** القرار لعنصر داخل قسم معروف. */
export function resolveForActivity(
  product: Pick<Product, 'price' | 'shopId'> | null | undefined,
  activity: Pick<MarketActivity, 'mode'>,
  shopsById?: Map<string, Shop>
): CommerceDecision {
  return resolveCommerce({
    product,
    shop: product?.shopId ? shopsById?.get(product.shopId) : undefined,
    activity,
  });
}
