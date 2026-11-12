import type { Product } from './services';
import { normalizeImageUrl } from '@ray-eg/shared/utils/image-url';

export const PRODUCT_IMAGE_FALLBACK = '/placeholder-product.png';

/**
 * Single source of truth for "which image should this product render?".
 * Merchant uploads go stale (deleted files, bad CDN URLs, http links), so the
 * card, the cart and the product page used to repeat the same three-level
 * fallback in different files — one place to keep them in sync.
 */
export function resolveProductImage(
  product: Pick<Product, 'imageUrl' | 'images'> | null | undefined
): string {
  if (!product) return PRODUCT_IMAGE_FALLBACK;
  const candidates = [product.imageUrl, ...(product.images ?? [])];
  return candidates.map(normalizeImageUrl).find((src) => src !== '') ?? PRODUCT_IMAGE_FALLBACK;
}
