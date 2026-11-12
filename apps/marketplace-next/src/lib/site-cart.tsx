'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { productStockState } from './stock';
import type { SiteProduct, SiteShopContext } from '@ray-eg/shared/builder';

export interface SiteCartEntry {
  product: SiteProduct;
  quantity: number;
  shop: SiteShopContext;
  cartItemId?: string;
  variantSelection?: any;
  addons?: any[];
}

interface SiteCartContextValue {
  items: SiteCartEntry[];
  totalItems: number;
  totalPrice: number;
  addItem: (
    product: SiteProduct,
    shop: SiteShopContext,
    options?: {
      variantSelection?: any;
      addons?: any[];
      quantity?: number;
      calculatedPrice?: number;
    }
  ) => void;
  updateQuantity: (cartItemIdOrProductId: string, delta: number) => void;
  removeItem: (cartItemIdOrProductId: string) => void;
  clearCart: () => void;
}

const SiteCartContext = createContext<SiteCartContextValue | null>(null);

function getEntryKey(entry: Partial<SiteCartEntry>): string {
  if (entry.cartItemId) return entry.cartItemId;
  const pId = entry.product?.id || '';
  const v = entry.variantSelection ? JSON.stringify(entry.variantSelection) : '';
  const a =
    Array.isArray(entry.addons) && entry.addons.length > 0 ? JSON.stringify(entry.addons) : '';
  if (!v && !a) return pId;
  return `${pId}::${v}::${a}`;
}

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
      addItem: (product, shop, options) => {
        if (
          product.isActive === false ||
          product.isAvailable === false ||
          // صنف بيتبع مخزون وخلص → ممنوع. أصناف المنيو/الخدمات (trackStock=false) مفتوحة دايمًا.
          productStockState(product).soldOut ||
          (product.shopId && product.shopId !== shop.id)
        ) {
          return;
        }
        const qtyToAdd = Math.max(1, options?.quantity || 1);
        const resolvedPrice =
          options?.calculatedPrice !== undefined && Number.isFinite(options.calculatedPrice)
            ? options.calculatedPrice
            : typeof product.price === 'string'
              ? Number(product.price) || 0
              : product.price;

        const effectiveProduct: SiteProduct & { addons?: any; variantSelection?: any } = {
          ...product,
          title: (product as any).title || (product as any).name || 'منتج',
          price: resolvedPrice,
          addons: options?.addons || (product as any)?.addons,
          variantSelection: options?.variantSelection || (product as any)?.variantSelection,
        };

        const targetEntryKey = getEntryKey({
          product: effectiveProduct,
          variantSelection: options?.variantSelection,
          addons: options?.addons,
        });

        setItems((current) => {
          const existingIndex = current.findIndex((item) => getEntryKey(item) === targetEntryKey);
          if (existingIndex >= 0) {
            return current.map((item, idx) =>
              idx === existingIndex ? { ...item, quantity: item.quantity + qtyToAdd } : item
            );
          }
          return [
            ...current,
            {
              product: effectiveProduct,
              quantity: qtyToAdd,
              shop,
              cartItemId: targetEntryKey,
              variantSelection: options?.variantSelection,
              addons: options?.addons,
            },
          ];
        });
      },
      updateQuantity: (cartItemIdOrProductId, delta) =>
        setItems((current) =>
          current
            .map((item) =>
              item.cartItemId === cartItemIdOrProductId ||
              item.product.id === cartItemIdOrProductId ||
              getEntryKey(item) === cartItemIdOrProductId
                ? { ...item, quantity: item.quantity + delta }
                : item
            )
            .filter((item) => item.quantity > 0)
        ),
      removeItem: (cartItemIdOrProductId) =>
        setItems((current) =>
          current.filter(
            (item) =>
              item.cartItemId !== cartItemIdOrProductId &&
              item.product.id !== cartItemIdOrProductId &&
              getEntryKey(item) !== cartItemIdOrProductId
          )
        ),
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
