'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSiteCart } from '@/lib/site-cart';
import { jsonRequest } from '@/lib/api';
import { normalizeWebsiteTree, PublicSiteRenderer, SiteCartDrawer } from '@ray-eg/shared/builder';
import type {
  SiteProduct,
  SiteBookingService,
  SiteShopContext,
  SiteSubscriptionPlan,
  Website,
} from '@ray-eg/shared/builder';

interface SiteCartBridgeProps {
  website: Website;
  shop: SiteShopContext;
  products: SiteProduct[];
  subscriptionPlans?: SiteSubscriptionPlan[];
  /** Real bookable services from the shop's booking catalog (optional). */
  realServices?: SiteBookingService[];
}

/**
 * Renders a published builder site wired into the merchant checkout cart:
 * "أضف للسلة" buttons on the site push into the cart/drawer/checkout
 * flow as the rest of the marketplace, and the mobile footer cart button
 * opens the shared drawer.
 *
 * The published site cart is scoped to this merchant and sends checkout
 * orders through the merchant's dashboard order flow.
 *
 * The route-level loading.tsx shows the ONLY skeleton while the server
 * fetches the config; this component server-renders the real site directly
 * so visitors never see a second "fake" frame.
 */
export function SiteCartBridge({
  website,
  shop,
  products,
  subscriptionPlans = [],
  realServices,
}: SiteCartBridgeProps) {
  const router = useRouter();
  const safeWebsite = useMemo(() => normalizeWebsiteTree(website), [website]);
  const { items, totalItems, addItem, updateQuantity, removeItem } = useSiteCart();
  const [isCartOpen, setCartOpen] = useState(false);

  const cartItems = items.map((entry) => ({
    id: entry.cartItemId || entry.product.id,
    productId: entry.product.id,
    title: entry.product.title,
    price:
      typeof entry.product.price === 'string'
        ? Number(entry.product.price) || 0
        : entry.product.price,
    quantity: entry.quantity,
    image: entry.product.image,
    addons: entry.addons || (entry.product as any)?.addons,
    variantSelection: entry.variantSelection || (entry.product as any)?.variantSelection,
  }));

  // No client-side skeleton gate: the renderer is deterministic on the server
  // (cart starts empty in both environments), so SSR emits the REAL site HTML
  // and the first client render matches it exactly. A gate here would paint a
  // second skeleton on top of the route-level loading skeleton — merchants saw
  // the "fake" site frame twice before content appeared.

  return (
    <div>
      <PublicSiteRenderer
        website={safeWebsite}
        shop={shop}
        products={products}
        subscriptionPlans={subscriptionPlans}
        realServices={realServices}
        cartCount={totalItems}
        onAddToCart={(p) => {
          addItem(p, shop);
          setCartOpen(true);
        }}
        onOpenCart={() => setCartOpen(true)}
      />
      <SiteCartDrawer
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        shop={shop}
        website={safeWebsite}
        onValidateCoupon={async (code, subtotal) => {
          const response = await jsonRequest<any>('/coupons/validate', {
            method: 'POST',
            body: JSON.stringify({ shopId: shop.id, code, subtotal }),
          });
          const result = response?.data || response;
          if (!result || typeof result.discountAmount !== 'number') {
            throw new Error('الكوبون غير صالح أو منتهي');
          }
          window.sessionStorage.setItem(
            `merchant-site-coupon:site:${shop.slug}`,
            JSON.stringify({ code, discountAmount: result.discountAmount })
          );
          return result;
        }}
        onUpdateQuantity={(id, delta) => {
          updateQuantity(id, delta);
        }}
        onRemoveItem={removeItem}
        onProceedToCheckout={() => {
          setCartOpen(false);
          router.push(`/site/${shop.slug}/checkout`);
        }}
      />
    </div>
  );
}
