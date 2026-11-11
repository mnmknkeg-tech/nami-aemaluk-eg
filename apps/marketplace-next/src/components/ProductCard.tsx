'use client';

import Link from 'next/link';
import { Star, Eye } from 'lucide-react';
import type { Product, Shop } from '@/lib/services';
import type { MarketActivity } from '@/lib/activity-catalog';
import { resolveCommerce, type CommerceDecision } from '@/lib/commerce';
import { useShopCommerce } from '@/lib/useShopCommerce';
import { formatPrice } from '@/lib/utils';
import { resolveProductImage } from '@/lib/product-image';
import { ProductImage } from './ProductImage';
import { CommerceAction } from './CommerceAction';
import { WishlistButton } from './WishlistButton';

/**
 * ProductCard v2 — Professional redesign
 *
 * Design language: "Warm Egyptian SaaS"
 *   • Soft ambient shadow (0 8px 24px rgba(15,23,42,0.08))
 *   • Hairline border (--brand-border)
 *   • Generous 24px radius (rounded-3xl)
 *   • Orange accent on hover (no neon glow)
 *   • "Quick view" hint appears on hover
 *   • Discount badge = orange (not red) to match brand
 *   • Out-of-stock = soft ink overlay (not harsh black)
 *   • Vendor name = amber dot + muted text (more refined than plain text)
 *   • Price area: separated by hairline, clear hierarchy
 *   • Action button: pill-shaped with subtle shadow
 */
export function ProductCard({
  product,
  priority = false,
  shop,
  activity,
  commerce,
  siteSlug,
}: {
  product: Product;
  priority?: boolean;
  shop?: Pick<Shop, 'layoutConfig'> | null;
  activity?: Pick<MarketActivity, 'mode'> | null;
  commerce?: CommerceDecision;
  siteSlug?: string;
}) {
  const image = resolveProductImage(product);
  const resolvedShop = useShopCommerce(product.shopId, shop);
  const decision = commerce ?? resolveCommerce({ product, shop: resolvedShop, activity });
  const hasDiscount =
    product.oldPrice != null && product.oldPrice > (product.price || 0) && decision.showPrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.oldPrice! - (product.price || 0)) / product.oldPrice!) * 100)
    : 0;
  const isOOS = product.isAvailable === false;

  return (
    <div
      className="
        card-contain group relative flex flex-col h-full
        bg-white dark:bg-slate-900
        rounded-3xl overflow-hidden
        border border-slate-200/70 dark:border-slate-800
        transition-all duration-300 ease-soft
        hover:-translate-y-1
        hover:border-brand-orange/35
        hover:shadow-card-hover
        dark:hover:shadow-orange-950/10
      "
    >
      {/* Clickable link over the whole card */}
      <Link
        href={
          product.href ||
          (siteSlug ? `/site/${siteSlug}/product/${product.id}` : `/product/${product.id}`)
        }
        className="absolute inset-0 z-0"
        aria-label={product.name || 'تفاصيل المنتج'}
      >
        <span className="sr-only">{product.name}</span>
      </Link>

      {/* ─── Image Container ──────────────────────────────────────────── */}
      <div className="relative aspect-square w-full overflow-hidden bg-brand-cream dark:bg-slate-800/40 pointer-events-none">
        <ProductImage
          src={image}
          alt={product.name || 'منتج'}
          priority={priority}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
          className="group-hover:scale-105 transition-transform duration-700 ease-soft"
        />

        {/* Soft top gradient — gives images a polished frame look */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none" />

        {/* Discount Badge — orange (matches brand) */}
        {hasDiscount && (
          <div
            className="
              absolute top-3 right-3
              px-2.5 py-1 rounded-full
              bg-gradient-to-br from-brand-orange-light to-brand-orange
              text-white text-[11px] font-black tracking-tight
              shadow-glow-orange-sm
              backdrop-blur-xs
            "
          >
            -{discountPercent}%
          </div>
        )}

        {/* Out of Stock Overlay — softer than black */}
        {isOOS && (
          <div className="absolute inset-0 bg-brand-ink/50 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-3 py-1.5 rounded-full bg-white/95 text-brand-ink font-bold text-xs shadow-md">
              غير متوفر حالياً
            </span>
          </div>
        )}

        {/* Quick View Hint — appears on hover (bottom of image) */}
        {!isOOS && (
          <div
            className="
              absolute bottom-3 left-1/2 -translate-x-1/2
              px-3 py-1.5 rounded-full
              bg-white/95 backdrop-blur-sm
              text-brand-ink text-[11px] font-bold
              shadow-md
              flex items-center gap-1.5
              opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0
              transition-all duration-300 ease-soft
              pointer-events-none
            "
          >
            <Eye className="w-3 h-3" />
            عرض التفاصيل
          </div>
        )}
      </div>

      {/* Wishlist floating button */}
      <div className="absolute top-3 left-3 z-10">
        <WishlistButton product={product} size="sm" />
      </div>

      {/* ─── Info Container ───────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-3.5 md:p-4 relative z-1 pointer-events-none">
        {/* Vendor + Rating row */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5 min-h-[16px]">
          {product.shopName ? (
            <span className="flex items-center gap-1.5 text-[11px] text-brand-ink-muted dark:text-slate-400 font-semibold truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-amber shrink-0" />
              {product.shopName}
            </span>
          ) : (
            <span />
          )}

          {product.rating != null && product.rating > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-amber shrink-0">
              <Star className="w-3 h-3 fill-brand-amber text-brand-amber" />
              {product.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="
            font-bold text-xs md:text-sm
            text-brand-ink dark:text-white
            line-clamp-2 leading-snug
            min-h-[2.4rem]
            group-hover:text-brand-orange
            transition-colors duration-200
          "
        >
          {product.name}
        </h3>

        {/* Price & Action Row — separated by hairline */}
        <div className="mt-auto pt-3 flex items-end justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-col">
            {hasDiscount && (
              <span className="text-[10px] md:text-xs text-brand-ink-faint line-through font-medium leading-none mb-1">
                {formatPrice(product.oldPrice!, product.currency)}
              </span>
            )}
            {decision.showPrice ? (
              <span className="font-black text-sm md:text-base text-brand-ink dark:text-white leading-tight">
                {product.price != null ? formatPrice(product.price, product.currency) : '—'}
              </span>
            ) : (
              <>
                <span className="font-black text-[11px] md:text-xs text-brand-ink dark:text-white leading-tight">
                  السعر عند الطلب
                </span>
                {decision.booking === '24h' && (
                  <span className="text-[10px] text-brand-ink-muted dark:text-slate-400 font-semibold leading-tight">
                    رد خلال {decision.bookingWindowHours} ساعة
                  </span>
                )}
              </>
            )}
          </div>

          {/* Action button — interactive above card link */}
          <div className="pointer-events-auto">
            <CommerceAction
              decision={decision}
              product={product}
              shopId={product.shopId}
              shopName={product.shopName}
              variant="icon"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
