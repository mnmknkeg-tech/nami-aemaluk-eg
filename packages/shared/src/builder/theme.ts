import type { SiteProduct } from './types';
import { normalizeImageUrl } from '../utils/image-url';

// The canonical defaults + normalizer live in designTokens.ts (single source
// for editor AND published); these aliases keep the historical names stable.
export {
  defaultDesignTokens as DEFAULT_DESIGN_TOKENS,
  normalizeDesignTokens as resolveTheme,
} from './designTokens';

/** Append an 8-digit alpha suffix to a hex color (canvas pattern: primary + '18'). */
export function withAlpha(hex: string | undefined, alpha: string): string {
  if (!hex) return alpha;
  return `${hex}${alpha}`;
}

export function formatPrice(price: number | string | undefined): string {
  if (price === undefined || price === null || price === '') return '';
  if (typeof price === 'string') return price;
  return `${price.toLocaleString('en-US')} ج.م`;
}

export function getSiteProductImageUrl(product: any): string | undefined {
  const images = Array.isArray(product?.images) ? product.images : [];
  const candidates = [product?.imageUrl, product?.image_url, product?.image, ...images];
  for (const candidate of candidates) {
    const value =
      typeof candidate === 'string'
        ? candidate
        : candidate && typeof candidate === 'object'
          ? candidate.url || candidate.imageUrl || candidate.image_url
          : undefined;
    const normalized = normalizeImageUrl(value);
    if (normalized) return normalized;
  }
  return undefined;
}

/** Map a real catalog product into the shape section templates expect. */
export function mapSiteProduct(p: any): SiteProduct {
  const images: string[] = Array.isArray(p?.images) ? p.images.filter(Boolean) : [];
  return {
    id: String(p?.id ?? ''),
    title: p?.title || p?.name || 'منتج',
    description: p?.description || undefined,
    price: typeof p?.price === 'number' ? p.price : Number(p?.price) || (p?.price as string),
    image: getSiteProductImageUrl(p),
    hoverImage: images[1] ? getSiteProductImageUrl({ images: [images[1]] }) : undefined,
    badge: p?.badge,
    specs: Array.isArray(p?.specs) ? p.specs : undefined,
    sizes: Array.isArray(p?.sizes) ? p.sizes : undefined,
    stock: typeof p?.stock === 'number' ? p.stock : Number(p?.stock) || undefined,
    slug: p?.slug,
    isActive: p?.isActive !== false && p?.is_active !== false,
    isAvailable: p?.isAvailable !== false && p?.is_available !== false,
    shopId: p?.shopId || p?.shop_id,
    shopSlug: p?.shopSlug || p?.shop_slug,
    // Booking products (unit = 'booking' or extraData.booking) carry their
    // commerce mode through so published cards can link into the real
    // booking flow instead of the order cart.
    unit: p?.unit,
    extraData: p?.extraData,
  } as SiteProduct & { unit?: string; extraData?: Record<string, any> };
}

/** True when a catalog product is a bookable offering (clinic visit, table, session…). */
export function isBookableProduct(p: any): boolean {
  if (!p) return false;
  return (
    p.unit === 'booking' || Boolean(p.extraData?.booking) || Boolean(p.extraData?.bookingDetails)
  );
}

/** Build a wa.me link from an Egyptian phone number with a prefilled text. */
export function buildWhatsAppLink(phone: string | undefined, text: string): string | null {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const intl = digits.startsWith('20') ? digits : `2${digits}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}
