'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSiteCart } from '@/lib/site-cart';
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

  const cartItems = items.map(({ product, quantity }) => ({
    id: product.id,
    productId: product.id,
    title: product.title,
    price: typeof product.price === 'string' ? Number(product.price) || 0 : product.price,
    quantity,
    image: product.image,
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
