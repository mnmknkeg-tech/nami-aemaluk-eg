'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSiteCart } from '@/lib/site-cart';
import { jsonRequest } from '@/lib/api';
import {
  normalizeWebsiteTree,
  PublicSiteRenderer,
  SiteCartDrawer,
  SiteSkeleton,
  useResponsiveViewport,
} from '@ray-eg/shared/builder';
import type {
  SiteProduct,
  SiteShopContext,
  SiteSubscriptionPlan,
  Website,
} from '@ray-eg/shared/builder';

interface SiteCartBridgeProps {
  website: Website;
  shop: SiteShopContext;
  products: SiteProduct[];
  subscriptionPlans?: SiteSubscriptionPlan[];
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
 * The skeleton is drawn from the SAME component tree that renders the real
 * site, so the loading frame matches this merchant's layout exactly —
 * no layout shift, no generic spinner.
 */
export function SiteCartBridge({
  website,
  shop,
  products,
  subscriptionPlans = [],
}: SiteCartBridgeProps) {
  const router = useRouter();
  const safeWebsite = useMemo(() => normalizeWebsiteTree(website), [website]);
  const viewport = useResponsiveViewport();
  const { items, totalItems, addItem, updateQuantity, removeItem } = useSiteCart();
  const [isCartOpen, setCartOpen] = useState(false);
  const [ready, setReady] = useState(false);

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

  // One frame of skeleton so hydration doesn't flash an empty page.
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) {
    return (
      <SiteSkeleton
        website={safeWebsite}
        viewport={viewport}
        backgroundColor={safeWebsite.theme?.colors?.background || '#ffffff'}
      />
    );
  }

  return (
    <div>
      <PublicSiteRenderer
        website={safeWebsite}
        shop={shop}
        products={products}
        subscriptionPlans={subscriptionPlans}
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
