'use client';

import React, { useEffect, useState } from 'react';
import { SiteRenderer, SiteSkeleton } from '@ray-eg/shared/builder';
import type {
  SiteProduct,
  SiteShopContext,
  SiteSubscriptionPlan,
  Website,
} from '@ray-eg/shared/builder';
import { useCart } from '@/lib/cart';
import { playCartSound } from '@/lib/sounds';

interface SiteCartBridgeProps {
  website: Website;
  shop: SiteShopContext;
  products: SiteProduct[];
  subscriptionPlans?: SiteSubscriptionPlan[];
}

/**
 * Renders a published builder site wired into the marketplace unified cart:
 * "أضف للسلة" buttons on the site push into the same cart/drawer/checkout
 * flow as the rest of the marketplace, and the mobile footer cart button
 * opens the shared drawer.
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
  const { addItem, setCartOpen, totalItems } = useCart();

  // One frame of skeleton so hydration doesn't flash an empty page.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) {
    return (
      <SiteSkeleton
        website={website}
        backgroundColor={website.theme?.colors?.background || '#ffffff'}
      />
    );
  }

  const cartMode = website.settings?.cart?.mode || 'standalone';
  const isUnifiedCart = cartMode === 'unified';

  return (
    <SiteRenderer
      website={website}
      shop={shop}
      products={products}
      subscriptionPlans={subscriptionPlans}
      cartCount={isUnifiedCart ? totalItems : undefined}
      onAddToCart={
        isUnifiedCart
          ? (p) => {
              addItem({
                id: p.id,
                shopId: shop.id,
                shopName: shop.name,
                shopSlug: shop.slug,
                name: p.title,
                price: typeof p.price === 'string' ? parseFloat(p.price) || 0 : p.price,
                imageUrl: p.image,
                isAvailable: p.isAvailable !== false,
              });
              playCartSound();
              setCartOpen(true);
            }
          : undefined
      }
      onOpenCart={isUnifiedCart ? () => setCartOpen(true) : undefined}
    />
  );
}

