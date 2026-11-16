'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Product } from './services';

interface WishlistContextValue {
  items: Product[];
  toggle: (product: Product) => void;
  has: (productId: string) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = 'mnmknk_wishlist';

function loadFromStorage(): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // localStorage is user-editable and may contain stale/corrupt entries.
    // Keep only product-shaped records with a stable string ID, deduplicated.
    const seen = new Set<string>();
    return parsed.filter((item): item is Product => {
      if (!item || typeof item !== 'object' || typeof (item as Product).id !== 'string') {
        return false;
      }
      const id = (item as Product).id.trim();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Storage may be disabled or full; wishlist actions must remain usable
        // for the current session even when persistence is unavailable.
      }
    }
  }, [items, hydrated]);

  const toggle = useCallback((product: Product) => {
    if (!product || typeof product.id !== 'string' || !product.id.trim()) return;
    setItems((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      return [...prev, product];
    });
  }, []);

  const has = useCallback((productId: string) => items.some((p) => p.id === productId), [items]);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return (
    <WishlistContext.Provider value={{ items, toggle, has, remove, clear, count: items.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
