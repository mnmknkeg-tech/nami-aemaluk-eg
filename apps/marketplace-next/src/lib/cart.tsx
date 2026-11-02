'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
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

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveToStorage(items);
  }, [items, hydrated]);

  const addItem = useCallback((product: Product, quantity = 1, openDrawer = true) => {
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
        maxQuantity: product.isAvailable === false ? 0 : undefined,
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
