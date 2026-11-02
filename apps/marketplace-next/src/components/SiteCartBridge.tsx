'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PublicSiteRenderer, SiteCartDrawer, SiteSkeleton } from '@ray-eg/shared/builder';
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
  const [items, setItems] = useState<SiteProduct[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const cartItems = useMemo(
    () =>
      items.map((product) => ({
        id: product.id,
        productId: product.id,
        title: product.title,
        price: typeof product.price === 'string' ? Number(product.price) || 0 : product.price,
        quantity: 1,
        image: product.image,
      })),
    [items]
  );
  const totalItems = cartItems.length;

  // One frame of skeleton so hydration doesn't flash an empty page.
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

  return (
    <div>
      <PublicSiteRenderer
        website={website}
        shop={shop}
        products={products}
        subscriptionPlans={subscriptionPlans}
        cartCount={totalItems}
        onAddToCart={(p) => {
          setItems((current) => {
            const existing = current.find((item) => item.id === p.id);
            return existing ? current : [...current, p];
          });
          setCartOpen(true);
        }}
        onOpenCart={() => setCartOpen(true)}
      />
      <SiteCartDrawer
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        shop={shop}
        website={website}
        onUpdateQuantity={(id, delta) => {
          if (delta < 0) setItems((current) => current.filter((item) => item.id !== id));
        }}
        onRemoveItem={(id) => setItems((current) => current.filter((item) => item.id !== id))}
        onClearCart={() => {
          setItems([]);
          setCartOpen(false);
        }}
      />
    </div>
  );
}
