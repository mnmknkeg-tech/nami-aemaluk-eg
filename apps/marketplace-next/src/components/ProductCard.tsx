'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import type { Product, Shop } from '@/lib/services';
import type { MarketActivity } from '@/lib/activity-catalog';
import { resolveCommerce, type CommerceDecision } from '@/lib/commerce';
import { useShopCommerce } from '@/lib/useShopCommerce';
import { formatPrice } from '@/lib/utils';
import { resolveProductImage } from '@/lib/product-image';
import { ProductImage } from './ProductImage';
import { CommerceAction } from './CommerceAction';
import { WishlistButton } from './WishlistButton';

export function ProductCard({
  product,
  priority = false,
  shop,
  activity,
  commerce,
}: {
  product: Product;
  priority?: boolean;
  /** بيانات المتجر — لو اتمرّرت، بنقرا منها layoutConfig.commerce (اختيار التاجر) */
  shop?: Pick<Shop, 'layoutConfig'> | null;
  /** القسم — بيتستخدم كـ fallback بس لما المتجر ماخدش قرار */
  activity?: Pick<MarketActivity, 'mode'> | null;
  /** لو Decision جاهز (من صفحة القسم) بيستخدمه على طول */
  commerce?: CommerceDecision;
}) {
  const image = resolveProductImage(product);
  // لو الصفحة مرّرت shop (صفحة القسم) نستخدمه، وإلا نجيب قرار التاجر من فهرس المتاجر —
  // عشان اختيار التاجر يفضل مطبّق في كل مكان بيظهر فيه المنتج مش بس في صفحة القسم.
  const resolvedShop = useShopCommerce(product.shopId, shop);
  const decision = commerce ?? resolveCommerce({ product, shop: resolvedShop, activity });
  const hasDiscount =
    product.oldPrice != null && product.oldPrice > (product.price || 0) && decision.showPrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.oldPrice! - (product.price || 0)) / product.oldPrice!) * 100)
    : 0;

  return (
    <div className="card-contain group relative flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 hover:border-brand-cyan/40 hover:shadow-lg dark:hover:shadow-cyan-950/20 transition-all duration-300">
      {/* Clickable link over the whole card */}
      <Link
        href={`/product/${product.id}`}
        className="absolute inset-0 z-0"
        aria-label={product.name || 'تفاصيل المنتج'}
      >
        <span className="sr-only">{product.name}</span>
      </Link>

      {/* Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800/60 pointer-events-none">
        <ProductImage
          src={image}
          alt={product.name || 'منتج'}
          priority={priority}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
          className="group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-red-500/95 text-white text-[11px] font-black tracking-tight shadow-md backdrop-blur-xs">
            -{discountPercent}%
          </div>
        )}

        {/* Out of Stock Overlay */}
        {product.isAvailable === false && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="px-2.5 py-1 rounded-full bg-black/70 text-white font-bold text-xs border border-white/20">
              غير متوفر
            </span>
          </div>
        )}
      </div>

      {/* Wishlist floating button (interactive above card link) */}
      <div className="absolute top-2.5 left-2.5 z-10">
        <WishlistButton product={product} size="sm" />
      </div>

      {/* Info Container */}
      <div className="flex flex-col flex-1 p-3 md:p-3.5 relative z-1 pointer-events-none">
        {/* Vendor / Category */}
        <div className="flex items-center justify-between gap-1 mb-1 min-h-[16px]">
          {product.shopName ? (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
              {product.shopName}
            </span>
          ) : (
            <span />
          )}

          {/* Rating */}
          {product.rating != null && product.rating > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {product.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-xs md:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug min-h-[2.4rem] group-hover:text-brand-cyan transition-colors">
          {product.name}
        </h3>

        {/* Price & Action Row — بيتقرر من المتجر (سعر/سلة/حجز) */}
        <div className="mt-auto pt-2.5 flex items-end justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-col">
            {hasDiscount && (
              <span className="text-[10px] md:text-xs text-slate-400 line-through font-medium leading-none mb-1">
                {formatPrice(product.oldPrice!, product.currency)}
              </span>
            )}
            {decision.showPrice ? (
              <span className="font-black text-xs md:text-sm text-slate-900 dark:text-white leading-tight">
                {product.price != null ? formatPrice(product.price, product.currency) : '—'}
              </span>
            ) : (
              <>
                <span className="font-black text-[11px] md:text-xs text-slate-900 dark:text-white leading-tight">
                  السعر عند الطلب
                </span>
                {decision.booking === '24h' && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-tight">
                    رد خلال {decision.bookingWindowHours} ساعة
                  </span>
                )}
              </>
            )}
          </div>

          {/* Action (interactive above card link) — cart أو حجز حسب قرار التاجر */}
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
