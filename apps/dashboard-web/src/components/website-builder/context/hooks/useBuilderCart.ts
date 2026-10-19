import { useState, useCallback, useMemo } from 'react';
import { CartItem, CartMode, Tenant } from '../../types/builder';

export interface UseBuilderCartProps {
  currentTenant: Tenant;
}

export const useBuilderCart = ({ currentTenant }: UseBuilderCartProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartMode, setCartMode] = useState<CartMode>('standalone');

  // Dynamic Catalog Search & Category Filters
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all');
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [productSortBy, setProductSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'newest'>('featured');

  const addToCart = useCallback(
    (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
      setCartItems((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        if (existing) {
          return prev.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
          );
        }
        return [
          ...prev,
          {
            ...item,
            quantity: item.quantity || 1,
            tenantId: item.tenantId || currentTenant.id,
            tenantName: item.tenantName || currentTenant.name,
          },
        ];
      });
      setIsCartOpen(true);
    },
    [currentTenant]
  );

  const removeFromCart = useCallback((itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const updateCartQuantity = useCallback((itemId: string, delta: number) => {
    setCartItems(
      (prev) =>
        prev
          .map((i) => {
            if (i.id === itemId) {
              const newQty = i.quantity + delta;
              return newQty > 0 ? { ...i, quantity: newQty } : null;
            }
            return i;
          })
          .filter(Boolean) as CartItem[]
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cartItems]);

  const cartCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  return {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    cartMode,
    setCartMode,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartTotal,
    cartCount,
    selectedProductCategory,
    setSelectedProductCategory,
    productSearchQuery,
    setProductSearchQuery,
    productSortBy,
    setProductSortBy,
  };
};
