'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { Product } from './services';
import { playCartSound } from './sounds';

export interface CartItem {
  id: string;
  productId: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  quantity: number;
  maxQuantity?: number;
}

interface CartContextValue {
  items: CartItem[];
  /**
   * @param openDrawer When true the cart drawer pops open on add. Defaults to
   * true (builder sites rely on it); the marketplace quick-add passes `false`
   * so tapping "+" just adds the product instead of hijacking the screen.
   */
  addItem: (product: Product, quantity?: number, openDrawer?: boolean) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  clearShopItems: (shopId: string) => void;
  totalItems: number;
  totalPrice: number;
  totalPriceByShop: (shopId: string) => number;
  itemsByShop: () => Record<string, CartItem[]>;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'mnmknk_cart';

function finiteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.productId === 'string' &&
    typeof item.shopId === 'string' &&
    typeof item.shopName === 'string' &&
    typeof item.shopSlug === 'string' &&
    typeof item.name === 'string' &&
    finiteNonNegativeNumber(item.price) &&
    typeof item.image === 'string' &&
    typeof item.quantity === 'number' &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    (item.maxQuantity == null || (Number.isInteger(item.maxQuantity) && item.maxQuantity > 0))
  );
}

export function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isValidCartItem).map((item) => ({ ...item }));
}

function storageKeyForPath(pathname: string | null): string {
  const merchant = pathname?.match(/^\/(site|shop)\/([^/]+)/);
  return merchant ? `${STORAGE_KEY}:${merchant[1]}:${merchant[2]}` : STORAGE_KEY;
}

function loadFromStorage(storageKey: string): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    return sanitizeCartItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveToStorage(storageKey: string, items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {}
}

export function CartProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const storageKey = storageKeyForPath(pathname);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(false);
    setItems(loadFromStorage(storageKey));
    setHydrated(true);
    setCartOpen(false);
  }, [storageKey]);

  useEffect(() => {
    if (hydrated) saveToStorage(storageKey, items);
  }, [items, hydrated, storageKey]);

  const addItem = useCallback((product: Product, quantity = 1, openDrawer = true) => {
    if (product.isAvailable === false || !Number.isInteger(quantity) || quantity < 1) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        shopId: product.shopId,
        shopName: product.shopName || '',
        shopSlug: product.shopSlug || '',
        name: product.name,
        price: product.price || 0,
        oldPrice: product.oldPrice,
        image: product.imageUrl || product.images?.[0] || '/placeholder-product.png',
        quantity,
        maxQuantity: undefined,
      };
      return [...prev, newItem];
    });
    if (openDrawer) setCartOpen(true);
    playCartSound();
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        // Never exceed the stock cap captured when the item was added.
        const capped = i.maxQuantity != null ? Math.min(quantity, i.maxQuantity) : quantity;
        return { ...i, quantity: Math.max(1, capped) };
      })
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const clearShopItems = useCallback((shopId: string) => {
    setItems((prev) => prev.filter((i) => i.shopId !== shopId));
  }, []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const totalPriceByShop = useCallback(
    (shopId: string) =>
      items.filter((i) => i.shopId === shopId).reduce((s, i) => s + i.price * i.quantity, 0),
    [items]
  );

  const itemsByShop = useCallback(() => {
    const map: Record<string, CartItem[]> = {};
    for (const item of items) {
      if (!map[item.shopId]) map[item.shopId] = [];
      map[item.shopId].push(item);
    }
    return map;
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        clearShopItems,
        totalItems,
        totalPrice,
        totalPriceByShop,
        itemsByShop,
        isCartOpen,
        setCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
