'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { SiteProduct, SiteShopContext } from '@ray-eg/shared/builder';

export interface SiteCartEntry {
  product: SiteProduct;
  quantity: number;
  shop: SiteShopContext;
}

interface SiteCartContextValue {
  items: SiteCartEntry[];
  totalItems: number;
  totalPrice: number;
  addItem: (product: SiteProduct, shop: SiteShopContext) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const SiteCartContext = createContext<SiteCartContextValue | null>(null);

export function isValidSiteCartEntry(value: unknown, shopSlug: string): value is SiteCartEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<SiteCartEntry>;
  const product = entry.product;
  return !!(
    product &&
    typeof product === 'object' &&
    typeof product.id === 'string' &&
    typeof product.title === 'string' &&
    Number.isFinite(Number(product.price)) &&
    Number(product.price) >= 0 &&
    typeof entry.quantity === 'number' &&
    Number.isInteger(entry.quantity) &&
    entry.quantity > 0 &&
    entry.shop &&
    entry.shop.slug === shopSlug &&
    (!product.shopId || product.shopId === entry.shop.id) &&
    product.isActive !== false &&
    product.isAvailable !== false
  );
}

export function loadSiteCart(raw: string | null, shopSlug: string): SiteCartEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => isValidSiteCartEntry(entry, shopSlug));
  } catch {
    return [];
  }
}

export function SiteCartProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const merchant = pathname?.match(/^\/(site|shop)\/([^/]+)/);
  const merchantSlug = merchant?.[2] ?? null;
  const storageKey = merchant ? `merchant-site-cart:${merchant[1]}:${merchant[2]}` : null;
  const [items, setItems] = useState<SiteCartEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(false);
    if (!storageKey || !merchantSlug) {
      setItems([]);
      setHydrated(true);
      return;
    }
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      setItems(loadSiteCart(saved, merchantSlug));
    } catch {
      setItems([]);
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || !storageKey) return;
    window.sessionStorage.setItem(storageKey, JSON.stringify(items));
  }, [hydrated, items, storageKey]);

  const value = useMemo<SiteCartContextValue>(() => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => {
      const price =
        typeof item.product.price === 'string'
          ? Number(item.product.price) || 0
          : item.product.price;
      return sum + price * item.quantity;
    }, 0);

    return {
      items,
      totalItems,
      totalPrice,
      addItem: (product, shop) => {
        if (
          product.isActive === false ||
          product.isAvailable === false ||
          (product.shopId && product.shopId !== shop.id)
        ) {
          return;
        }
        setItems((current) => {
          const existing = current.find((item) => item.product.id === product.id);
          if (existing) {
            return current.map((item) =>
              item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            );
          }
          return [...current, { product, quantity: 1, shop }];
        });
      },
      updateQuantity: (productId, delta) =>
        setItems((current) =>
          current
            .map((item) =>
              item.product.id === productId ? { ...item, quantity: item.quantity + delta } : item
            )
            .filter((item) => item.quantity > 0)
        ),
      removeItem: (productId) =>
        setItems((current) => current.filter((item) => item.product.id !== productId)),
      clearCart: () => setItems([]),
    };
  }, [items]);

  return <SiteCartContext.Provider value={value}>{children}</SiteCartContext.Provider>;
}

export function useSiteCart() {
  const context = useContext(SiteCartContext);
  if (!context) throw new Error('useSiteCart must be used inside SiteCartProvider');
  return context;
}
