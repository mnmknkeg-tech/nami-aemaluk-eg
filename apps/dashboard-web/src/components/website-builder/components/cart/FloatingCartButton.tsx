import React from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Store,
  Package,
  CreditCard,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';

export interface FloatingCartButtonProps {
  contained?: boolean;
}

/**
 * FloatingCartButton – rendered inside the canvas preview or preview viewport as an overlay.
 * Visible when:
 *   • cart.businessType === 'orders'
 *   • cart.showCartIcon !== false
 *   • cart.position === 'floating' | 'both'
 */
export const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({ contained = false }) => {
  const { website, cartCount, setIsCartOpen } = useBuilder();
  const cartSettings = website.settings?.cart;

  const businessType = cartSettings?.businessType || 'orders';
  const showCartIcon = cartSettings?.showCartIcon !== false;
  const position = cartSettings?.position || 'both';
  const iconType = cartSettings?.iconType || 'ShoppingBag';

  const isCartEnabled = cartSettings?.enabled !== false;

  // Only show when enabled AND business = orders AND icon enabled AND placement includes floating
  if (
    !isCartEnabled ||
    businessType !== 'orders' ||
    !showCartIcon ||
    (position !== 'floating' && position !== 'both')
  ) {
    return null;
  }

  const IconComponent =
    iconType === 'ShoppingCart'
      ? ShoppingCart
      : iconType === 'Package'
        ? Package
        : iconType === 'Store'
          ? Store
          : iconType === 'CreditCard'
            ? CreditCard
            : ShoppingBag;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsCartOpen(true);
      }}
      title="سلة التسوق"
      className={`${
        contained
          ? 'absolute bottom-6 left-6 z-30 pointer-events-auto'
          : 'fixed bottom-24 left-4 z-[9990]'
      } flex items-center justify-center w-14 h-14 rounded-full shadow-2xl cursor-pointer transition-all duration-300 active:scale-95 hover:scale-105 group`}
      style={{
        backgroundColor: website.theme?.colors?.primary || '#2563eb',
        color: '#ffffff',
      }}
    >
      {/* Pulse ring animation */}
      {cartCount > 0 && (
        <span
          className="absolute inset-0 rounded-full opacity-40 animate-ping"
          style={{ backgroundColor: website.theme?.colors?.primary || '#2563eb' }}
        />
      )}

      <IconComponent className="w-6 h-6 relative z-10" />

      {/* Item count badge */}
      {cartCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md z-10">
          {cartCount > 99 ? '99+' : cartCount}
        </span>
      )}
    </button>
  );
};
